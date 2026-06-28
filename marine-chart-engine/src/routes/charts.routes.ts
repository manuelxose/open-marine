import { Router, type Request } from 'express';
import fs from 'node:fs/promises';
import multer from 'multer';
import path from 'node:path';
import { config } from '../config.js';
import type { ChartRegistryService } from '../services/chart-registry.service.js';
import type { ChartImportService } from '../services/chart-import.service.js';
import type { ChartJobService } from '../services/chart-job.service.js';
import type { MbtilesService } from '../services/mbtiles.service.js';
import type { TilePathService } from '../services/tile-path.service.js';
import type { ChartImportKind, ChartKind } from '../types/chart-source.types.js';

const parseTileParams = (params: Record<string, string | undefined>): { z: number; x: number; y: number } | null => {
  const z = Number.parseInt(params['z'] ?? '', 10);
  const x = Number.parseInt(params['x'] ?? '', 10);
  const y = Number.parseInt(params['y'] ?? '', 10);
  return Number.isInteger(z) && Number.isInteger(x) && Number.isInteger(y) ? { z, x, y } : null;
};

export const createChartsRouter = (
  registry: ChartRegistryService,
  tilePaths: TilePathService,
  mbtiles: MbtilesService,
  importer: ChartImportService,
  jobs: ChartJobService,
): Router => {
  const router = Router();
  const upload = multer({
    dest: config.uploadDir,
    limits: { fileSize: config.uploadMaxBytes },
  });

  router.get('/', (_req, res) => {
    res.json({ charts: registry.list() });
  });

  router.get('/jobs/:jobId', (req, res) => {
    const job = jobs.get(req.params['jobId'] ?? '');
    if (!job) {
      res.status(404).json({ error: 'job_not_found' });
      return;
    }
    res.json(job);
  });

  router.get('/:chartId/metadata', (req, res) => {
    const chart = registry.get(req.params['chartId'] ?? '');
    if (!chart) {
      res.status(404).json({ error: 'chart_not_found' });
      return;
    }
    res.json(chart);
  });

  router.post('/import/mbtiles', upload.single('file'), async (req, res, next) => {
    try {
      const job = enqueueImport('mbtiles', req, importer, jobs);
      res.status(202).json(job);
    } catch (error) {
      next(error);
    }
  });

  router.post('/import/raster', upload.single('file'), async (req, res, next) => {
    try {
      const job = enqueueImport('raster', req, importer, jobs);
      res.status(202).json(job);
    } catch (error) {
      next(error);
    }
  });

  router.post('/import/s57', upload.single('file'), async (req, res, next) => {
    try {
      const job = enqueueImport('s57', req, importer, jobs);
      res.status(202).json(job);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:chartId', async (req, res, next) => {
    try {
      const deleted = await importer.delete(req.params['chartId'] ?? '');
      if (!deleted) {
        res.status(404).json({ error: 'chart_not_found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/:chartId/raster/:z/:x/:y.png', async (req, res, next) => {
    try {
      const chart = registry.get(req.params['chartId'] ?? '');
      const coord = parseTileParams(req.params);
      if (!chart || !coord || chart.kind !== 'raster') {
        res.status(404).json({ error: 'tile_not_found' });
        return;
      }

      const mbtilesPath = registry.mbtilesPath(chart.id);
      if (mbtilesPath) {
        const mbtilesTile = mbtiles.readMbtilesTile(mbtilesPath, coord, 'raster');
        if (mbtilesTile) {
          res.type(mbtilesTile.contentType).send(mbtilesTile.data);
          return;
        }
      }

      const tile = await mbtiles.readStaticTile(tilePaths.rasterTilePath(chart.id, coord));
      if (!tile) {
        res.status(404).json({ error: 'tile_not_available_for_chart' });
        return;
      }

      res.type('image/png').send(tile);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:chartId/vector/:z/:x/:y.pbf', async (req, res, next) => {
    try {
      const chart = registry.get(req.params['chartId'] ?? '');
      const coord = parseTileParams(req.params);
      if (!chart || !coord || chart.kind !== 'vector') {
        res.status(404).json({ error: 'tile_not_found' });
        return;
      }

      const mbtilesPath = registry.mbtilesPath(chart.id);
      if (mbtilesPath) {
        const mbtilesTile = mbtiles.readMbtilesTile(mbtilesPath, coord, 'vector');
        if (mbtilesTile) {
          if (mbtilesTile.contentEncoding) {
            res.setHeader('Content-Encoding', mbtilesTile.contentEncoding);
          }
          res.type(mbtilesTile.contentType).send(mbtilesTile.data);
          return;
        }
      }

      const tile = await mbtiles.readStaticTile(tilePaths.vectorTilePath(chart.id, coord));
      if (!tile) {
        res.status(404).json({ error: 'tile_not_available_for_chart' });
        return;
      }

      res.type('application/x-protobuf').setHeader('Content-Encoding', 'gzip').send(tile);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

const enqueueImport = (
  kind: ChartImportKind,
  req: Request & { file?: Express.Multer.File },
  importer: ChartImportService,
  jobs: ChartJobService,
) => {
  const file = req.file;
  if (!file) {
    throw new Error('Missing multipart file field named "file"');
  }

  const chartId = readFormString(req.body, 'id');
  const label = readFormString(req.body, 'label');
  const chartKind: Extract<ChartKind, 'raster' | 'vector'> =
    kind === 'mbtiles'
      ? readChartKind(req.body)
      : kind === 'raster'
        ? 'raster'
        : 'vector';
  const sourceFile = path.resolve(file.path);
  const request = {
    id: chartId,
    label,
    kind: chartKind,
    sourceFile,
    description: readOptionalFormString(req.body, 'description'),
    attribution: readOptionalFormString(req.body, 'attribution'),
    minZoom: readOptionalFormNumber(req.body, 'minZoom'),
    maxZoom: readOptionalFormNumber(req.body, 'maxZoom'),
    force: readOptionalFormBoolean(req.body, 'force'),
  };

  return jobs.enqueue(kind, chartId, label, async () => {
    try {
      if (kind === 'mbtiles') {
        return await importer.importMbtiles(request);
      }
      if (kind === 'raster') {
        return await importer.importRaster(request);
      }
      return await importer.importS57(request);
    } finally {
      await fs.rm(sourceFile, { force: true });
    }
  });
};

const readFormString = (body: unknown, key: string): string => {
  const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing form field: ${key}`);
  }
  return value.trim();
};

const readOptionalFormString = (body: unknown, key: string): string | undefined => {
  const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const readOptionalFormNumber = (body: unknown, key: string): number | undefined => {
  const value = readOptionalFormString(body, key);
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer`);
  }
  return parsed;
};

const readOptionalFormBoolean = (body: unknown, key: string): boolean => {
  const value = readOptionalFormString(body, key);
  return value === 'true' || value === '1' || value === 'yes';
};

const readChartKind = (body: unknown): Extract<ChartKind, 'raster' | 'vector'> => {
  const value = readFormString(body, 'kind');
  if (value !== 'raster' && value !== 'vector') {
    throw new Error('kind must be raster or vector');
  }
  return value;
};
