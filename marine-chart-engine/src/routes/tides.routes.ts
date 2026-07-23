import { Router } from 'express';
import type { TideService } from '../services/tide.service.js';

export const createTidesRouter = (tides: TideService): Router => {
  const router = Router();
  router.get('/vigo', async (req, res, next) => {
    try {
      const date = typeof req.query['date'] === 'string' ? req.query['date'] : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date());
      res.json(await tides.getVigo(date));
    } catch (error) {
      next(error);
    }
  });
  return router;
};
