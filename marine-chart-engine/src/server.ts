import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { createBathymetryRouter } from './routes/bathymetry.routes.js';
import { createChartsRouter } from './routes/charts.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createXyzProxyRouter } from './routes/xyz-proxy.routes.js';
import { createWmsProxyRouter } from './routes/wms-proxy.routes.js';
import { createCatalogRouter } from './routes/catalog.routes.js';
import { ChartRegistryService } from './services/chart-registry.service.js';
import { ChartImportService } from './services/chart-import.service.js';
import { ChartJobService } from './services/chart-job.service.js';
import { EmodnetProxyService } from './services/emodnet-proxy.service.js';
import { MbtilesService } from './services/mbtiles.service.js';
import { TilePathService } from './services/tile-path.service.js';
import { TileCacheService } from './services/tile-cache.service.js';
import { XyzProxyService } from './services/xyz-proxy.service.js';
import { WmsProxyService } from './services/wms-proxy.service.js';

const app = express();
app.use(express.json());

for (const dir of [config.dataDir, path.join(config.dataDir, 'charts'), config.cacheDir, config.uploadDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Core services
const tilePaths = new TilePathService(config.dataDir);
const mbtiles = new MbtilesService();
const registry = new ChartRegistryService(tilePaths, mbtiles, config.localRegistryFile);
const importer = new ChartImportService(registry, mbtiles);
const jobs = new ChartJobService();
const emodnet = new EmodnetProxyService(config.cacheDir);

// Remote tile proxy services
const tileCache = new TileCacheService({
  cacheDir: path.join(config.cacheDir, 'tiles'),
  ttlDays: Number.parseInt(process.env['CHART_ENGINE_TILE_CACHE_TTL_DAYS'] ?? '30', 10),
});

const xyzProxy = new XyzProxyService(tileCache);
const wmsProxy = new WmsProxyService(tileCache);

// Register built-in XYZ providers
xyzProxy.registerProvider({
  id: 'openseamap',
  tileUrlTemplate: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  minZoom: 8,
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
});

// Register OpenWeatherMap weather overlays (only when an API key is configured).
// The key stays server-side; the UI consumes the proxied tiles. Weather tiles are
// cached briefly (30 min) so they stay fresh without hammering the OWM API.
if (config.owmApiKey) {
  const owmLayers: { id: string; layer: string }[] = [
    { id: 'owm-temperature', layer: 'temp_new' },
    { id: 'owm-wind', layer: 'wind_new' },
    { id: 'owm-precipitation', layer: 'precipitation_new' },
    { id: 'owm-clouds', layer: 'clouds_new' },
    { id: 'owm-pressure', layer: 'pressure_new' },
  ];
  for (const { id, layer } of owmLayers) {
    xyzProxy.registerProvider({
      id,
      tileUrlTemplate: `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${config.owmApiKey}`,
      minZoom: 0,
      maxZoom: 18,
      attribution: 'Weather data &copy; OpenWeatherMap',
      cacheTtlMinutes: 30,
    });
  }
}

// Register built-in WMS providers
wmsProxy.registerProvider({
  id: 'emodnet-bathymetry',
  baseUrl: 'https://ows.emodnet-bathymetry.eu/wms',
  layers: 'mean_multicolour',
  format: 'image/png',
  transparent: true,
  srs: 'EPSG:3857',
  minZoom: 0,
  maxZoom: 18,
  attribution: 'EMODnet Bathymetry Consortium',
});

for (const purpose of [
  { id: 'ihm-enc-p2', service: 'cartaENCp2', layer: 'ENC_ES2', minZoom: 4, maxZoom: 10 },
  { id: 'ihm-enc-p3', service: 'cartaENCp3', layer: 'ENC_ES3', minZoom: 6, maxZoom: 12 },
  { id: 'ihm-enc-p4', service: 'cartaENCp4', layer: 'ENC_ES4', minZoom: 8, maxZoom: 15 },
  { id: 'ihm-enc-p5', service: 'cartaENCp5', layer: 'ENC_ES5', minZoom: 10, maxZoom: 16 },
]) {
  wmsProxy.registerProvider({
    id: purpose.id,
    catalogGroupId: 'ihm-enc-wms',
    baseUrl: `https://ideihm.covam.es/wms/${purpose.service}`,
    layers: purpose.layer,
    format: 'image/png',
    transparent: true,
    srs: 'EPSG:3857',
    version: '1.3.0',
    minZoom: purpose.minZoom,
    maxZoom: purpose.maxZoom,
    attribution: 'Instituto Hidrografico de la Marina (IHM) - Not valid for official navigation',
    expectedContentTypes: ['image/png'],
  });
}

wmsProxy.registerProvider({
  id: 'noaa-wms',
  baseUrl: 'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/export',
  layers: '0',
  format: 'image/png',
  transparent: true,
  srs: 'EPSG:3857',
  version: '1.3.0',
  minZoom: 0,
  maxZoom: 18,
  attribution: 'NOAA Office of Coast Survey',
  additionalParams: { dpi: '96', f: 'image' },
});

wmsProxy.registerProvider({
  id: 'gebco',
  baseUrl: 'https://wms.gebco.net/mapserv',
  layers: 'GEBCO_LATEST',
  format: 'image/png',
  transparent: true,
  srs: 'EPSG:3857',
  version: '1.1.1',
  minZoom: 0,
  maxZoom: 18,
  attribution: 'Imagery reproduced from the GEBCO Compilation / GEBCO Grid',
});

// Routes
app.use('/health', createHealthRouter());
app.use('/charts', createChartsRouter(registry, tilePaths, mbtiles, importer, jobs));
app.use('/bathymetry', createBathymetryRouter(emodnet));
app.use('/proxy/xyz', createXyzProxyRouter(xyzProxy));
app.use('/proxy/wms', createWmsProxyRouter(wmsProxy));
app.use('/catalog', createCatalogRouter(jobs, registry, mbtiles, tileCache, xyzProxy, wmsProxy, config.dataDir));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : String(error);
  const { status, code } = classifyChartError(message);
  res.status(status).json({ error: code, message });
});

app.listen(config.port, () => {
  console.log(`Marine chart engine listening at http://localhost:${config.port}`);
});

const classifyChartError = (message: string): { status: number; code: string } => {
  if (/was not found on PATH/i.test(message)) {
    return { status: 422, code: 'missing_external_tool' };
  }
  if (/invalid mbtiles|missing metadata|invalid chart registry/i.test(message)) {
    return { status: 400, code: 'invalid_chart_package' };
  }
  if (/unsupported|encrypted|s-63|oesenc/i.test(message)) {
    return { status: 415, code: 'unsupported_format' };
  }
  if (/already exists/i.test(message)) {
    return { status: 409, code: 'chart_already_exists' };
  }
  return { status: 400, code: 'chart_engine_error' };
};
