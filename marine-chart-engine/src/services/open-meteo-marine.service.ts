import fs from 'node:fs/promises';
import path from 'node:path';
import type { BoundingBox } from '../marine-environment/domain/marine-field.js';

const FRESH_MS = 30 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const TARGET_SPACING_DEGREES = 0.08;
const MIN_AXIS_POINTS = 4;
const MAX_AXIS_POINTS = 20;
const MAX_GRID_POINTS = 240;
const UPSTREAM_BATCH_SIZE = 50;

interface OpenMeteoMarineLocation {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  hourly?: {
    time?: string[];
    wave_height?: Array<number | null>;
    wave_direction?: Array<number | null>;
    wave_period?: Array<number | null>;
    wind_wave_height?: Array<number | null>;
    wind_wave_direction?: Array<number | null>;
    wind_wave_period?: Array<number | null>;
    swell_wave_height?: Array<number | null>;
    swell_wave_direction?: Array<number | null>;
    swell_wave_period?: Array<number | null>;
    swell_wave_peak_period?: Array<number | null>;
    ocean_current_velocity?: Array<number | null>;
    ocean_current_direction?: Array<number | null>;
    sea_surface_temperature?: Array<number | null>;
  };
}

export interface OpenMeteoMarineSample {
  longitude: number;
  latitude: number;
  modelLongitude: number | null;
  modelLatitude: number | null;
  validTime: string;
  waveHeight: number | null;
  waveDirectionFrom: number | null;
  wavePeriod: number | null;
  windWaveHeight: number | null;
  windWaveDirectionFrom: number | null;
  windWavePeriod: number | null;
  swellWaveHeight: number | null;
  swellWaveDirectionFrom: number | null;
  swellWavePeriod: number | null;
  swellWavePeakPeriod: number | null;
  currentVelocityKmh: number | null;
  currentDirectionTo: number | null;
  seaSurfaceTemperature: number | null;
}

export interface OpenMeteoMarineField {
  state: 'fresh' | 'cached' | 'stale';
  fetchedAt: string;
  validTime: string;
  bounds: BoundingBox;
  samples: OpenMeteoMarineSample[];
  attribution: string;
}

interface CachedMarineField extends Omit<OpenMeteoMarineField, 'state' | 'attribution'> {}
type FetchLike = typeof fetch;

export class OpenMeteoMarineService {
  private readonly inflight = new Map<string, Promise<OpenMeteoMarineField>>();

  constructor(
    private readonly cacheDir: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly now: () => number = Date.now,
    private readonly onWrite: () => void = () => {},
  ) {}

