import fs from 'node:fs/promises';
import path from 'node:path';

const FRESH_MS = 15 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const RIA_VIGO_BOUNDS = [-9.05, 42.05, -8.4, 42.4] as const;
const TARGET_SPACING_DEGREES = 0.025;
const MIN_AXIS_POINTS = 5;
const MAX_AXIS_POINTS = 28;
const MAX_GRID_POINTS = 480;
const UPSTREAM_BATCH_SIZE = 50;

export type WindFieldBounds = [west: number, south: number, east: number, north: number];

interface OpenMeteoWindLocation {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
}

export interface WindFieldFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: {
      featureType: 'windDirection';
      speedKnots: number;
      gustKnots: number | null;
      directionDeg: number;
      flowDirectionDeg: number;
      validTime: string | null;
      modelLatitude: number | null;
      modelLongitude: number | null;
      nearestSourceDistanceKm: number;
      interpolation: 'none';
    };
  }>;
  properties: {
    state: 'fresh' | 'cached' | 'stale';
    fetchedAt: string;
    attribution: string;
    bounds: WindFieldBounds;
    grid: { columns: number; rows: number; pointCount: number; approximateSpacingKm: number };
  };
}

interface CachedWindField {
  fetchedAt: string;
  bounds: WindFieldBounds;
  grid: WindFieldFeatureCollection['properties']['grid'];
  field: Omit<WindFieldFeatureCollection, 'properties'>;
}

type FetchLike = typeof fetch;

export class WindFieldService {
  private readonly inflight = new Map<string, Promise<WindFieldFeatureCollection>>();

  constructor(
    private readonly cacheDir: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly now: () => number = Date.now,
    private readonly onWrite: () => void = () => {},
  ) {}

  async getField(refresh = false, requestedBounds: WindFieldBounds = [...RIA_VIGO_BOUNDS]): Promise<WindFieldFeatureCollection> {
    const bounds = this.normalizeBounds(requestedBounds);
    const cacheKey = this.boundsKey(bounds);
    const cached = await this.readCache(cacheKey);
    const ageMs = cached ? Math.max(0, this.now() - Date.parse(cached.fetchedAt)) : Number.POSITIVE_INFINITY;
    if (!refresh && cached && ageMs < FRESH_MS) return this.toResponse(cached, 'cached');
    const pending = this.inflight.get(cacheKey);
    if (pending) return pending;

    const request = this.fetchAndCache(bounds, cacheKey)
      .catch((error: unknown) => {
        if (cached && ageMs <= STALE_MS) return this.toResponse(cached, 'stale');
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Wind field upstream unavailable: ${reason}`);
      })
      .finally(() => { this.inflight.delete(cacheKey); });
    this.inflight.set(cacheKey, request);
    return request;
  }

  private async fetchAndCache(bounds: WindFieldBounds, cacheKey: string): Promise<WindFieldFeatureCollection> {
    const { points, columns, rows, approximateSpacingKm } = this.gridPoints(bounds);
    const samples: Array<{ point: [number, number]; location: OpenMeteoWindLocation }> = [];
    for (let offset = 0; offset < points.length; offset += UPSTREAM_BATCH_SIZE) {
      const batch = points.slice(offset, offset + UPSTREAM_BATCH_SIZE);
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', batch.map((point) => point[1].toFixed(4)).join(','));
      url.searchParams.set('longitude', batch.map((point) => point[0].toFixed(4)).join(','));
      url.searchParams.set('current', 'wind_speed_10m,wind_direction_10m,wind_gusts_10m');
      url.searchParams.set('wind_speed_unit', 'kn');
      url.searchParams.set('cell_selection', 'sea');
      url.searchParams.set('forecast_days', '1');
      url.searchParams.set('timezone', 'UTC');
      const upstream = await this.fetcher(url);
      if (!upstream.ok) throw new Error(`Open-Meteo returned ${upstream.status}`);
      const payload = await upstream.json() as OpenMeteoWindLocation | OpenMeteoWindLocation[];
      const locations = Array.isArray(payload) ? payload : [payload];
      for (let index = 0; index < batch.length; index++) {
        const point = batch[index];
        const location = locations[index];
        if (point && location) samples.push({ point, location });
      }
    }
    const features: WindFieldFeatureCollection['features'] = [];
    const seen = new Set<string>();
    for (const { point, location } of samples) {
      const [longitude, latitude] = point;
      const speed = location.current?.wind_speed_10m;
      const direction = location.current?.wind_direction_10m;
      if (![latitude, longitude, speed, direction].every(Number.isFinite)) continue;
      const key = `${latitude!.toFixed(3)},${longitude!.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [longitude!, latitude!] },
        properties: {
          featureType: 'windDirection',
          speedKnots: speed!,
          gustKnots: Number.isFinite(location.current?.wind_gusts_10m)
            ? location.current!.wind_gusts_10m!
            : null,
          directionDeg: direction!,
          flowDirectionDeg: (direction! + 180) % 360,
          validTime: location.current?.time ?? null,
          modelLatitude: Number.isFinite(location.latitude) ? location.latitude! : null,
          modelLongitude: Number.isFinite(location.longitude) ? location.longitude! : null,
          nearestSourceDistanceKm: 0,
          interpolation: 'none',
        },
      });
    }
    if (features.length === 0) throw new Error('Open-Meteo returned no usable wind vectors');

