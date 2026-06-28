import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, '..');
const raspberryRuntimeRoot = '/var/lib/open-marine';
const defaultDataDir = process.platform === 'win32' ? path.join(packageRoot, 'data') : raspberryRuntimeRoot;

const readPort = (): number => {
  const value = Number.parseInt(process.env['CHART_ENGINE_PORT'] ?? process.env['PORT'] ?? '8088', 10);
  return Number.isFinite(value) ? value : 8088;
};

const readUploadLimitMb = (): number => {
  const value = Number.parseInt(process.env['CHART_ENGINE_UPLOAD_MAX_MB'] ?? '2048', 10);
  return Number.isFinite(value) && value > 0 ? value : 2048;
};

const readTileCacheTtl = (): number => {
  const value = Number.parseInt(process.env['CHART_ENGINE_TILE_CACHE_TTL_DAYS'] ?? '30', 10);
  return Number.isFinite(value) && value > 0 ? value : 30;
};

export const config = {
  port: readPort(),
  dataDir: process.env['CHART_ENGINE_DATA_DIR'] ?? defaultDataDir,
  cacheDir: process.env['CHART_ENGINE_CACHE_DIR'] ?? path.join(defaultDataDir, 'chart-cache'),
  localRegistryFile: process.env['CHART_ENGINE_REGISTRY_FILE'] ?? path.join(defaultDataDir, 'charts', 'registry.local.json'),
  uploadMaxBytes: readUploadLimitMb() * 1024 * 1024,
  uploadDir: process.env['CHART_ENGINE_UPLOAD_DIR'] ?? path.join(defaultDataDir, 'chart-uploads'),
  tileCacheTtlDays: readTileCacheTtl(),
  enableRemoteSources: process.env['CHART_ENGINE_ENABLE_REMOTE_SOURCES'] !== 'false',
};