  async getField(bounds: BoundingBox, requestedTime: string): Promise<OpenMeteoMarineField> {
    const normalizedBounds = normalizeBounds(bounds);
    const validTime = normalizeHour(requestedTime);
    const cacheKey = `${boundsKey(normalizedBounds)}-${validTime.replaceAll(':', '-')}`;
    const cached = await this.readCache(cacheKey);
    const ageMs = cached ? Math.max(0, this.now() - Date.parse(cached.fetchedAt)) : Number.POSITIVE_INFINITY;
    if (cached && ageMs < FRESH_MS) return response(cached, 'cached');
    const pending = this.inflight.get(cacheKey);
    if (pending) return pending;
    const request = this.fetchAndCache(normalizedBounds, validTime, cacheKey)
      .catch((error: unknown) => {
        if (cached && ageMs <= STALE_MS) return response(cached, 'stale');
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Open-Meteo marine field unavailable: ${reason}`);
      })
      .finally(() => this.inflight.delete(cacheKey));
    this.inflight.set(cacheKey, request);
    return request;
  }

  private async fetchAndCache(
    bounds: BoundingBox,
    validTime: string,
    cacheKey: string,
  ): Promise<OpenMeteoMarineField> {
    const points = gridPoints(bounds);
    const samples: OpenMeteoMarineSample[] = [];
    for (let offset = 0; offset < points.length; offset += UPSTREAM_BATCH_SIZE) {
      const batch = points.slice(offset, offset + UPSTREAM_BATCH_SIZE);
      const url = new URL('https://marine-api.open-meteo.com/v1/marine');
      url.searchParams.set('latitude', batch.map((point) => point[1].toFixed(4)).join(','));
      url.searchParams.set('longitude', batch.map((point) => point[0].toFixed(4)).join(','));
      url.searchParams.set(
        'hourly',
        'wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,swell_wave_peak_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature',
      );
      url.searchParams.set('start_hour', validTime.slice(0, 16));
      url.searchParams.set('end_hour', validTime.slice(0, 16));
      url.searchParams.set('timezone', 'UTC');
      url.searchParams.set('cell_selection', 'nearest');
      const upstream = await this.fetcher(url);
      if (!upstream.ok) throw new Error(`Open-Meteo returned ${upstream.status}`);
      const payload = await upstream.json() as OpenMeteoMarineLocation | OpenMeteoMarineLocation[];
      const locations = Array.isArray(payload) ? payload : [payload];
      for (let index = 0; index < batch.length; index++) {
        const point = batch[index];
        const location = locations[index];
        if (!point || !location || !isSeaLocation(location)) continue;
        const hourly = location.hourly;
        const sample: OpenMeteoMarineSample = {
          longitude: point[0],
          latitude: point[1],
          modelLongitude: finite(location.longitude),
          modelLatitude: finite(location.latitude),
          validTime: hourly?.time?.[0] ? `${hourly.time[0]}:00Z` : validTime,
          waveHeight: finite(hourly?.wave_height?.[0]),
          waveDirectionFrom: finite(hourly?.wave_direction?.[0]),
          wavePeriod: finite(hourly?.wave_period?.[0]),
          windWaveHeight: finite(hourly?.wind_wave_height?.[0]),
          windWaveDirectionFrom: finite(hourly?.wind_wave_direction?.[0]),
          windWavePeriod: finite(hourly?.wind_wave_period?.[0]),
          swellWaveHeight: finite(hourly?.swell_wave_height?.[0]),
          swellWaveDirectionFrom: finite(hourly?.swell_wave_direction?.[0]),
          swellWavePeriod: finite(hourly?.swell_wave_period?.[0]),
          swellWavePeakPeriod: finite(hourly?.swell_wave_peak_period?.[0]),
          currentVelocityKmh: finite(hourly?.ocean_current_velocity?.[0]),
          currentDirectionTo: finite(hourly?.ocean_current_direction?.[0]),
          seaSurfaceTemperature: finite(hourly?.sea_surface_temperature?.[0]),
        };
        if (hasMarineValue(sample)) samples.push(sample);
      }
    }
    if (samples.length === 0) throw new Error('no usable sea samples in the selected area');
    const cached: CachedMarineField = {
      fetchedAt: new Date(this.now()).toISOString(),
      validTime,
      bounds,
      samples,
    };
    await fs.mkdir(this.cacheDir, { recursive: true });
    const target = path.join(this.cacheDir, `marine-field-${cacheKey}.json`);
    const temporary = `${target}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(cached), 'utf8');
    await fs.rename(temporary, target);
    this.onWrite();
    return response(cached, 'fresh');
  }

  private async readCache(cacheKey: string): Promise<CachedMarineField | null> {
    try {
      const parsed = JSON.parse(
        await fs.readFile(path.join(this.cacheDir, `marine-field-${cacheKey}.json`), 'utf8'),
      ) as CachedMarineField;
      return parsed?.fetchedAt && Array.isArray(parsed.samples) ? parsed : null;
    } catch {
      return null;
    }
  }
}

const normalizeHour = (value: string): string => {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) throw new Error('marine field time must be ISO 8601');
  instant.setUTCMinutes(0, 0, 0);
  return instant.toISOString();
};

const normalizeBounds = (bounds: BoundingBox): BoundingBox => {
  const [west, south, east, north] = bounds;
  if (![west, south, east, north].every(Number.isFinite)
    || west < -180 || east > 180 || south < -90 || north > 90
    || west >= east || south >= north || east - west > 12 || north - south > 12) {
    throw new Error('marine field bounds are invalid or exceed 12 degrees per axis');
  }
  return bounds.map((value) => Number(value.toFixed(4))) as BoundingBox;
};

const gridPoints = ([west, south, east, north]: BoundingBox): Array<[number, number]> => {
  let columns = axisPointCount(east - west);
  let rows = axisPointCount(north - south);
  if (columns * rows > MAX_GRID_POINTS) {
    const scale = Math.sqrt(MAX_GRID_POINTS / (columns * rows));
    columns = Math.max(MIN_AXIS_POINTS, Math.floor(columns * scale));
    rows = Math.max(MIN_AXIS_POINTS, Math.floor(rows * scale));
  }
  return Array.from({ length: rows * columns }, (_, index): [number, number] => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return [
      west + (east - west) * column / (columns - 1),
      south + (north - south) * row / (rows - 1),
    ];
  });
};

const axisPointCount = (span: number): number =>
  Math.max(MIN_AXIS_POINTS, Math.min(MAX_AXIS_POINTS, Math.ceil(span / TARGET_SPACING_DEGREES) + 1));

const boundsKey = (bounds: BoundingBox): string =>
  bounds.map((value) => value.toFixed(4).replace('-', 'm').replace('.', '_')).join('-');

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const isSeaLocation = (location: OpenMeteoMarineLocation): boolean =>
  finite(location.elevation) === 0;

const hasMarineValue = (sample: OpenMeteoMarineSample): boolean =>
  sample.waveHeight !== null
  || sample.currentVelocityKmh !== null
  || sample.seaSurfaceTemperature !== null;

const response = (cached: CachedMarineField, state: OpenMeteoMarineField['state']): OpenMeteoMarineField => ({
  ...cached,
  state,
  attribution: 'Open-Meteo marine forecast; upstream Météo-France, DWD and ECMWF models',
});
