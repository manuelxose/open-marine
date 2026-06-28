import { Router } from 'express';

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'marine-chart-engine',
      supportsEncryptedCharts: false,
    });
  });

  return router;
};
