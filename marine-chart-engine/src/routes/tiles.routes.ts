import { Router } from 'express';

export const createTilesRouter = (): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.status(404).json({ error: 'tiles_route_not_configured' });
  });

  return router;
};
