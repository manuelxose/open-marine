import { Router } from 'express';
import { ChartSourceCatalog } from '../catalog/chart-source-catalog.js';
import { RemoteChartCatalogService } from '../services/remote-chart-catalog.service.js';
import { DownloadManager } from '../download/download-manager.js';
import type { ChartJobService } from '../services/chart-job.service.js';
import type { ChartRegistryService } from '../services/chart-registry.service.js';
import type { MbtilesService } from '../services/mbtiles.service.js';
import type { TileCacheService } from '../services/tile-cache.service.js';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';

export const createCatalogRouter = (
  jobs: ChartJobService,
  registry: ChartRegistryService,
  mbtiles: MbtilesService,
  tileCache: TileCacheService,
  xyzProxy: XyzProxyService,
  wmsProxy: WmsProxyService,
  dataDir: string,
): Router => {
  const router = Router();
  const catalog = new ChartSourceCatalog();
  const remoteCatalog = new RemoteChartCatalogService();
  const downloadManager = new DownloadManager(jobs, registry, mbtiles, tileCache, xyzProxy, wmsProxy, dataDir);

  router.get('/sources', (_req, res) => {
    const sources = catalog.list().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      region: p.region,
      kind: p.kind,
      availability: p.availability,
      attribution: p.attribution,
      minZoom: p.minZoom,
      maxZoom: p.maxZoom,
      enabled: p.enabled,
    }));
    res.json({ sources });
  });

  router.get('/sources/:providerId', (req, res) => {
    const provider = catalog.get(req.params['providerId'] ?? '');
    if (!provider) {
      res.status(404).json({ error: 'provider_not_found' });
      return;
    }
    res.json(provider);
  });

  router.get('/sources/:providerId/charts', async (req, res, next) => {
    try {
      const { providerId } = req.params;
      const provider = catalog.get(providerId);
      if (!provider) {
        res.status(404).json({ error: 'provider_not_found' });
        return;
      }

      const charts = await remoteCatalog.listCharts(providerId);
      res.json({ charts });
    } catch (error) {
      next(error);
    }
  });

  router.post('/download/area', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const id = readString(body, 'id');
      const label = readString(body, 'label');
      const providerId = readString(body, 'providerId');
      const bbox = readBBox(body, 'bbox');
      const minZoom = readInt(body, 'minZoom');
      const maxZoom = readInt(body, 'maxZoom');

      const job = downloadManager.enqueueAreaDownload({
        id,
        label,
        providerId,
        bbox,
        minZoom,
        maxZoom,
        description: readOptionalString(body, 'description'),
        attribution: readOptionalString(body, 'attribution'),
      });

      res.status(202).json(job);
    } catch (error) {
      next(error);
    }
  });

  router.post('/download/enc', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const chartNumber = readString(body, 'chartNumber');
      const id = readString(body, 'id');
      const label = readString(body, 'label');

      const job = downloadManager.enqueueEncDownload({
        chartNumber,
        id,
        label,
        description: readOptionalString(body, 'description'),
      });

      res.status(202).json(job);
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

const readOptionalString = (body: Record<string, unknown>, key: string): string | undefined => {
  const value = body[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const readInt = (body: Record<string, unknown>, key: string): number => {
  const value = body[key];
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : typeof value === 'number' ? value : NaN;
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer field: ${key}`);
  }
  return parsed;
};

const readBBox = (body: Record<string, unknown>, key: string): [number, number, number, number] => {
  const value = body[key];
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`Invalid bbox: must be an array of 4 numbers [minLon, minLat, maxLon, maxLat]`);
  }
  const nums = value.map((v) => typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN);
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid bbox: all values must be numbers`);
  }
  return [nums[0], nums[1], nums[2], nums[3]];
};
