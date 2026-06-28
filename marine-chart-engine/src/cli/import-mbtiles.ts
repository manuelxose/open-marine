import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { MbtilesService } from '../services/mbtiles.service.js';
import type { ChartKind, LocalChartRegistryEntry, LocalChartRegistryFile } from '../types/chart-source.types.js';

type ImportArgs = {
  id: string;
  label: string;
  kind: Extract<ChartKind, 'raster' | 'vector'>;
  file: string;
  description?: string;
  attribution?: string;
  minZoom?: number;
  maxZoom?: number;
  force: boolean;
};

const usage = [
  'Usage:',
  '  npm run import:mbtiles -- --id <id> --label <label> --kind raster|vector --file <path> [options]',
  '',
  'Options:',
  '  --description <text>',
  '  --attribution <text>',
  '  --min-zoom <number>',
  '  --max-zoom <number>',
  '  --force',
].join('\n');

const args = parseArgs(process.argv.slice(2));
await importMbtiles(args);

async function importMbtiles(args: ImportArgs): Promise<void> {
  const sourceFile = path.resolve(args.file);
  if (!fsSync.existsSync(sourceFile)) {
    throw new Error(`MBTiles file not found: ${sourceFile}`);
  }

  const mbtiles = new MbtilesService();
  const metadata = mbtiles.readMetadata(sourceFile);
  if (!metadata) {
    throw new Error(`Invalid MBTiles file or missing metadata table: ${sourceFile}`);
  }

  const chartsDir = path.join(config.dataDir, 'charts');
  await fs.mkdir(chartsDir, { recursive: true });

  const targetFile = path.join(chartsDir, `${args.id}.mbtiles`);
  if (fsSync.existsSync(targetFile) && !args.force) {
    throw new Error(`Target already exists: ${targetFile}. Use --force to replace it.`);
  }

  await fs.copyFile(sourceFile, targetFile);

  const registry = await readRegistry(config.localRegistryFile);
  const entry = buildRegistryEntry(args, metadata);
  const existingIndex = registry.charts.findIndex((chart) => chart.id === args.id);
  if (existingIndex >= 0 && !args.force) {
    throw new Error(`Chart id already exists in registry: ${args.id}. Use --force to replace it.`);
  }
  if (existingIndex >= 0) {
    registry.charts[existingIndex] = entry;
  } else {
    registry.charts.push(entry);
  }

  await fs.mkdir(path.dirname(config.localRegistryFile), { recursive: true });
  await fs.writeFile(config.localRegistryFile, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

  console.log(`Imported ${args.id}`);
  console.log(`MBTiles: ${path.relative(process.cwd(), targetFile)}`);
  console.log(`Registry: ${path.relative(process.cwd(), config.localRegistryFile)}`);
}

function buildRegistryEntry(args: ImportArgs, metadata: Record<string, string>): LocalChartRegistryEntry {
  const minZoom = args.minZoom ?? readMetadataNumber(metadata, 'minzoom');
  const maxZoom = args.maxZoom ?? readMetadataNumber(metadata, 'maxzoom');
  const routeKind = args.kind === 'raster' ? 'raster' : 'vector';
  const extension = args.kind === 'raster' ? 'png' : 'pbf';

  return {
    id: args.id,
    label: args.label,
    kind: args.kind,
    storage: 'mbtiles',
    description: args.description ?? metadata['description'] ?? `Local ${args.kind} MBTiles chart.`,
    attribution: args.attribution ?? metadata['attribution'] ?? 'Local chart data',
    ...(minZoom !== undefined ? { minZoom } : {}),
    ...(maxZoom !== undefined ? { maxZoom } : {}),
    tileUrl: `http://localhost:8088/charts/${args.id}/${routeKind}/{z}/{x}/{y}.${extension}`,
    mbtilesFile: `data/charts/${args.id}.mbtiles`,
  };
}

async function readRegistry(filePath: string): Promise<LocalChartRegistryFile> {
  if (!fsSync.existsSync(filePath)) {
    return { version: 1, charts: [] };
  }

  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as LocalChartRegistryFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.charts)) {
    throw new Error(`Invalid local registry: ${filePath}`);
  }
  return parsed;
}

function parseArgs(argv: string[]): ImportArgs {
  const values = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith('--')) {
      throw new Error(usage);
    }
    if (key === '--force') {
      values.set(key, true);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}\n\n${usage}`);
    }
    values.set(key, value);
    index += 1;
  }

  const id = readRequired(values, '--id');
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(id)) {
    throw new Error('Chart id must be lowercase kebab-case and 2-63 characters long.');
  }

  const kind = readRequired(values, '--kind');
  if (kind !== 'raster' && kind !== 'vector') {
    throw new Error('--kind must be raster or vector');
  }

  return {
    id,
    label: readRequired(values, '--label'),
    kind,
    file: readRequired(values, '--file'),
    description: readOptional(values, '--description'),
    attribution: readOptional(values, '--attribution'),
    minZoom: readOptionalNumber(values, '--min-zoom'),
    maxZoom: readOptionalNumber(values, '--max-zoom'),
    force: values.get('--force') === true,
  };
}

function readRequired(values: Map<string, string | boolean>, key: string): string {
  const value = values.get(key);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${key}\n\n${usage}`);
  }
  return value;
}

function readOptional(values: Map<string, string | boolean>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readOptionalNumber(values: Map<string, string | boolean>, key: string): number | undefined {
  const value = readOptional(values, key);
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer`);
  }
  return parsed;
}

function readMetadataNumber(metadata: Record<string, string>, key: string): number | undefined {
  const value = metadata[key];
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}
