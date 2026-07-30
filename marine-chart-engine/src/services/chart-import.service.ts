import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
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
  M_COVR: 'coverage',
  M_QUAL: 'data_quality',
};

interface EncIndexFeature {
  objectClass: string;
  layer: string;
  geometry: Record<string, unknown>;
  properties: Record<string, unknown>;
}

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
    const updateFiles = await discoverOrderedS57Updates(request.sourceFile);
    const workDir = path.join(config.uploadDir, `${request.id}-s57-work`);
    const geojsonDir = path.join(workDir, 'geojson');
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(geojsonDir, { recursive: true });

    await this.runner.assertToolAvailable('ogr2ogr');
    await this.runner.assertToolAvailable('tippecanoe');

    const geojsonFiles: string[] = [];
    const indexFeatures: EncIndexFeature[] = [];
    for (const [s57Layer, targetLayer] of Object.entries(S57_LAYER_MAP)) {
      const output = path.join(geojsonDir, `${targetLayer}-${s57Layer}.geojson`);
      await this.runner.run({
        command: 'ogr2ogr',
        args: ['-f', 'GeoJSON', output, request.sourceFile, s57Layer],
      });
      if (fsSync.existsSync(output)) {
        indexFeatures.push(...await this.normalizeS57GeoJson(output, targetLayer, s57Layer));
        geojsonFiles.push(output);
      }
    }

    if (geojsonFiles.length === 0) {
      throw new Error('No supported open S-57 layers were converted');
    }

    const targetFile = this.targetMbtilesPath(request.id);
    await this.runner.run({
      command: 'tippecanoe',
      args: [
        '-o', targetFile, '--force', '--no-tile-compression',
        '--minimum-zoom=4', '--maximum-zoom=16',
        ...geojsonFiles.flatMap((file) => {
          const basename = path.basename(file, '.geojson');
          const separator = basename.lastIndexOf('-');
          return ['-L', `${separator > 0 ? basename.slice(0, separator) : basename}:${file}`];
        }),
      ],
    });
    this.writeEncIndex(`${targetFile}.enc-index.sqlite`, indexFeatures);
    await fs.writeFile(`${targetFile}.enc-manifest.json`, `${JSON.stringify({
      version: 1,
      chartId: request.id,
      sourceCell: path.basename(request.sourceFile),
      updates: updateFiles.map((file) => path.basename(file)),
      importedAt: new Date().toISOString(),
      objectCounts: Object.fromEntries(Object.values(S57_LAYER_MAP).map((layer) => [
        layer,
        indexFeatures.filter((feature) => feature.layer === layer).length,
      ])),
      advisoryOnly: true,
    }, null, 2)}\n`, 'utf8');

    const metadata = this.mbtiles.readMetadata(targetFile) ?? { format: 'pbf' };
    return this.register({ ...request, kind: 'vector' }, targetFile, metadata);
  }

  private async normalizeS57GeoJson(
    file: string,
    layer: string,
    objectClass: string,
  ): Promise<EncIndexFeature[]> {
    const collection = JSON.parse(await fs.readFile(file, 'utf8')) as {
      type: 'FeatureCollection';
      features?: Array<{ type?: string; geometry?: Record<string, unknown> | null; properties?: Record<string, unknown> }>;
    };
    const features = (collection.features ?? []).flatMap((feature): EncIndexFeature[] => {
      if (!feature.geometry) return [];
      const properties = Object.fromEntries(
        Object.entries(feature.properties ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
      );
      properties['objectClass'] = objectClass;
      properties['chartLayer'] = layer;
      const geometries = layer === 'soundings'
        ? expandSoundingGeometry(feature.geometry, properties)
        : [{ geometry: feature.geometry, properties }];
      return geometries.map(({ geometry, properties: geometryProperties }) => ({
        objectClass,
        layer,
        geometry,
        properties: normalizeEncProperties(geometryProperties, geometry),
      }));
    });
    await fs.writeFile(file, JSON.stringify({
      type: 'FeatureCollection',
      features: features.map((feature) => ({
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties,
      })),
    }), 'utf8');
    return features;
  }

  private writeEncIndex(file: string, features: EncIndexFeature[]): void {
    const database = new Database(file);
    try {
      database.exec(`
        PRAGMA journal_mode = DELETE;
        DROP TABLE IF EXISTS enc_features;
        DROP TABLE IF EXISTS enc_features_rtree;
        CREATE TABLE enc_features (
          id INTEGER PRIMARY KEY,
          object_class TEXT NOT NULL,
          layer TEXT NOT NULL,
          geometry_json TEXT NOT NULL,
          properties_json TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE enc_features_rtree USING rtree(id, min_lon, max_lon, min_lat, max_lat);
      `);
      const insertFeature = database.prepare(
        'INSERT INTO enc_features(object_class, layer, geometry_json, properties_json) VALUES (?, ?, ?, ?)',
      );
      const insertBounds = database.prepare(
        'INSERT INTO enc_features_rtree(id, min_lon, max_lon, min_lat, max_lat) VALUES (?, ?, ?, ?, ?)',
      );
      database.transaction(() => {
        for (const feature of features) {
          const bounds = geometryBounds(feature.geometry);
          if (!bounds) continue;
          const result = insertFeature.run(
            feature.objectClass,
            feature.layer,
            JSON.stringify(feature.geometry),
            JSON.stringify(feature.properties),
          );
          insertBounds.run(result.lastInsertRowid, ...bounds);
        }
      })();
    } finally {
      database.close();
    }
  }

  async delete(chartId: string): Promise<boolean> {
    const deleted = await this.registry.delete(chartId);
    if (!deleted) {
      return false;
    }
    const target = this.targetMbtilesPath(chartId);
    this.mbtiles.close(target);
    await fs.rm(target, { force: true });
    await fs.rm(`${target}.enc-index.sqlite`, { force: true });
    await fs.rm(`${target}.enc-manifest.json`, { force: true });
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

const normalizeEncProperties = (
  input: Record<string, unknown>,
  geometry: Record<string, unknown>,
): Record<string, unknown> => {
  const properties = { ...input };
  for (const key of ['drval1', 'drval2', 'valdco', 'valsou', 'quasou', 'watlev', 'catwrk', 'catobs', 'tecsou', 'status']) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      properties[key] = Number(value);
    }
  }
  if (properties['depth'] === undefined) {
    const sounding = properties['valsou'] ?? firstZCoordinate(geometry['coordinates']);
    if (typeof sounding === 'number' && Number.isFinite(sounding)) properties['depth'] = sounding;
  }
  return properties;
};

