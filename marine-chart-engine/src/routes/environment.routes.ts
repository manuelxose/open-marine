import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import type { EnvironmentCatalogService } from '../services/environment-catalog.service.js';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';
import type { EnvironmentalLayerId } from '../types/environment.types.js';
import type { EnvironmentSyncService } from '../services/environment-sync.service.js';
import {
  filterFeatureCollection,
  parseAreaPolygon,
  pointInArea,
  type AreaMultiPolygon,
  type AreaPolygon,
} from '../services/geojson-area-filter.js';
import {
  parseChartIds,
  parseMarineBounds,
  type MarineGeometryService,
} from '../services/marine-geometry.service.js';

const RASTER_PROVIDER: Partial<Record<EnvironmentalLayerId, string>> = {
  airTemperature: 'owm-temperature', wind: 'owm-wind', precipitation: 'owm-precipitation', clouds: 'owm-clouds', pressure: 'owm-pressure',
};

export const createEnvironmentRouter = (
  catalog: EnvironmentCatalogService,
  xyz: XyzProxyService,
  wms: WmsProxyService,
  sync: EnvironmentSyncService,
  marineGeometry: MarineGeometryService,
): Router => {
  const router = Router();
  router.get('/catalog', (_req, res) => res.json({ layers: catalog.list() }));
  router.get('/sync/status', (_req, res) => res.json(sync.snapshot()));
  router.post('/sync', async (_req, res, next) => {
    try { res.status(202).json(await sync.runNow()); } catch (error) { next(error); }
  });
  router.get('/:layerId/times', (req, res) => {
    const layer = catalog.list().find((candidate) => candidate.id === req.params['layerId']);
    if (!layer) return void res.status(404).json({ error: 'environment_layer_not_found' });
    res.json({ layerId: layer.id, state: layer.state, updatedAt: layer.updatedAt, times: layer.validTimes });
  });
  router.get('/:layerId/:time/:z/:x/:y.png', async (req, res, next) => {
    try {
      const id = req.params['layerId'] as EnvironmentalLayerId;
      const z = Number.parseInt(req.params['z'] ?? '', 10);
      const x = Number.parseInt(req.params['x'] ?? '', 10);
      const y = Number.parseInt(req.params['y'] ?? '', 10);
      const provider = RASTER_PROVIDER[id];
      const tile = id === 'bathymetry'
        ? await wms.fetchTile('emodnet-bathymetry', z, x, y)
        : provider ? await xyz.fetchTile(provider, z, x, y) : null;
      if (!tile) return void res.status(404).json({ error: 'environment_tile_unavailable' });
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.type(tile.contentType).send(tile.data);
    } catch (error) { next(error); }
  });
  router.get('/:layerId/:time.geojson', async (req, res, next) => {
    try {
      const file = catalog.framePath(req.params['layerId'] as EnvironmentalLayerId, req.params['time'] ?? '');
      if (!file) return void res.status(404).json({ error: 'environment_frame_unavailable' });
      const contents = await fs.readFile(file, 'utf8');
      const normalized = req.params['layerId'] === 'waves'
        ? filterWaveSymbolsToMarine(
            normalizeWaveSymbols(JSON.parse(contents) as GeoJsonFeatureCollection),
            await loadMarineMask(),
          )
        : JSON.parse(contents) as GeoJsonFeatureCollection;
      const body = filterFeatureCollection(normalized, parseAreaPolygon(req.query['area']));
      const mask = typeof req.query['bbox'] === 'string'
        ? marineGeometry.marineMask(
            parseMarineBounds(req.query['bbox']),
            req.query['area'],
            parseChartIds(req.query['chartIds']),
          )
        : null;
      res.type('application/geo+json').json(mask
        ? {
            ...body,
            features: marineGeometry.clipFeaturesToMask(body.features, mask),
            properties: { marineMask: mask.properties },
          }
        : body);
    } catch (error) { next(error); }
  });
  return router;
};

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties?: Record<string, unknown>;
  }>;
}

/** Converts cached legacy wave arrows to point symbols without rewriting user data. */
export const normalizeWaveSymbols = (collection: GeoJsonFeatureCollection): GeoJsonFeatureCollection => ({
  ...collection,
  features: collection.features.map((feature) => {
    if (feature.properties?.['featureType'] !== 'direction') return feature;
    const center = legacyArrowCenter(feature.geometry.coordinates);
    if (!center) return feature;
    return {
      ...feature,
      geometry: { type: 'Point', coordinates: center },
      properties: { ...feature.properties, featureType: 'waveSymbol' },
    };
  }),
});

const legacyArrowCenter = (coordinates: unknown): [number, number] | null => {
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) return null;
  const mainSegment = coordinates[0];
  if (!Array.isArray(mainSegment) || mainSegment.length < 2) return null;
  const tail = mainSegment[0];
  const tip = mainSegment[1];
  if (!isPosition(tail) || !isPosition(tip)) return null;
  return [(tail[0] + tip[0]) / 2, (tail[1] + tip[1]) / 2];
};

const isPosition = (value: unknown): value is [number, number] =>
  Array.isArray(value) && Number.isFinite(value[0]) && Number.isFinite(value[1]);

let marineMaskPromise: Promise<Array<AreaPolygon | AreaMultiPolygon>> | null = null;

const loadMarineMask = (): Promise<Array<AreaPolygon | AreaMultiPolygon>> => {
  marineMaskPromise ??= fs.readFile(
    path.join(process.cwd(), 'resources', 'ria-vigo-marine-mask.geojson'),
    'utf8',
  ).then((contents) => {
    const parsed = JSON.parse(contents) as {
      features?: Array<{ geometry?: AreaPolygon | AreaMultiPolygon }>;
    };
    return parsed.features
      ?.map((feature) => feature.geometry)
      .filter((geometry): geometry is AreaPolygon | AreaMultiPolygon =>
        geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') ?? [];
  }).catch(() => []);
  return marineMaskPromise;
};

export const filterWaveSymbolsToMarine = (
  collection: GeoJsonFeatureCollection,
  areas: Array<AreaPolygon | AreaMultiPolygon>,
): GeoJsonFeatureCollection => areas.length === 0 ? collection : {
  ...collection,
  features: collection.features.filter((feature) => {
    if (feature.properties?.['featureType'] !== 'waveSymbol') return true;
    const coordinates = feature.geometry.coordinates;
    return isPosition(coordinates)
      && areas.some((area) => pointInArea(coordinates[0], coordinates[1], area));
  }),
};
