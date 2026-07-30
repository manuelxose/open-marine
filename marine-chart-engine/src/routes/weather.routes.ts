import { Router } from 'express';
import type { WeatherForecastService } from '../services/weather-forecast.service.js';
import type { WindFieldService } from '../services/wind-field.service.js';
import { filterFeatureCollection, parseAreaPolygon } from '../services/geojson-area-filter.js';
import { parseChartIds, type MarineGeometryService } from '../services/marine-geometry.service.js';

export const createWeatherRouter = (
  weather: WeatherForecastService,
  windField: WindFieldService,
  marineGeometry: MarineGeometryService,
): Router => {
  const router = Router();

  router.get('/wind-field.geojson', async (req, res, next) => {
    try {
      const bbox = typeof req.query['bbox'] === 'string'
        ? req.query['bbox'].split(',').map(Number)
        : null;
      if (bbox && (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value)))) {
        res.status(400).json({ error: 'invalid_bbox', message: 'bbox must be west,south,east,north.' });
        return;
      }
      if (bbox) {
        const [west, south, east, north] = bbox as [number, number, number, number];
        if (
          west < -180 || east > 180 || south < -90 || north > 90
          || west >= east || south >= north || east - west > 12 || north - south > 12
        ) {
          res.status(400).json({
            error: 'invalid_bbox',
            message: 'bbox must be ordered, within world bounds and smaller than 12 degrees per axis.',
          });
          return;
        }
      }
      const field = await windField.getField(
        req.query['refresh'] === '1',
        bbox ? [bbox[0]!, bbox[1]!, bbox[2]!, bbox[3]!] : undefined,
      );
      const area = parseAreaPolygon(req.query['area']);
      const bounded = filterFeatureCollection(field, area);
      const effectiveBounds = field.properties.bounds;
      const mask = marineGeometry.marineMask(
        effectiveBounds,
        req.query['area'],
        parseChartIds(req.query['chartIds']),
      );
      res.type('application/geo+json').json(
        {
          ...bounded,
          features: marineGeometry.filterPointsToMask(bounded.features, mask),
          properties: {
            ...bounded.properties,
            marineMask: mask.properties,
            sourceResolution: bounded.properties.grid.approximateSpacingKm,
            renderSpacing: bounded.properties.grid.approximateSpacingKm,
            interpolation: 'none',
          },
        },
      );
    } catch (error) {
      next(error);
    }
  });

  router.get('/forecast', async (req, res, next) => {
    const latitude = Number(req.query['latitude']);
    const longitude = Number(req.query['longitude']);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      res.status(400).json({ error: 'invalid_latitude', message: 'latitude must be between -90 and 90.' });
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      res.status(400).json({ error: 'invalid_longitude', message: 'longitude must be between -180 and 180.' });
      return;
    }

    try {
      res.json(await weather.getForecast(latitude, longitude, req.query['refresh'] === '1'));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
