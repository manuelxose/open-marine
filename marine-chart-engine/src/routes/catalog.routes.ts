import { Router } from 'express';
import { ChartSourceCatalog } from '../catalog/chart-source-catalog.js';
import { RemoteChartCatalogService } from '../services/remote-chart-catalog.service.js';
import type { DownloadManager } from '../download/download-manager.js';
import { DownloadStateService, deriveRemoteChartStatus } from '../services/download-state.service.js';
import { estimateAreaDownload, DEFAULT_MAX_TILES, DEFAULT_MAX_ZOOM } from '../services/download-estimate.js';
import { config } from '../config.js';
import type { AreaSearchService } from '../services/area-search.service.js';
import type { PackagePlannerService } from '../services/package-planner.service.js';
import type { ChartPackageService } from '../services/chart-package.service.js';
import type { InstallationDiagnosticsService } from '../services/installation-diagnostics.service.js';
import type { RemoteChartEntry } from '../types/catalog.types.js';
import type { StorageQuotaService } from '../services/storage-quota.service.js';
import type { EncHazardQuery, EncHazardService } from '../services/enc-hazard.service.js';
import type { IhmFeatureInfoService } from '../services/ihm-feature-info.service.js';
import {
  parseChartIds,
  parseMarineBounds,
  type MarineGeometryService,
} from '../services/marine-geometry.service.js';

