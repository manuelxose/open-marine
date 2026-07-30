import { Router } from 'express';
import { RemoteWmsTileError } from '../services/wms-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XyPzWQAAAABJRU5ErkJggg==',
  'base64',
);

export const createWmsProxyRouter = (wmsProxy: WmsProxyService): Router => {
  const router = Router();

  router.get('/:providerId/:z/:x/:y.png', async (req, res, next) => {
    try {
      const { providerId } = req.params;
      const z = Number.parseInt(req.params['z'] ?? '', 10);
      const x = Number.parseInt(req.params['x'] ?? '', 10);
      const y = Number.parseInt(req.params['y'] ?? '', 10);

      if (!wmsProxy.hasProvider(providerId) || !Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
        res.status(404).json({ error: 'provider_or_tile_not_found' });
        return;
      }

      const tile = await wmsProxy.fetchTile(providerId, z, x, y);
      if (!tile) {
        res.status(404).json({ error: 'tile_not_available' });
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800, stale-if-error=604800');
      res.type(tile.contentType).send(tile.data);
    } catch (error) {
      if (error instanceof RemoteWmsTileError) {
        // Raster sources interpret HTTP failures as broken tiles and retry noisily.
        // Preserve the failure in diagnostics but render a temporary transparent gap.
        res.setHeader('Cache-Control', 'public, max-age=30');
        res.setHeader('X-OMI-Provider-State', 'degraded');
        res.setHeader('X-OMI-Upstream-Status', String(error.remoteStatus ?? error.statusCode));
        res.status(200).type('image/png').send(TRANSPARENT_PNG);
        return;
      }
      next(error);
    }
  });

  router.get('/:providerId/style.json', (req, res, next) => {
    try {
      const { providerId } = req.params;
      const style = wmsProxy.buildStyle(providerId, `${req.protocol}://${req.get('host')}`);
      if (!style) {
        res.status(404).json({ error: 'provider_not_found' });
        return;
      }
      res.json(style);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
