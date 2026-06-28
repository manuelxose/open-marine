import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import type { ChartImportRequest, LocalChartRegistryEntry, LocalChartSource } from '../types/chart-source.types.js';
import type { ChartRegistryService } from './chart-registry.service.js';
import type { MbtilesService } from './mbtiles.service.js';
import { ProcessRunnerService, type ExternalCommand } from './process-runner.service.js';

const S57_LAYER_MAP: Record<string, string> = {
  DEPARE: 'depth_areas',
  DEPCNT: 'depth_contours',
  SOUNDG: 'soundings',
  BOYLAT: 'buoys',
  BOYCAR: 'buoys',
  BOYSAW: 'buoys',
  BOYSPP: 'buoys',
  WRECKS: 'hazards',
  OBSTRN: 'hazards',
  UWTROC: 'hazards',
  ACHARE: 'anchorages',
  TSSLPT: 'traffic_separation',
  TSSBND: 'traffic_separation',
  TSSCRS: 'traffic_separation',
  TSSRON: 'traffic_separation',
  LIGHTS: 'lights',
  LNDARE: 'land',
  COALNE: 'shoreline',
};

export class ChartImportService {
  private readonly runner = new ProcessRunnerService();

  constructor(
    private readonly registry: ChartRegistryService,
    private readonly mbtiles: MbtilesService,
  ) {}

  async importMbtiles(request: ChartImportRequest): Promise<LocalChartSource> {
    this.validateRequest(request);
    const metadata = this.mbtiles.readMetadata(request.sourceFile);
    if (!metadata) {
      throw new Error(`Invalid MBTiles file or missing metadata table: ${request.sourceFile}`);
    }
    this.mbtiles.close(request.sourceFile);
    const targetFile = await this.copyMbtiles(request);
    return this.register(request, targetFile, metadata);
  }

  async importRaster(request: ChartImportRequest): Promise<LocalChartSource> {
    this.validateRequest({ ...request, kind: 'raster' });
    const targetFile = this.targetMbtilesPath(request.id);
    await this.runner.assertToolAvailable('gdal_translate');
    await this.runner.assertToolAvailable('gdaladdo');
    await this.runCommands([
      {
        command: 'gdal_translate',
        args: ['-of', 'MBTILES', '-co', 'TILE_FORMAT=PNG', request.sourceFile, targetFile],
      },
      {
        command: 'gdaladdo',
        args: ['-r', 'average', targetFile, '2', '4', '8', '16'],
      },
    ]);
    const metadata = this.mbtiles.readMetadata(targetFile) ?? {};
    return this.register({ ...request, kind: 'raster' }, targetFile, metadata);
  }

  async importS57(request: ChartImportRequest): Promise<LocalChartSource> {
    this.validateRequest({ ...request, kind: 'vector' });
    const workDir = path.join(config.uploadDir, `${request.id}-s57-work`);
    const geojsonDir = path.join(workDir, 'geojson');
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(geojsonDir, { recursive: true });

    await this.runner.assertToolAvailable('ogr2ogr');
    await this.runner.assertToolAvailable('tippecanoe');

    const geojsonFiles: string[] = [];
    for (const [s57Layer, targetLayer] of Object.entries(S57_LAYER_MAP)) {
      const output = path.join(geojsonDir, `${targetLayer}-${s57Layer}.geojson`);
      await this.runner.run({
        command: 'ogr2ogr',
        args: ['-f', 'GeoJSON', output, request.sourceFile, s57Layer],
      });
      if (fsSync.existsSync(output)) {
        geojsonFiles.push(output);
      }
    }

    if (geojsonFiles.length === 0) {
      throw new Error('No supported open S-57 layers were converted');
    }

    const targetFile = this.targetMbtilesPath(request.id);
    await this.runner.run({
      command: 'tippecanoe',
      args: ['-o', targetFile, '--force', '--no-tile-compression', '--minimum-zoom=4', '--maximum-zoom=16', ...geojsonFiles],
    });

    const metadata = this.mbtiles.readMetadata(targetFile) ?? { format: 'pbf' };
    return this.register({ ...request, kind: 'vector' }, targetFile, metadata);
  }

  async delete(chartId: string): Promise<boolean> {
    const deleted = await this.registry.delete(chartId);
    if (!deleted) {
      return false;
    }
    const target = this.targetMbtilesPath(chartId);
    this.mbtiles.close(target);
    await fs.rm(target, { force: true });
    return true;
  }

  private async copyMbtiles(request: ChartImportRequest): Promise<string> {
    const targetFile = this.targetMbtilesPath(request.id);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    if (fsSync.existsSync(targetFile) && !request.force) {
      throw new Error(`Chart already exists: ${request.id}`);
    }
    this.mbtiles.close(targetFile);
    await fs.copyFile(request.sourceFile, targetFile);
    return targetFile;
  }

  private async register(
    request: ChartImportRequest,
    targetFile: string,
    metadata: Record<string, string>,
  ): Promise<LocalChartSource> {
    const entry: LocalChartRegistryEntry = {
      id: request.id,
      label: request.label,
      kind: request.kind,
      storage: 'mbtiles',
      description: request.description ?? metadata['description'] ?? `Local ${request.kind} chart.`,
      attribution: request.attribution ?? metadata['attribution'] ?? 'Local chart data',
      ...(request.minZoom !== undefined ? { minZoom: request.minZoom } : this.metadataZoom(metadata, 'minzoom')),
      ...(request.maxZoom !== undefined ? { maxZoom: request.maxZoom } : this.metadataZoom(metadata, 'maxzoom')),
      tileUrl: `http://localhost:8088/charts/${request.id}/${request.kind === 'raster' ? 'raster' : 'vector'}/{z}/{x}/{y}.${request.kind === 'raster' ? 'png' : 'pbf'}`,
      mbtilesFile: path.relative(process.cwd(), targetFile),
    };
    return this.registry.upsert(entry);
  }

  private metadataZoom(metadata: Record<string, string>, key: string): { minZoom?: number; maxZoom?: number } {
    const parsed = Number.parseInt(metadata[key] ?? '', 10);
    if (!Number.isInteger(parsed)) {
      return {};
    }
    return key === 'minzoom' ? { minZoom: parsed } : { maxZoom: parsed };
  }

  private validateRequest(request: ChartImportRequest): void {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(request.id)) {
      throw new Error('Chart id must be lowercase kebab-case and 2-63 characters long');
    }
    if (!fsSync.existsSync(request.sourceFile)) {
      throw new Error(`Source file not found: ${request.sourceFile}`);
    }
  }

  private targetMbtilesPath(chartId: string): string {
    return path.join(config.dataDir, 'charts', `${chartId}.mbtiles`);
  }

  private async runCommands(commands: ExternalCommand[]): Promise<void> {
    for (const command of commands) {
      await this.runner.run(command);
    }
  }
}
