import { Router, type Response } from 'express';
import type { MarineEnvironmentEngine } from '../marine-environment/application/marine-environment-engine.js';
import { MarineProviderError } from '../marine-environment/application/marine-provider.js';
import type {
  BoundingBox,
  MarineFieldRequest,
  MarineVariable,
} from '../marine-environment/domain/marine-field.js';
import type { OpenMeteoMarineService } from '../services/open-meteo-marine.service.js';
import { filterFeatureCollection, parseAreaPolygon } from '../services/geojson-area-filter.js';
import { parseChartIds, type MarineGeometryService } from '../services/marine-geometry.service.js';

const VARIABLES = ['wind', 'waves', 'currents'] as const;
const VIGO_BOUNDS: BoundingBox = [-9.05, 42.05, -8.4, 42.4];

export const createMarineEnvironmentRouter = (
  engine: MarineEnvironmentEngine,
  marineGeometry: MarineGeometryService,
  openMeteoMarine: OpenMeteoMarineService,
): Router => {
  const router = Router();

  router.get('/coastal-mask.geojson', async (req, res) => {
    try {
      const requestedBounds = optionalBounds(req.query) ?? [...VIGO_BOUNDS];
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.type('application/geo+json').json(marineGeometry.marineMask(
        requestedBounds,
        req.query['area'],
        parseChartIds(req.query['chartIds']),
      ));
    } catch (error) {
      res.status(503).json({
        error: 'MASK_UNAVAILABLE',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get('/providers', (_req, res) => {
    res.json({
      providers: engine.providers(),
      policy: 'best-available-coastal-data',
      physicalDataSeparatedFromRenderGrid: true,
    });
  });

  router.get('/debug/source-grid.geojson', async (req, res) => {
    const variable = typeof req.query['variable'] === 'string' && VARIABLES.includes(req.query['variable'] as MarineVariable)
      ? req.query['variable'] as MarineVariable
      : 'wind';
    try {
      const response = await engine.getField(parseFieldRequest(variable, req.query));
      const grid = response.field.dataGrid;
      const features = Array.from({ length: grid.nodeCount }, (_, index) => {
        const coordinates = grid.kind === 'points'
          ? [grid.longitude[index], grid.latitude[index]]
          : [
              grid.origin[0] + (index % grid.width) * grid.spacing[0],
              grid.origin[1] + Math.floor(index / grid.width) * grid.spacing[1],
            ];
        const values = Object.fromEntries(
          Object.entries(grid.components).map(([name, component]) => [name, component[index] ?? null]),
        );
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates },
          properties: {
            featureType: 'sourceNode',
            variable,
            nodeIndex: index,
            provider: response.field.metadata.provider,
            validTime: response.field.metadata.validTime,
            sourceResolution: response.field.metadata.sourceResolution.label,
            ...values,
          },
        };
      });
      res.type('application/geo+json').json({
        type: 'FeatureCollection',
        features,
        properties: {
          metadata: response.field.metadata,
          decision: response.decision,
          dataGrid: { kind: grid.kind, nodeCount: grid.nodeCount },
          renderGrid: null,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/waves.geojson', async (req, res) => {
    try {
      const request = parseFieldRequest('waves', req.query);
      const response = await engine.getField(request);
      const grid = response.field.dataGrid;
      const nodes = Array.from({ length: grid.nodeCount }, (_, index) => {
        const coordinates: [number, number] = grid.kind === 'points'
          ? [grid.longitude[index]!, grid.latitude[index]!]
          : [
              grid.origin[0] + (index % grid.width) * grid.spacing[0],
              grid.origin[1] + Math.floor(index / grid.width) * grid.spacing[1],
            ];
        return { index, coordinates };
      });
      const longitudeStep = coordinateStep(nodes.map((node) => node.coordinates[0]), request.bbox[2] - request.bbox[0]);
      const latitudeStep = coordinateStep(nodes.map((node) => node.coordinates[1]), request.bbox[3] - request.bbox[1]);
      const mask = marineGeometry.marineMask(
        request.bbox,
        req.query['area'],
        parseChartIds(req.query['chartIds']),
      );
      const features = nodes.flatMap(({ index, coordinates }) => {
        const heightMeters = grid.components['significantHeight']?.[index] ?? null;
        const directionDeg = grid.components['directionFrom']?.[index] ?? null;
        if (!Number.isFinite(heightMeters) || !Number.isFinite(directionDeg)) return [];
        const sampleId = `wave-${index}`;
        const properties = {
          sampleId,
          heightMeters,
          directionDeg,
          periodSeconds: grid.components['meanPeriod']?.[index] ?? null,
          windSeaHeight: grid.components['windSeaHeight']?.[index] ?? null,
          windSeaDirectionFrom: grid.components['windSeaDirectionFrom']?.[index] ?? null,
          windSeaPeriod: grid.components['windSeaPeriod']?.[index] ?? null,
          primarySwellHeight: grid.components['primarySwellHeight']?.[index] ?? null,
          primarySwellDirectionFrom: grid.components['primarySwellDirectionFrom']?.[index] ?? null,
          primarySwellPeriod: grid.components['primarySwellPeriod']?.[index] ?? null,
          primarySwellPeakPeriod: grid.components['primarySwellPeakPeriod']?.[index] ?? null,
          provider: response.field.metadata.provider,
          model: response.field.metadata.model,
          validTime: response.field.metadata.validTime,
          interpolated: response.field.metadata.isInterpolated,
          nearestSourceDistanceKm: 0,
          sourceResolutionMeters: response.field.metadata.sourceResolution.approximateMeters,
        };
        const halfLon = longitudeStep / 2;
        const halfLat = latitudeStep / 2;
        const west = Math.max(request.bbox[0], coordinates[0] - halfLon);
        const east = Math.min(request.bbox[2], coordinates[0] + halfLon);
        const south = Math.max(request.bbox[1], coordinates[1] - halfLat);
        const north = Math.min(request.bbox[3], coordinates[1] + halfLat);
        const clipped = marineGeometry.clipCellToMask(
          [[west, south], [east, south], [east, north], [west, north], [west, south]],
          mask,
        );
        if (!clipped) return [];
        const includeSymbol = clipped.waterFraction >= 0.18;
        return [
          {
            type: 'Feature' as const,
            id: `${sampleId}-cell`,
            geometry: clipped.geometry,
            properties: { ...properties, featureType: 'cell', waterFraction: clipped.waterFraction },
          },
          ...(includeSymbol ? [{
            type: 'Feature' as const,
            id: `${sampleId}-symbol`,
            geometry: { type: 'Point' as const, coordinates: clipped.anchor },
            properties: { ...properties, featureType: 'waveSymbol', waterFraction: clipped.waterFraction },
          }] : []),
        ];
      });
      const body = filterFeatureCollection(
        { type: 'FeatureCollection' as const, features },
        parseAreaPolygon(req.query['area']),
      );
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.type('application/geo+json').json({
        ...body,
        properties: {
          metadata: response.field.metadata,
          decision: response.decision,
          marineMask: mask.properties,
          sourceResolution: response.field.metadata.sourceResolution,
          renderSpacing: response.field.metadata.sourceResolution,
          interpolation: response.field.dataGrid.kind === 'regular'
            ? 'bilinear-source-grid'
            : 'nearest-source-nodes',
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/sea-temperature.geojson', async (req, res) => {
    try {
      const bounds = parseBounds(req.query);
      const field = await openMeteoMarine.getField(bounds, validTime(req.query['time']));
      const features = field.samples
        .filter((sample) => sample.seaSurfaceTemperature !== null)
        .map((sample) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [sample.longitude, sample.latitude] as [number, number],
          },
          properties: {
            featureType: 'marineSample',
            value: sample.seaSurfaceTemperature,
            validTime: sample.validTime,
            provider: 'Open-Meteo',
          },
        }));
      const body = filterFeatureCollection(
        { type: 'FeatureCollection' as const, features },
        parseAreaPolygon(req.query['area']),
      );
      const mask = marineGeometry.marineMask(
        bounds,
        req.query['area'],
        parseChartIds(req.query['chartIds']),
      );
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.type('application/geo+json').json({
        ...body,
        features: marineGeometry.filterPointsToMask(body.features, mask),
        properties: {
          state: field.state,
          fetchedAt: field.fetchedAt,
          validTime: field.validTime,
          attribution: field.attribution,
          marineMask: mask.properties,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  for (const variable of VARIABLES) {
    router.get(`/${variable}`, async (req, res) => {
      try {
        const response = await engine.getField(parseFieldRequest(variable, req.query));
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.json(response);
      } catch (error) {
        sendError(res, error);
      }
    });
  }

  router.get('/point', async (req, res) => {
    const latitude = Number(req.query['lat'] ?? req.query['latitude']);
    const longitude = Number(req.query['lon'] ?? req.query['longitude']);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      res.status(400).json({ error: 'INVALID_POSITION', message: 'lat/lon must be valid WGS84 coordinates' });
      return;
    }
    const halfSpan = 0.12;
    const bbox: BoundingBox = [
      Math.max(-180, longitude - halfSpan),
      Math.max(-90, latitude - halfSpan),
      Math.min(180, longitude + halfSpan),
      Math.min(90, latitude + halfSpan),
    ];
    const time = validTime(req.query['time']);
    const source = typeof req.query['source'] === 'string' ? req.query['source'] : 'auto';
    const results = await Promise.allSettled(VARIABLES.map(async (variable) => {
      const response = await engine.getField({
        variable,
        bbox,
        time,
        source,
        currentConditions: isCurrentConditions(time),
      });
      return { sample: engine.sample(response.field, latitude, longitude), decision: response.decision };
    }));
    const body = Object.fromEntries(results.map((result, index) => [
      VARIABLES[index],
      result.status === 'fulfilled'
        ? result.value
        : { unavailable: true, message: result.reason instanceof Error ? result.reason.message : String(result.reason) },
    ]));
    res.json({ position: { latitude, longitude }, time, ...body });
  });

  return router;
};

const coordinateStep = (values: number[], fallbackSpan: number): number => {
  const unique = [...new Set(values.map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b);
  const steps = unique.slice(1).map((value, index) => value - unique[index]!).filter((value) => value > 0);
  return steps.length > 0 ? Math.min(...steps) : Math.max(0.01, fallbackSpan / 4);
};

const parseFieldRequest = (
  variable: MarineVariable,
  query: Record<string, unknown>,
): MarineFieldRequest => {
  const bbox = parseBounds(query);
  const time = validTime(query['time']);
  return {
    variable,
    bbox,
    time,
    source: typeof query['source'] === 'string' ? query['source'] : 'auto',
    currentConditions: isCurrentConditions(time),
  };
};

const parseBounds = (query: Record<string, unknown>): BoundingBox => {
  const packed = typeof query['bbox'] === 'string' ? query['bbox'].split(',').map(Number) : null;
  const values = packed?.length === 4 ? packed : [
    Number(query['west']),
    Number(query['south']),
    Number(query['east']),
    Number(query['north']),
  ];
  if (values.every(Number.isNaN)) return [...VIGO_BOUNDS];
  const [west, south, east, north] = values;
  if (![west, south, east, north].every(Number.isFinite)
    || west! < -180 || east! > 180 || south! < -90 || north! > 90
    || west! >= east! || south! >= north!
    || east! - west! > 12 || north! - south! > 12) {
    throw new MarineProviderError('INVALID_DATA', 'bbox must be ordered WGS84 west,south,east,north and at most 12 degrees per axis');
  }
  return [west!, south!, east!, north!];
};

const optionalBounds = (query: Record<string, unknown>): BoundingBox | null => {
  const hasBounds = typeof query['bbox'] === 'string'
    || ['west', 'south', 'east', 'north'].some((key) => query[key] !== undefined);
  return hasBounds ? parseBounds(query) : null;
};

const boundsIntersect = (left: BoundingBox, right: BoundingBox): boolean =>
  left[0] <= right[2] && left[2] >= right[0] && left[1] <= right[3] && left[3] >= right[1];

const validTime = (value: unknown): string => {
  const time = typeof value === 'string' ? value : new Date().toISOString();
  if (!Number.isFinite(Date.parse(time))) throw new MarineProviderError('INVALID_DATA', 'time must be ISO 8601');
  return new Date(time).toISOString();
};

const isCurrentConditions = (time: string): boolean =>
  Math.abs(Date.parse(time) - Date.now()) <= 90 * 60_000;

const sendError = (res: Response, error: unknown): void => {
  if (error instanceof MarineProviderError) {
    const status = error.code === 'INVALID_DATA'
      ? 400
      : error.code === 'AUTH'
        ? 401
        : error.code === 'NO_COVERAGE'
          ? 422
          : 503;
    res.status(status).json({ error: error.code, message: error.message });
    return;
  }
  res.status(500).json({ error: 'INTERNAL', message: error instanceof Error ? error.message : String(error) });
};
