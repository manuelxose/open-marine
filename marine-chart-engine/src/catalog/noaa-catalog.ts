import { XMLParser } from 'fast-xml-parser';
import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';

/**
 * NOAA ENC catalog client.
 * Fetches the official NOAA ENC product catalog (ENCProdCat.xml) and parses
 * each <cell> into a RemoteChartEntry. The catalog is large, so results are
 * cached in memory for a short TTL. If the fetch or parse fails (e.g. offline),
 * a small representative list is returned so the API keeps working.
 */

interface NoaaVertex {
  lat?: number | string;
  long?: number | string;
}

interface NoaaPanel {
  vertex?: NoaaVertex[];
}

interface NoaaCov {
  panel?: NoaaPanel[];
}

interface NoaaCell {
  name?: string;
  lname?: string;
  cscale?: number | string;
  status?: string;
  zipfile_location?: string;
  zipfile_size?: number | string;
  zipfile_datetime_iso8601?: string;
  edtn?: number | string;
  updn?: number | string;
  uadt?: string;
  isdt?: string;
  cov?: NoaaCov;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Build the download URL for a specific NOAA ENC chart number (fallback when a
 * cell has no explicit zipfile_location).
 */
export function noaaDownloadUrl(chartNumber: string): string {
  return `https://www.charts.noaa.gov/ENCs/${chartNumber}.zip`;
}

/**
 * Parse the NOAA ENC product catalog XML into RemoteChartEntry records.
 * Exported as a pure function so it can be unit-tested without network access.
 */
export function parseNoaaCatalog(xml: string): RemoteChartEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: true,
    trimValues: true,
    isArray: (name) => name === 'cell' || name === 'panel' || name === 'vertex',
  });

  const parsed = parser.parse(xml) as unknown;
  const cells: NoaaCell[] = [];
  collectCells(parsed, cells);

  const entries: RemoteChartEntry[] = [];
  for (const cell of cells) {
    const entry = mapCell(cell);
    if (entry) {
      entries.push(entry);
    }
  }
  return entries;
}

export class NoaaCatalogClient {
  // Official machine-readable ENC product catalog.
  private readonly catalogUrl = 'https://www.charts.noaa.gov/ENCs/ENCProdCat.xml';

  private cache: { entries: RemoteChartEntry[]; fetchedAt: number } | null = null;

  /**
   * Fetch the NOAA ENC catalog and return chart entries, optionally filtered.
   */
  async fetchCatalog(filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    const entries = await this.loadEntries();
    return this.applyFilter(entries, filter);
  }

  /** @deprecated use the exported noaaDownloadUrl() */
  buildDownloadUrl(chartNumber: string): string {
    return noaaDownloadUrl(chartNumber);
  }

  private async loadEntries(): Promise<RemoteChartEntry[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.entries;
    }

    try {
      const response = await fetch(this.catalogUrl, {
        headers: { 'User-Agent': 'OpenMarine-ChartEngine/0.1.0' },
      });
      if (!response.ok) {
        throw new Error(`NOAA catalog fetch failed: ${response.status} ${response.statusText}`);
      }
      const xml = await response.text();
      const entries = parseNoaaCatalog(xml);
      if (entries.length === 0) {
        throw new Error('NOAA catalog parsed but contained no cells');
      }
      this.cache = { entries, fetchedAt: Date.now() };
      return entries;
    } catch (error) {
      console.warn(`[noaa-catalog] Falling back to representative list: ${(error as Error).message}`);
      return this.fallbackEntries();
    }
  }

  private applyFilter(entries: RemoteChartEntry[], filter?: ChartCatalogFilter): RemoteChartEntry[] {
    if (!filter?.bbox) {
      return entries;
    }
    const box = filter.bbox;
    return entries.filter((entry) => boundsIntersect(entry.bounds, box));
  }

  private fallbackEntries(): RemoteChartEntry[] {
    return [
      {
        id: 'noaa-enc-us-east-coast',
        providerId: 'noaa-enc',
        label: 'US East Coast ENC Collection',
        description: 'Electronic Navigational Charts for the US East Coast from Maine to Florida.',
        scale: 20000,
        bounds: [-81.5, 24.3, -66.9, 45.0],
        minZoom: 4,
        maxZoom: 16,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENCs/',
        sizeBytes: 0,
      },
      {
        id: 'noaa-enc-us-west-coast',
        providerId: 'noaa-enc',
        label: 'US West Coast ENC Collection',
        description: 'Electronic Navigational Charts for the US West Coast from Washington to California.',
        scale: 20000,
        bounds: [-125.0, 32.5, -117.0, 49.0],
        minZoom: 4,
        maxZoom: 16,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENCs/',
        sizeBytes: 0,
      },
    ];
  }
}

function mapCell(cell: NoaaCell): RemoteChartEntry | null {
  const name = typeof cell.name === 'string' ? cell.name.trim() : '';
  if (!name) {
    return null;
  }
  if (cell.status && String(cell.status).toLowerCase() !== 'active') {
    return null;
  }

  const bounds = computeBounds(cell.cov);
  if (!bounds) {
    return null;
  }

  const downloadUrl =
    typeof cell.zipfile_location === 'string' && cell.zipfile_location.length > 0
      ? cell.zipfile_location
      : noaaDownloadUrl(name);

  const entry: RemoteChartEntry = {
    id: `noaa-${name.toLowerCase()}`,
    providerId: 'noaa-enc',
    label: typeof cell.lname === 'string' && cell.lname.length > 0 ? `${name} — ${cell.lname}` : name,
    bounds,
    format: 's57',
    downloadUrl,
  };

  const scale = toNumber(cell.cscale);
  if (scale !== undefined) {
    entry.scale = scale;
  }
  const sizeBytes = toNumber(cell.zipfile_size);
  if (sizeBytes !== undefined) {
    entry.sizeBytes = sizeBytes;
  }
  const lastUpdated = cell.zipfile_datetime_iso8601 ?? cell.uadt ?? cell.isdt;
  if (lastUpdated) {
    entry.lastUpdated = lastUpdated;
  }
  if (typeof cell.lname === 'string' && cell.lname.length > 0) {
    entry.description = cell.lname;
  }

  return entry;
}

function collectCells(node: unknown, out: NoaaCell[]): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectCells(child, out);
    }
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj['cell'])) {
    out.push(...(obj['cell'] as NoaaCell[]));
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      collectCells(value, out);
    }
  }
}

function computeBounds(cov?: NoaaCov): [number, number, number, number] | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const panel of cov?.panel ?? []) {
    for (const vertex of panel.vertex ?? []) {
      const lat = toNumber(vertex.lat);
      const lon = toNumber(vertex.long);
      if (lat === undefined || lon === undefined) {
        continue;
      }
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) {
    return null;
  }
  return [minLon, minLat, maxLon, maxLat];
}

function boundsIntersect(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function toNumber(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
