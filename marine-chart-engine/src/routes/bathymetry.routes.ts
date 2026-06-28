import { Router } from 'express';
import type { EmodnetProxyService } from '../services/emodnet-proxy.service.js';

export const createBathymetryRouter = (emodnet: EmodnetProxyService): Router => {
  const router = Router();

  router.get('/emodnet/:z/:x/:y.png', async (req, res, next) => {
    try {
      const z = Number.parseInt(req.params['z'] ?? '', 10);
      const x = Number.parseInt(req.params['x'] ?? '', 10);
      const y = Number.parseInt(req.params['y'] ?? '', 10);
      if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
        res.status(404).json({ error: 'tile_not_found' });
        return;
      }

      const tile = await emodnet.getRasterTile(z, x, y);
      if (!tile) {
        res.status(404).json({ error: 'emodnet_proxy_not_implemented' });
        return;
      }

      res.type('image/png').send(tile);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
