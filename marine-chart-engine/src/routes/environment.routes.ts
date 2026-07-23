import fs from 'node:fs/promises';
import { Router } from 'express';
import type { EnvironmentCatalogService } from '../services/environment-catalog.service.js';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';
import type { EnvironmentalLayerId } from '../types/environment.types.js';
import type { EnvironmentSyncService } from '../services/environment-sync.service.js';

const RASTER_PROVIDER: Partial<Record<EnvironmentalLayerId, string>> = {
  airTemperature: 'owm-temperature', wind: 'owm-wind', precipitation: 'owm-precipitation', clouds: 'owm-clouds', pressure: 'owm-pressure',
};

export const createEnvironmentRouter = (
  catalog: EnvironmentCatalogService,
  xyz: XyzProxyService,
  wms: WmsProxyService,
  sync: EnvironmentSyncService,
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
      res.type('application/geo+json').send(await fs.readFile(file, 'utf8'));
    } catch (error) { next(error); }
  });
  return router;
};