    const cached: CachedWindField = {
      fetchedAt: new Date(this.now()).toISOString(),
      bounds,
      grid: { columns, rows, pointCount: features.length, approximateSpacingKm },
      field: { type: 'FeatureCollection', features },
    };
    await fs.mkdir(this.cacheDir, { recursive: true });
    const target = this.cachePath(cacheKey);
    const temporary = `${target}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(cached), 'utf8');
    await fs.rename(temporary, target);
    this.onWrite();
    return this.toResponse(cached, 'fresh');
  }

  private gridPoints(bounds: WindFieldBounds): {
    points: Array<[number, number]>;
    columns: number;
    rows: number;
    approximateSpacingKm: number;
  } {
    const [west, south, east, north] = bounds;
    let columns = this.axisPointCount(east - west);
    let rows = this.axisPointCount(north - south);
    if (columns * rows > MAX_GRID_POINTS) {
      const scale = Math.sqrt(MAX_GRID_POINTS / (columns * rows));
      columns = Math.max(MIN_AXIS_POINTS, Math.floor(columns * scale));
      rows = Math.max(MIN_AXIS_POINTS, Math.floor(rows * scale));
    }
    const points = Array.from({ length: rows * columns }, (_, index): [number, number] => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return [
        west + (east - west) * column / (columns - 1),
        south + (north - south) * row / (rows - 1),
      ];
    });
    const latitude = (south + north) / 2;
    const lonSpacingKm = (east - west) * 111.32 * Math.cos(latitude * Math.PI / 180) / (columns - 1);
    const latSpacingKm = (north - south) * 111.32 / (rows - 1);
    return {
      points,
      columns,
      rows,
      approximateSpacingKm: Number(Math.max(lonSpacingKm, latSpacingKm).toFixed(1)),
    };
  }

  private axisPointCount(span: number): number {
    return Math.max(MIN_AXIS_POINTS, Math.min(MAX_AXIS_POINTS, Math.ceil(span / TARGET_SPACING_DEGREES) + 1));
  }

  private normalizeBounds(bounds: WindFieldBounds): WindFieldBounds {
    const [west, south, east, north] = bounds;
    if (![west, south, east, north].every(Number.isFinite)) throw new Error('Wind field bounds must contain finite coordinates');
    if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
      throw new Error('Wind field bounds are invalid');
    }
    if (east - west > 12 || north - south > 12) {
      throw new Error('Wind field area is too large; select a region smaller than 12 degrees per axis');
    }
    return bounds.map((value) => Number(value.toFixed(4))) as WindFieldBounds;
  }

  private boundsKey(bounds: WindFieldBounds): string {
    return bounds.map((value) => value.toFixed(4).replace('-', 'm').replace('.', '_')).join('-');
  }

  private async readCache(cacheKey: string): Promise<CachedWindField | null> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.cachePath(cacheKey), 'utf8')) as CachedWindField;
      return parsed?.fetchedAt && parsed.field?.type === 'FeatureCollection' && Array.isArray(parsed.bounds) ? parsed : null;
    } catch {
      return null;
    }
  }

  private cachePath(cacheKey: string): string {
    return path.join(this.cacheDir, `wind-field-${cacheKey}.json`);
  }

  private toResponse(cached: CachedWindField, state: WindFieldFeatureCollection['properties']['state']): WindFieldFeatureCollection {
    return {
      ...cached.field,
      properties: {
        state,
        fetchedAt: cached.fetchedAt,
        attribution: 'Open-Meteo weather forecast',
        bounds: cached.bounds,
        grid: cached.grid,
      },
    };
  }
}