const expandSoundingGeometry = (
  geometry: Record<string, unknown>,
  properties: Record<string, unknown>,
): Array<{ geometry: Record<string, unknown>; properties: Record<string, unknown> }> => {
  if (geometry['type'] !== 'MultiPoint' || !Array.isArray(geometry['coordinates'])) {
    return [{ geometry, properties }];
  }
  return geometry['coordinates'].flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return [];
    return [{
      geometry: { type: 'Point', coordinates: coordinate },
      properties: {
        ...properties,
        ...(Number.isFinite(Number(coordinate[2] ?? properties['valsou']))
          ? { depth: Number(coordinate[2] ?? properties['valsou']) }
          : {}),
      },
    }];
  });
};

const firstZCoordinate = (coordinates: unknown): number | null => {
  if (!Array.isArray(coordinates)) return null;
  if (coordinates.length >= 3 && coordinates.slice(0, 3).every((value) => typeof value === 'number')) {
    return Number(coordinates[2]);
  }
  for (const value of coordinates) {
    const found = firstZCoordinate(value);
    if (found !== null) return found;
  }
  return null;
};

const geometryBounds = (geometry: Record<string, unknown>): [number, number, number, number] | null => {
  const positions: Array<[number, number]> = [];
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      positions.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  };
  visit(geometry['coordinates']);
  if (positions.length === 0) return null;
  return [
    Math.min(...positions.map(([longitude]) => longitude)),
    Math.max(...positions.map(([longitude]) => longitude)),
    Math.min(...positions.map(([, latitude]) => latitude)),
    Math.max(...positions.map(([, latitude]) => latitude)),
  ];
};

const discoverOrderedS57Updates = async (baseCell: string): Promise<string[]> => {
  if (path.extname(baseCell).toLowerCase() !== '.000') return [];
  const directory = path.dirname(baseCell);
  const stem = path.basename(baseCell, path.extname(baseCell));
  const candidates = (await fs.readdir(directory))
    .map((name) => {
      const match = name.match(new RegExp(`^${escapeRegExp(stem)}\\.(\\d{3})$`, 'i'));
      return match ? { file: path.join(directory, name), number: Number(match[1]) } : null;
    })
    .filter((entry): entry is { file: string; number: number } => entry !== null && entry.number > 0)
    .sort((left, right) => left.number - right.number);
  candidates.forEach((entry, index) => {
    if (entry.number !== index + 1) {
      throw new Error(`S-57 update sequence is incomplete: expected .${String(index + 1).padStart(3, '0')}`);
    }
  });
  return candidates.map((entry) => entry.file);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
