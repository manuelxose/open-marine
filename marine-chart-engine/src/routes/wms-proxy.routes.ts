import { Router } from 'express';
import type { WmsProxyService } from '../services/wms-proxy.service.js';

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

      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.type(tile.contentType).send(tile.data);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:providerId/style.json', (req, res, next) => {
    try {
      const { providerId } = req.params;
      const style = wmsProxy.buildStyle(providerId);
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
