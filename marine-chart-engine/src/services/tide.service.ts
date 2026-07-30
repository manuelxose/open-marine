import fs from 'node:fs/promises';
import path from 'node:path';
import type { TideDay, TideEvent } from '../types/environment.types.js';

const IHM_TIDE_URL = 'https://ideihm.covam.es/api-ihm/getmarea';
const METEOGALICIA_TIDE_URL =
  'https://servizos.meteogalicia.gal/mgrss/predicion/rssMareas.action';
const VIGO_PORT_ID = 29 as const;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type FetchLike = typeof fetch;

export class TideService {
  constructor(
    private readonly cacheDir: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly onWrite: () => void = () => {},
  ) {}

  async getVigo(date: string): Promise<TideDay> {
    assertIsoDate(date);
    const cacheFile = path.join(this.cacheDir, 'tides', `vigo-${date}.json`);
    const cached = await this.readCache(cacheFile);
    const cacheAge = cached ? Date.now() - Date.parse(cached.fetchedAt) : Number.POSITIVE_INFINITY;
    if (cached && cacheAge <= CACHE_TTL_MS) {
      return withAge(cached, 'cached');
    }

    try {
      const fresh = await this.fetchFresh(date);
      const result: TideDay = {
        ...fresh.day,
        timezone: 'Europe/Madrid',
        state: 'forecast',
        fetchedAt: new Date().toISOString(),
        ageSeconds: 0,
        attribution: fresh.attribution,
      };
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
      this.onWrite();
      return result;
    } catch (error) {
      if (cached) {
        return withAge(cached, 'stale');
      }
      throw error;
    }
  }

  private async fetchFresh(
    date: string,
  ): Promise<{ day: Pick<TideDay, 'portId' | 'port' | 'latitude' | 'longitude' | 'date' | 'events'>; attribution: string }> {
    const headers = { 'User-Agent': 'OpenMarine-ChartEngine/0.1.0' };
    let ihmError = 'unknown error';
    try {
      const compactDate = date.replaceAll('-', '');
      const response = await this.fetchImpl(
        `${IHM_TIDE_URL}?request=gettide&id=${VIGO_PORT_ID}&date=${compactDate}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(`IHM tide API returned ${response.status}`);
      }
      return {
        day: parseIhmTideResponse(await response.text()),
        attribution: 'Instituto Hidrografico de la Marina (IHM)',
      };
    } catch (error) {
      ihmError = error instanceof Error ? error.message : String(error);
    }

    try {
      const [year, month, day] = date.split('-');
      const query = new URLSearchParams({
        data: `${day}/${month}/${year}`,
        idPorto: '3',
        request_locale: 'es',
      });
      const response = await this.fetchImpl(`${METEOGALICIA_TIDE_URL}?${query}`, { headers });
      if (!response.ok) {
        throw new Error(`MeteoGalicia tide API returned ${response.status}`);
      }
      return {
        day: parseMeteoGaliciaTideResponse(await response.text()),
        attribution: 'MeteoGalicia (Xunta de Galicia)',
      };
    } catch (error) {
      const fallbackError = error instanceof Error ? error.message : String(error);
      throw new Error(`Tide providers returned errors: IHM: ${ihmError}; MeteoGalicia: ${fallbackError}`);
    }
  }

  private async readCache(cacheFile: string): Promise<TideDay | null> {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8')) as TideDay;
    } catch {
      return null;
    }
  }
}

export const parseIhmTideResponse = (text: string): Pick<TideDay, 'portId' | 'port' | 'latitude' | 'longitude' | 'date' | 'events'> => {
  const scalar = (label: string): string => {
    const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'mi'));
    if (!match?.[1]) throw new Error(`Invalid IHM tide response: missing ${label}`);
    return match[1].trim();
  };
  const rows = [...text.matchAll(/^(\d{2}:\d{2})\s+([0-9]+(?:\.[0-9]+)?)\s+(pleamar|bajamar)\s*$/gmi)];
  const events: TideEvent[] = rows.map((match) => ({
    time: match[1]!,
    heightMeters: Number.parseFloat(match[2]!),
    type: match[3]!.toLowerCase() === 'pleamar' ? 'high' : 'low',
  }));
  if (events.length === 0) throw new Error('Invalid IHM tide response: no tide events');
  return {
    portId: VIGO_PORT_ID,
    port: 'Vigo',
    latitude: Number.parseFloat(scalar('lat')),
    longitude: Number.parseFloat(scalar('lon')),
    date: scalar('fecha'),
    events,
  };
};

export const parseMeteoGaliciaTideResponse = (
  text: string,
): Pick<TideDay, 'portId' | 'port' | 'latitude' | 'longitude' | 'date' | 'events'> => {
  const point = text.match(/<georss:point>\s*([-\d.]+)\s+([-\d.]+)\s*<\/georss:point>/i);
  const dateMatch = text.match(/<Mareas:dataPredicion\b[^>]*>(\d{2})\/(\d{2})\/(\d{4})<\/Mareas:dataPredicion>/i);
  if (!point?.[1] || !point[2] || !dateMatch?.[1] || !dateMatch[2] || !dateMatch[3]) {
    throw new Error('Invalid MeteoGalicia tide response: missing Vigo position or date');
  }

  const events: TideEvent[] = [...text.matchAll(/<Mareas:mareas\b([^>]*)\/>/gi)].map((match) => {
    const attributes = match[1] ?? '';
    const attribute = (name: string): string => {
      const value = attributes.match(new RegExp(`\\b${name}="([^"]+)"`, 'i'))?.[1];
      if (!value) throw new Error(`Invalid MeteoGalicia tide response: missing ${name}`);
      return value;
    };
    return {
      time: attribute('hora'),
      heightMeters: Number.parseFloat(attribute('altura').replace(',', '.')),
      type: attribute('idTipoMarea') === '1' ? 'high' : 'low',
    };
  });
  if (events.length === 0 || events.some((event) => !Number.isFinite(event.heightMeters))) {
    throw new Error('Invalid MeteoGalicia tide response: no valid tide events');
  }

  return {
    portId: VIGO_PORT_ID,
    port: 'Vigo',
    latitude: Number.parseFloat(point[1]),
    longitude: Number.parseFloat(point[2]),
    date: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,
    events,
  };
};

const assertIsoDate = (date: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error('Invalid date; expected YYYY-MM-DD');
  }
};

const withAge = (day: TideDay, state: 'cached' | 'stale'): TideDay => ({
  ...day,
  state,
  ageSeconds: Math.max(0, Math.round((Date.now() - Date.parse(day.fetchedAt)) / 1000)),
});
