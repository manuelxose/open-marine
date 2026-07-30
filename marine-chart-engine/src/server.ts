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
import { createEnvironmentRouter } from './routes/environment.routes.js';
import { createPackagesRouter } from './routes/packages.routes.js';
import { createTidesRouter } from './routes/tides.routes.js';
import { createWeatherRouter } from './routes/weather.routes.js';
import { createMarineEnvironmentRouter } from './routes/marine-environment.routes.js';
import { ChartRegistryService } from './services/chart-registry.service.js';
import { ChartImportService } from './services/chart-import.service.js';
import { ChartJobService } from './services/chart-job.service.js';
import { EmodnetProxyService } from './services/emodnet-proxy.service.js';
import { MbtilesService } from './services/mbtiles.service.js';
import { TilePathService } from './services/tile-path.service.js';
import { TileCacheService } from './services/tile-cache.service.js';
import { XyzProxyService } from './services/xyz-proxy.service.js';
import { WmsProxyService } from './services/wms-proxy.service.js';
import { EnvironmentCatalogService } from './services/environment-catalog.service.js';
import { TideService } from './services/tide.service.js';
import { EnvironmentSyncService } from './services/environment-sync.service.js';
import { WeatherForecastService } from './services/weather-forecast.service.js';
import { WindFieldService } from './services/wind-field.service.js';
import { OpenMeteoMarineService } from './services/open-meteo-marine.service.js';
import { EncHazardService } from './services/enc-hazard.service.js';
import { IhmFeatureInfoService } from './services/ihm-feature-info.service.js';
import { DownloadManager } from './download/download-manager.js';
import { DownloadStateService } from './services/download-state.service.js';
import { AreaSearchService } from './services/area-search.service.js';
import { PackagePlannerService } from './services/package-planner.service.js';
import { ChartPackageService } from './services/chart-package.service.js';
import { InstallationDiagnosticsService } from './services/installation-diagnostics.service.js';
import { MarineEnvironmentEngine } from './marine-environment/application/marine-environment-engine.js';
import { ProviderRegistry } from './marine-environment/application/provider-registry.js';
import { OpenMeteoWindProvider } from './marine-environment/infrastructure/open-meteo-wind.provider.js';
import { OpenMeteoMarineProvider } from './marine-environment/infrastructure/open-meteo-marine.provider.js';
import { CachedCopernicusProvider } from './marine-environment/infrastructure/cached-copernicus.provider.js';
import { PuertosHfRadarProvider } from './marine-environment/infrastructure/puertos-hf-radar.provider.js';
import { StorageQuotaService } from './services/storage-quota.service.js';
import { MarineGeometryService } from './services/marine-geometry.service.js';

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

const storageQuota = new StorageQuotaService({
  cacheDir: config.cacheDir,
  dataDir: config.dataDir,
  maxCacheBytes: config.cacheMaxBytes,
  reserveBytes: config.cacheMinFreeBytes,
  tileTtlDays: config.tileCacheTtlDays,
});

// Remote tile proxy services
const tileCache = new TileCacheService({
  cacheDir: path.join(config.cacheDir, 'tiles'),
  ttlDays: config.tileCacheTtlDays,
  onWrite: () => storageQuota.schedulePrune(),
});

const xyzProxy = new XyzProxyService(tileCache);
const wmsProxy = new WmsProxyService(tileCache);
const publicBaseUrl = `http://localhost:${config.port}`;
const environmentCatalog = new EnvironmentCatalogService(
  config.dataDir,
  publicBaseUrl,
  Boolean(config.owmApiKey),
  config.copernicusSyncEnabled,
);
const tides = new TideService(config.cacheDir, fetch, () => storageQuota.schedulePrune());
const environmentSync = new EnvironmentSyncService(
  config.copernicusSyncEnabled,
  config.copernicusSyncHours,
  config.pythonExecutable,
  path.join(process.cwd(), 'scripts', 'sync-copernicus-vigo.py'),
  () => storageQuota.schedulePrune(),
);
const weatherForecast = new WeatherForecastService(
  path.join(config.cacheDir, 'weather'),
  fetch,
  Date.now,
  () => storageQuota.schedulePrune(),
);
const windField = new WindFieldService(
  path.join(config.cacheDir, 'weather'),
  fetch,
  Date.now,
  () => storageQuota.schedulePrune(),
);
const openMeteoMarine = new OpenMeteoMarineService(
  path.join(config.cacheDir, 'weather'),
  fetch,
  Date.now,
  () => storageQuota.schedulePrune(),
);
const marineProviders = new ProviderRegistry();
marineProviders.register(new OpenMeteoWindProvider(windField));
marineProviders.register(new PuertosHfRadarProvider());
marineProviders.register(new CachedCopernicusProvider('waves', config.dataDir));
marineProviders.register(new CachedCopernicusProvider('currents', config.dataDir));
marineProviders.register(new OpenMeteoMarineProvider(openMeteoMarine));
const marineEnvironment = new MarineEnvironmentEngine(marineProviders);
const downloadState = new DownloadStateService(config.localDownloadsFile);
const downloadManager = new DownloadManager(
  jobs,
  registry,
  mbtiles,
  tileCache,
  xyzProxy,
  wmsProxy,
  config.dataDir,
  downloadState,
);
const areaSearch = new AreaSearchService(config.areaSearchCacheFile);
const packagePlanner = new PackagePlannerService(config.dataDir);
const chartPackages = new ChartPackageService(config.localPackagesFile, downloadManager, jobs, registry);
const installationDiagnostics = new InstallationDiagnosticsService(
  config.dataDir,
  path.join(config.dataDir, 'secure', 's63-installation.json'),
);
const encHazards = new EncHazardService(registry);
const ihmFeatureInfo = new IhmFeatureInfoService();
const marineGeometry = new MarineGeometryService(
  registry,
  path.join(process.cwd(), 'resources', 'ria-vigo-marine-mask.geojson'),
);
const vigoDate = (offsetDays: number): string => {
  const instant = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);
};
const refreshVigoTides = (): void => {
  void Promise.allSettled([tides.getVigo(vigoDate(0)), tides.getVigo(vigoDate(1))]);
};
const tideRefreshTimer = setInterval(refreshVigoTides, 6 * 60 * 60 * 1000);
tideRefreshTimer.unref();
refreshVigoTides();

