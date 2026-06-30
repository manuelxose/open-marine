import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, '..');
const repoRoot = path.resolve(packageRoot, '..');
const raspberryRuntimeRoot = '/var/lib/open-marine';
const defaultDataDir = process.platform === 'win32' ? path.join(packageRoot, 'data') : raspberryRuntimeRoot;

/**
 * Load CHART_ENGINE_* variables from a local env file into process.env, without
 * overriding values already present in the environment. Lets the engine pick up
 * secrets (e.g. CHART_ENGINE_OWM_API_KEY) from a gitignored file in dev and on
 * the Raspberry, instead of requiring every launcher to export them.
 * Secrets must live only in these local-only files, never in committed config.
 */
const loadEngineEnvFile = (): void => {
  const candidates = [
    process.env['CHART_ENGINE_ENV_FILE'],
    path.join(repoRoot, 'config', 'omi.env'),
    '/etc/open-marine/charts.env',
  ].filter((p): p is string => !!p);

  for (const file of candidates) {
    let contents: string;
    try {
      if (!fs.existsSync(file)) {
        continue;
      }
      contents = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) {
        continue;
      }
      const key = match[1]!;
      if (!key.startsWith('CHART_ENGINE_') || process.env[key] !== undefined) {
        continue;
      }
      let value = match[2]!.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
    // First existing file wins; later files only fill what is still missing.
  }
};

loadEngineEnvFile();

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
  localDownloadsFile: process.env['CHART_ENGINE_DOWNLOADS_FILE'] ?? path.join(defaultDataDir, 'charts', 'downloads.local.json'),
  uploadMaxBytes: readUploadLimitMb() * 1024 * 1024,
  uploadDir: process.env['CHART_ENGINE_UPLOAD_DIR'] ?? path.join(defaultDataDir, 'chart-uploads'),
  tileCacheTtlDays: readTileCacheTtl(),
  enableRemoteSources: process.env['CHART_ENGINE_ENABLE_REMOTE_SOURCES'] !== 'false',
  owmApiKey: process.env['CHART_ENGINE_OWM_API_KEY'] ?? '',
};
