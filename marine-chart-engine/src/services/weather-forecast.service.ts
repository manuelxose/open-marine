import fs from 'node:fs/promises';
import path from 'node:path';

const FRESH_MS = 15 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

export type WeatherForecastState = 'fresh' | 'cached' | 'stale';

export interface WeatherForecastResponse {
  state: WeatherForecastState;
  fetchedAt: string;
  ageSeconds: number;
  location: { latitude: number; longitude: number };
  data: unknown;
}

interface CachedForecast {
  fetchedAt: string;
  location: { latitude: number; longitude: number };
  data: unknown;
}

type FetchLike = typeof fetch;

export class WeatherForecastService {
  private readonly inflight = new Map<string, Promise<WeatherForecastResponse>>();

  constructor(
    private readonly cacheDir: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly now: () => number = Date.now,
    private readonly onWrite: () => void = () => {},
  ) {}

  async getForecast(latitude: number, longitude: number, refresh = false): Promise<WeatherForecastResponse> {
    const location = {
      latitude: Math.round(latitude * 100) / 100,
      longitude: Math.round(longitude * 100) / 100,
    };
    const key = `${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
    const cached = await this.readCache(key);
    const ageMs = cached ? Math.max(0, this.now() - Date.parse(cached.fetchedAt)) : Number.POSITIVE_INFINITY;

    if (!refresh && cached && ageMs < FRESH_MS) {
      return this.toResponse(cached, 'cached');
    }

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const request = this.fetchAndCache(key, location)
      .catch((error: unknown) => {
        if (cached && ageMs <= STALE_MS) {
          return this.toResponse(cached, 'stale');
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Weather upstream unavailable: ${reason}`);
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, request);
    return request;
  }

  private async fetchAndCache(
    key: string,
    location: { latitude: number; longitude: number },
  ): Promise<WeatherForecastResponse> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m');
    url.searchParams.set('hourly', 'temperature_2m,pressure_msl,precipitation_probability,weather_code,is_day');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('forecast_hours', '168');
    url.searchParams.set('past_hours', '12');
    url.searchParams.set('wind_speed_unit', 'kn');
    url.searchParams.set('timezone', 'auto');

    const upstream = await this.fetcher(url);
    if (!upstream.ok) {
      throw new Error(`Open-Meteo returned ${upstream.status}`);
    }
    const cached: CachedForecast = {
      fetchedAt: new Date(this.now()).toISOString(),
      location,
      data: await upstream.json(),
    };
    await fs.mkdir(this.cacheDir, { recursive: true });
    const target = this.cachePath(key);
    const temporary = `${target}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(cached), 'utf8');
    await fs.rename(temporary, target);
    this.onWrite();
    return this.toResponse(cached, 'fresh');
  }

  private async readCache(key: string): Promise<CachedForecast | null> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.cachePath(key), 'utf8')) as CachedForecast;
      if (!parsed?.fetchedAt || !parsed.location || parsed.data === undefined) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private cachePath(key: string): string {
    return path.join(this.cacheDir, `forecast-${key}.json`);
  }

  private toResponse(cached: CachedForecast, state: WeatherForecastState): WeatherForecastResponse {
    return {
      state,
      fetchedAt: cached.fetchedAt,
      ageSeconds: Math.max(0, Math.floor((this.now() - Date.parse(cached.fetchedAt)) / 1000)),
      location: cached.location,
      data: cached.data,
    };
  }
}
