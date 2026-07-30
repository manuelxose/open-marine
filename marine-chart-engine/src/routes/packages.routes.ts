import { Router } from 'express';
import { RIA_VIGO_PRESET } from '../presets/ria-vigo.js';
import { estimateAreaDownload } from '../services/download-estimate.js';
import type { ChartPackageService } from '../services/chart-package.service.js';

export const createPackagesRouter = (packages: ChartPackageService): Router => {
  const router = Router();
  router.get('/', (_req, res) => res.json({ packages: packages.list(), presets: [RIA_VIGO_PRESET] }));
  router.get('/ria-vigo', (_req, res) => {
    const estimates = RIA_VIGO_PRESET.offlineCore.map((source) => ({
      ...source,
      estimate: estimateAreaDownload(RIA_VIGO_PRESET.bounds, source.minZoom, source.maxZoom),
    }));
    res.json({ ...RIA_VIGO_PRESET, offlineCore: estimates });
  });
  router.get('/:packageId', (req, res) => {
    const item = packages.get(req.params['packageId'] ?? '');
    if (!item) {
      res.status(404).json({ error: 'package_not_found' });
      return;
    }
    res.json(item);
  });
  router.post('/', async (req, res, next) => {
    try {
      const planId = readString(req.body as Record<string, unknown>, 'planId');
      res.status(202).json(await packages.create(planId));
    } catch (error) {
      next(error);
    }
  });
  router.post('/:packageId/repair', async (req, res, next) => {
    try {
      res.json(await packages.repair(req.params['packageId'] ?? ''));
    } catch (error) {
      next(error);
    }
  });
  router.post('/:packageId/update', async (req, res, next) => {
    try {
      res.json(await packages.repair(req.params['packageId'] ?? ''));
    } catch (error) {
      next(error);
    }
  });
  router.post('/:packageId/cancel', async (req, res, next) => {
    try {
      res.json(await packages.cancel(req.params['packageId'] ?? ''));
    } catch (error) {
      next(error);
    }
  });
  router.post('/:packageId/layers/:layerId/attach', async (req, res, next) => {
    try {
      const chartId = readString(req.body as Record<string, unknown>, 'chartId');
      res.json(await packages.attachLayer(
        req.params['packageId'] ?? '',
        req.params['layerId'] ?? '',
        chartId,
      ));
    } catch (error) {
      next(error);
    }
  });
  router.delete('/:packageId', async (req, res, next) => {
    try {
      const deleted = await packages.delete(req.params['packageId'] ?? '');
      res.status(deleted ? 204 : 404).end();
    } catch (error) {
      next(error);
    }
  });
  return router;
};

const readString = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing or invalid field: ${key}`);
  }
  return value.trim();
};
