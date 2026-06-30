import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { config } from '../config.js';
import { ChartImportService } from '../services/chart-import.service.js';
import type { ChartRegistryService } from '../services/chart-registry.service.js';
import type { MbtilesService } from '../services/mbtiles.service.js';
import { SafeArchiveExtractor } from './safe-archive-extractor.js';

export interface EncDownloadRequest {
  providerId: string;
  chartId: string;
  downloadUrl: string;
  id: string;
  label: string;
  expectedSha256?: string;
  description?: string;
}

/**
 * Downloads ENC S-57 chart packages from a provider download URL, extracts them
 * safely, and converts the S-57 cell to MBTiles vector tiles.
 */
export class EncDownloader {
  private readonly importService: ChartImportService;
  private readonly extractor = new SafeArchiveExtractor();

  constructor(
    registry: ChartRegistryService,
    mbtiles: MbtilesService,
  ) {
    this.importService = new ChartImportService(registry, mbtiles);
  }

  /**
   * Download an ENC chart from its download URL and convert it to MBTiles vector.
   */
  async downloadAndConvert(request: EncDownloadRequest): Promise<void> {
    const workDir = path.join(config.uploadDir, `${request.id}-enc-work`);
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(workDir, { recursive: true });

    try {
      // 1. Download ZIP from the provider download URL
      const zipPath = path.join(workDir, `${request.chartId}.zip`);
      await this.downloadFile(request.downloadUrl, zipPath, request.expectedSha256);

      // 2. Extract ZIP with zip-slip / size protection
      const extractDir = path.join(workDir, 'extracted');
      await fs.mkdir(extractDir, { recursive: true });
      await this.extractor.extractZip(zipPath, extractDir);

      // 3. Find the .000 S-57 file
      const s57File = await this.findS57File(extractDir);
      if (!s57File) {
        throw new Error(`No S-57 (.000) file found in downloaded ENC package: ${request.chartId}`);
      }

      // 4. Convert to MBTiles using existing import service
      await this.importService.importS57({
        id: request.id,
        label: request.label,
        kind: 'vector',
        sourceFile: s57File,
        description: request.description ?? `ENC ${request.chartId}`,
        attribution: providerAttribution(request.providerId),
      });
    } finally {
      // Cleanup work directory
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  private async downloadFile(url: string, targetPath: string, expectedSha256?: string): Promise<void> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OpenMarine-ChartEngine/0.1.0' },
    });

    if (!response.ok) {
      throw new Error(`Failed to download ENC from ${url}: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (expectedSha256) {
      const actual = crypto.createHash('sha256').update(buffer).digest('hex');
      if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
        throw new Error(`ENC download checksum mismatch for ${url}: expected ${expectedSha256}, got ${actual}`);
      }
    }

    await fs.writeFile(targetPath, buffer);
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

function providerAttribution(providerId: string): string {
  switch (providerId) {
    case 'noaa-enc':
      return 'NOAA Office of Coast Survey';
    case 'ihm-enc-wms':
      return 'Instituto Hidrográfico de la Marina (España)';
    default:
      return providerId;
  }
}
