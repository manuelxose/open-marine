import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { AreaSearchResult } from '../types/package.types.js';
import { rectangleGeometry } from './area-geometry.js';

interface CartoCandidate {
  id?: string;
  address?: string;
  type?: string;
  muni?: string;
  province?: string;
  lat?: number;
  lng?: number;
}

interface CachedSearch {
  fetchedAt: string;
  results: AreaSearchResult[];
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export class AreaSearchService {
  private readonly cache = new Map<string, CachedSearch>();

  constructor(private readonly cacheFile: string) {
    this.loadCache();
  }

  async search(query: string): Promise<AreaSearchResult[]> {
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || normalized.length > 120) {
      throw new Error('Area search query must contain between 2 and 120 characters');
    }
    const key = normalized.toLocaleLowerCase('es');
    const cached = this.cache.get(key);
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL_MS) {
      return cached.results;
    }

    const candidatesUrl = new URL('https://www.cartociudad.es/geocoder/api/geocoder/candidates');
    candidatesUrl.searchParams.set('q', normalized);
    candidatesUrl.searchParams.set('limit', '5');
    const response = await fetch(candidatesUrl, {
      headers: { accept: 'application/json', 'user-agent': 'OpenMarineInstrumentation/0.1' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`CartoCiudad returned HTTP ${response.status}`);
    }
    const payload = await response.json() as unknown;
    const candidates = Array.isArray(payload) ? payload as CartoCandidate[] : [];
    const resolved = await Promise.all(candidates.slice(0, 5).map((candidate) => this.resolveCandidate(candidate)));
    const results = resolved.filter((result): result is AreaSearchResult => result !== null);
    const entry = { fetchedAt: new Date().toISOString(), results };
    this.cache.set(key, entry);
    await this.persistCache();
    return results;
  }

  private async resolveCandidate(candidate: CartoCandidate): Promise<AreaSearchResult | null> {
    let resolved = candidate;
    if (!validCoordinate(candidate.lng, candidate.lat)) {
      const label = candidate.address?.trim();
      if (!label) return null;
      const url = new URL('https://www.cartociudad.es/geocoder/api/geocoder/find');
      url.searchParams.set('q', label);
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'OpenMarineInstrumentation/0.1' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return null;
      resolved = await response.json() as CartoCandidate;
    }
    if (!validCoordinate(resolved.lng, resolved.lat)) return null;

    const center: [number, number] = [resolved.lng!, resolved.lat!];
    const extentDegrees = /municipio|poblacion|toponimo/i.test(resolved.type ?? '') ? 0.08 : 0.015;
    const bounds: [number, number, number, number] = [
      Math.max(-180, center[0] - extentDegrees),
      Math.max(-85, center[1] - extentDegrees),
      Math.min(180, center[0] + extentDegrees),
      Math.min(85, center[1] + extentDegrees),
    ];
    return {
      id: resolved.id ?? `${center[0]}:${center[1]}`,
      label: resolved.address ?? candidate.address ?? 'CartoCiudad result',
      type: resolved.type ?? candidate.type ?? 'place',
      ...(resolved.muni || candidate.muni ? { municipality: resolved.muni ?? candidate.muni } : {}),
      ...(resolved.province || candidate.province ? { province: resolved.province ?? candidate.province } : {}),
      center,
      bounds,
      geometry: rectangleGeometry(bounds),
      source: 'cartociudad',
    };
  }

  private loadCache(): void {
    try {
      if (!fs.existsSync(this.cacheFile)) return;
      const parsed = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8')) as Record<string, CachedSearch>;
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry && Array.isArray(entry.results) && typeof entry.fetchedAt === 'string') {
          this.cache.set(key, entry);
        }
      }
    } catch {
      // A broken disposable geocoder cache must never stop the chart engine.
    }
  }

  private async persistCache(): Promise<void> {
    await fsPromises.mkdir(path.dirname(this.cacheFile), { recursive: true });
    const temporary = `${this.cacheFile}.tmp`;
    await fsPromises.writeFile(temporary, `${JSON.stringify(Object.fromEntries(this.cache), null, 2)}\n`, 'utf8');
    await fsPromises.rename(temporary, this.cacheFile);
  }
}

const validCoordinate = (longitude: unknown, latitude: unknown): boolean =>
  typeof longitude === 'number'
  && typeof latitude === 'number'
  && Number.isFinite(longitude)
  && Number.isFinite(latitude)
  && longitude >= -180
  && longitude <= 180
  && latitude >= -85
  && latitude <= 85
  && !(longitude === 0 && latitude === 0);
