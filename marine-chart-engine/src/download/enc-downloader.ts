import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { ChartImportService } from '../services/chart-import.service.js';
import type { ChartRegistryService } from '../services/chart-registry.service.js';
import type { MbtilesService } from '../services/mbtiles.service.js';
import { ProcessRunnerService } from '../services/process-runner.service.js';

export interface EncDownloadRequest {
  chartNumber: string;
  id: string;
  label: string;
  description?: string;
}

/**
 * Downloads NOAA ENC S-57 charts, extracts them, and converts to MBTiles vector.
 */
export class EncDownloader {
  private readonly importService: ChartImportService;
  private readonly runner = new ProcessRunnerService();

  constructor(
    registry: ChartRegistryService,
    mbtiles: MbtilesService,
  ) {
    this.importService = new ChartImportService(registry, mbtiles);
  }

  /**
   * Download a NOAA ENC chart and convert it to MBTiles vector.
   */
  async downloadAndConvert(request: EncDownloadRequest): Promise<void> {
    const workDir = path.join(config.uploadDir, `${request.id}-enc-work`);
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(workDir, { recursive: true });

    try {
      // 1. Download ZIP from NOAA
      const zipUrl = `https://www.charts.noaa.gov/ENC/${request.chartNumber}.zip`;
      const zipPath = path.join(workDir, `${request.chartNumber}.zip`);
      await this.downloadFile(zipUrl, zipPath);

      // 2. Extract ZIP using system unzip
      const extractDir = path.join(workDir, 'extracted');
      await fs.mkdir(extractDir, { recursive: true });
      await this.extractZip(zipPath, extractDir);

      // 3. Find the .000 S-57 file
      const s57File = await this.findS57File(extractDir);
      if (!s57File) {
        throw new Error(`No S-57 (.000) file found in downloaded ENC package: ${request.chartNumber}`);
      }

      // 4. Convert to MBTiles using existing import service
      await this.importService.importS57({
        id: request.id,
        label: request.label,
        kind: 'vector',
        sourceFile: s57File,
        description: request.description ?? `NOAA ENC ${request.chartNumber}`,
        attribution: 'NOAA Office of Coast Survey',
      });
    } finally {
      // Cleanup work directory
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  private async downloadFile(url: string, targetPath: string): Promise<void> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OpenMarine-ChartEngine/0.1.0' },
    });

    if (!response.ok) {
      throw new Error(`Failed to download ENC from ${url}: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(targetPath, buffer);
  }

  private async extractZip(zipPath: string, extractDir: string): Promise<void> {
    await this.runner.run({
      command: 'unzip',
      args: ['-o', zipPath, '-d', extractDir],
    });
  }

  private async findS57File(dir: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.000')) {
        return path.join(dir, entry.parentPath ?? '', entry.name);
      }
    }
    return null;
  }
}