// Register built-in XYZ providers
xyzProxy.registerProvider({
  id: 'openseamap',
  tileUrlTemplate: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  minZoom: 8,
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
});
xyzProxy.registerProvider({
  id: 'ihm-enc-wmts',
  tileUrlTemplate: 'https://ideihm.covam.es/ihmcache/wmts/1.0.0/RasterENC/default/googlemapscompatible/{z}/{y}/{x}.png',
  minZoom: 0,
  maxZoom: 21,
  attribution: '&copy; Instituto Hidrográfico de la Marina (IHM) — not valid for official navigation',
});

// Register optional OpenWeatherMap atmospheric overlays only when a key is configured.
if (config.owmApiKey) {
  for (const provider of [
    { id: 'owm-temperature', layer: 'temp_new', attribution: 'Air temperature' },
    { id: 'owm-wind', layer: 'wind_new', attribution: 'Wind' },
    { id: 'owm-precipitation', layer: 'precipitation_new', attribution: 'Precipitation' },
    { id: 'owm-clouds', layer: 'clouds_new', attribution: 'Cloud cover' },
    { id: 'owm-pressure', layer: 'pressure_new', attribution: 'Pressure' },
  ]) {
    xyzProxy.registerProvider({
      id: provider.id,
      tileUrlTemplate: `https://tile.openweathermap.org/map/${provider.layer}/{z}/{x}/{y}.png?appid=${config.owmApiKey}`,
      minZoom: 0,
      maxZoom: 18,
      attribution: `${provider.attribution} &copy; OpenWeatherMap`,
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
app.use('/health', createHealthRouter({
  xyz: xyzProxy,
  wms: wmsProxy,
  environmentSync,
  weatherConfigured: Boolean(config.owmApiKey),
}));
app.use('/charts', createChartsRouter(registry, tilePaths, mbtiles, importer, jobs));
app.use('/bathymetry', createBathymetryRouter(emodnet));
app.use('/proxy/xyz', createXyzProxyRouter(xyzProxy));
app.use('/proxy/wms', createWmsProxyRouter(wmsProxy));
app.use('/catalog', createCatalogRouter(
  downloadManager,
  areaSearch,
  packagePlanner,
  chartPackages,
  installationDiagnostics,
  storageQuota,
  encHazards,
  ihmFeatureInfo,
  marineGeometry,
));
app.use('/environment', createEnvironmentRouter(
  environmentCatalog,
  xyzProxy,
  wmsProxy,
  environmentSync,
  marineGeometry,
));
app.use('/tides', createTidesRouter(tides));
app.use('/weather', createWeatherRouter(weatherForecast, windField, marineGeometry));
app.use(
  '/api/marine',
  createMarineEnvironmentRouter(
    marineEnvironment,
    marineGeometry,
    openMeteoMarine,
  ),
);
app.use('/catalog/packages', createPackagesRouter(chartPackages));
app.use('/packages', createPackagesRouter(chartPackages));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : String(error);
  const { status, code } = classifyChartError(message);
  res.status(status).json({ error: code, message });
});

const server = app.listen(config.port, () => {
  console.log(`Marine chart engine listening at http://localhost:${config.port}`);
  environmentSync.start();
  storageQuota.start();
});

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    environmentSync.stop();
    storageQuota.stop();
    clearInterval(tideRefreshTimer);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}

const classifyChartError = (message: string): { status: number; code: string } => {
  if (/tide api returned|upstream.*returned|provider.*returned|weather upstream unavailable/i.test(message)) {
    return { status: 503, code: 'upstream_provider_unavailable' };
  }
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