export const createCatalogRouter = (
  downloadManager: DownloadManager,
  areaSearch: AreaSearchService,
  packagePlanner: PackagePlannerService,
  packages: ChartPackageService,
  installation: InstallationDiagnosticsService,
  storage: StorageQuotaService,
  encHazards: EncHazardService,
  ihmFeatureInfo: IhmFeatureInfoService,
  marineGeometry: MarineGeometryService,
): Router => {
  const router = Router();
  const catalog = new ChartSourceCatalog();
  const remoteCatalog = new RemoteChartCatalogService();
  const downloadState = new DownloadStateService(config.localDownloadsFile);
  router.post('/areas/search', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const query = readString(body, 'query');
      res.json({ results: await areaSearch.search(query) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/package-plans', (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const plan = packagePlanner.createPlan({
        name: readString(body, 'name'),
        geometry: body['geometry'],
        ...(body['profile'] === 'custom' ? { profile: 'custom' as const } : { profile: 'recommended' as const }),
        ...(typeof body['storageBudgetBytes'] === 'number' ? { storageBudgetBytes: body['storageBudgetBytes'] } : {}),
        ...(Array.isArray(body['selectedProviderIds'])
          ? { selectedProviderIds: body['selectedProviderIds'].filter((value): value is string => typeof value === 'string') }
          : {}),
      });
      packages.rememberPlan(plan);
      res.json(plan);
    } catch (error) {
      next(error);
    }
  });

  router.get('/installation', async (_req, res, next) => {
    try {
      res.json(await installation.inspect());
    } catch (error) {
      next(error);
    }
  });

  router.get('/storage', async (_req, res, next) => {
    try {
      res.json(await storage.inspect());
    } catch (error) {
      next(error);
    }
  });

  router.post('/storage/prune', async (_req, res, next) => {
    try {
      res.json(await storage.prune());
    } catch (error) {
      next(error);
    }
  });

  router.post('/enc/hazards/query', (req, res, next) => {
    try {
      res.json(encHazards.query(req.body as EncHazardQuery));
    } catch (error) {
      next(error);
    }
  });

  router.get('/ihm/feature-info', async (req, res, next) => {
    try {
      res.json(await ihmFeatureInfo.query(
        Number(req.query['lng']),
        Number(req.query['lat']),
        Number(req.query['zoom']),
      ));
    } catch (error) {
      next(error);
    }
  });

  router.get('/enc/marine-mask.geojson', (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.type('application/geo+json').json(marineGeometry.marineMask(
        parseMarineBounds(req.query['bbox']),
        req.query['area'],
        parseChartIds(req.query['chartIds']),
      ));
    } catch (error) {
      next(error);
    }
  });

  router.get('/enc/depth-overlay.geojson', (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.type('application/geo+json').json(marineGeometry.depthOverlay(
        parseMarineBounds(req.query['bbox']),
        req.query['area'],
        parseChartIds(req.query['chartIds']),
        Number(req.query['safetyDepthM'] ?? 5),
        Number(req.query['zoom']),
        typeof req.query['layers'] === 'string'
          ? req.query['layers'].split(',').map((layer) => layer.trim()).filter(Boolean)
          : undefined,
      ));
    } catch (error) {
      next(error);
    }
  });

  router.get('/s63/status', async (_req, res, next) => {
    try {
      res.json((await installation.inspect()).s63);
    } catch (error) {
      next(error);
    }
  });

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

      const bbox = parseBBoxQuery(req.query['bbox']);
      const charts = await remoteCatalog.listCharts(providerId, bbox ? { bbox } : undefined);

      const recordByChartId = new Map(downloadState.list().map((record) => [record.chartId, record]));
      const enriched = charts.map((entry) => ({
        ...entry,
        status: deriveRemoteChartStatus(recordByChartId.get(entry.id) ?? null, {
          lastUpdated: entry.lastUpdated,
          sizeBytes: entry.sizeBytes,
          downloadable: isDownloadable(entry, provider.availability),
        }),
      }));

      res.json({ charts: enriched });
    } catch (error) {
      next(error);
    }
  });

  // Generic download: resolve the entry's download URL from the catalog by chartId.
  router.post('/download/chart', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const providerId = readString(body, 'providerId');
      const chartId = readString(body, 'chartId');
      const id = readString(body, 'id');
      const label = readString(body, 'label');

      const charts = await remoteCatalog.listCharts(providerId);
      const entry = charts.find((candidate) => candidate.id === chartId);
      if (!entry) {
        res.status(404).json({ error: 'chart_not_found', message: `Chart ${chartId} not found for provider ${providerId}` });
        return;
      }
      if (!entry.downloadUrl) {
        res.status(400).json({ error: 'chart_not_downloadable', message: `Chart ${chartId} has no download URL` });
        return;
      }

      if (entry.format === 's57') {
        const job = downloadManager.enqueueEncDownload(
          {
            providerId,
            chartId,
            downloadUrl: entry.downloadUrl,
            id,
            label,
            ...optional(body, 'expectedSha256'),
            ...optional(body, 'description'),
          },
          {
            bounds: entry.bounds,
            ...(typeof entry.sizeBytes === 'number' ? { sizeBytes: entry.sizeBytes } : {}),
            ...(entry.lastUpdated ? { remoteLastUpdated: entry.lastUpdated } : {}),
          },
        );
        res.status(202).json(job);
        return;
      }

      res.status(400).json({
        error: 'unsupported_download_format',
        message: `Format ${entry.format} must be downloaded as an area via /catalog/download/area`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/download/estimate', (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const bbox = readBBox(body, 'bbox');
      const minZoom = readInt(body, 'minZoom');
      const maxZoom = readInt(body, 'maxZoom');

      assertZoomRange(minZoom, maxZoom);
      res.json(estimateAreaDownload(bbox, minZoom, maxZoom));
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

      const provider = catalog.get(providerId);
      if (!provider) {
        res.status(404).json({ error: 'provider_not_found' });
        return;
      }
      if (provider.availability !== 'offline-capable') {
        res.status(403).json({
          error: 'provider_online_only',
          message: `${provider.name} cannot be bulk-cached. Import a legally obtained local extract instead.`,
        });
        return;
      }

      assertZoomRange(minZoom, maxZoom);
      const estimate = estimateAreaDownload(bbox, minZoom, maxZoom);
      if (estimate.totalTiles > DEFAULT_MAX_TILES) {
        throw new Error(`Download too large: ${estimate.totalTiles} tiles exceeds the limit of ${DEFAULT_MAX_TILES}`);
      }

      const job = downloadManager.enqueueAreaDownload({
        id,
        label,
        providerId,
        bbox,
        minZoom,
        maxZoom,
        ...optional(body, 'description'),
        ...optional(body, 'attribution'),
        ...optional(body, 'layers'),
      });

      res.status(202).json(job);
    } catch (error) {
      next(error);
    }
  });

  router.get('/download/:chartId/progress', (req, res) => {
    const progress = downloadManager.getProgress(req.params['chartId'] ?? '');
    if (!progress) {
      res.status(404).json({ error: 'progress_not_found' });
      return;
    }
    res.json(progress);
  });

  router.post('/download/:chartId/cancel', (req, res) => {
    const cancelled = downloadManager.cancel(req.params['chartId'] ?? '');
    if (!cancelled) {
      res.status(404).json({ error: 'download_not_found' });
      return;
    }
    res.json({ cancelled: true });
  });

  return router;
};

const isDownloadable = (
  entry: RemoteChartEntry,
  availability: 'online' | 'offline-capable' | 'subscription' | 'manual-import',
): boolean => {
  if (availability !== 'offline-capable') return false;
  if (entry.format === 's57') {
    return Boolean(entry.downloadUrl);
  }
  return true;
};

const assertZoomRange = (minZoom: number, maxZoom: number): void => {
  if (minZoom < 0 || maxZoom < minZoom) {
    throw new Error(`Invalid zoom range: minZoom=${minZoom}, maxZoom=${maxZoom}`);
  }
  if (maxZoom > DEFAULT_MAX_ZOOM) {
    throw new Error(`maxZoom ${maxZoom} exceeds the limit of ${DEFAULT_MAX_ZOOM}`);
  }
};

const parseBBoxQuery = (value: unknown): [number, number, number, number] | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const parts = value.split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
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

/** Build a spreadable object that only includes the key when present. */
const optional = (body: Record<string, unknown>, key: string): Record<string, string> => {
  const value = readOptionalString(body, key);
  return value === undefined ? {} : { [key]: value };
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
  const nums = value.map((v) => (typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN));
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid bbox: all values must be numbers`);
  }
  return [nums[0]!, nums[1]!, nums[2]!, nums[3]!];
};
