import { Router } from 'express';
import { RIA_VIGO_PRESET } from '../presets/ria-vigo.js';
import { estimateAreaDownload } from '../services/download-estimate.js';

export const createPackagesRouter = (): Router => {
  const router = Router();
  router.get('/', (_req, res) => res.json({ packages: [RIA_VIGO_PRESET] }));
  router.get('/ria-vigo', (_req, res) => {
    const estimates = RIA_VIGO_PRESET.offlineCore.map((source) => ({
      ...source,
      estimate: estimateAreaDownload(RIA_VIGO_PRESET.bounds, source.minZoom, source.maxZoom),
    }));
    res.json({ ...RIA_VIGO_PRESET, offlineCore: estimates });
  });
  return router;
};
