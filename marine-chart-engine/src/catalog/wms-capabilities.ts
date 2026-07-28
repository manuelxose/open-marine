import { XMLParser } from 'fast-xml-parser';
import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';

/**
 * Shared WMS GetCapabilities client + parser.
 *
 * Fetches a WMS service's GetCapabilities document and turns each named (leaf)
 * layer into a RemoteChartEntry, using the layer's geographic bounding box.
 * Group layers without a <Name> are skipped. Results are cached with a short
 * TTL; on any network/parse failure a provided static fallback is returned.
 *
 * Supports both WMS 1.3.0 (EX_GeographicBoundingBox child elements) and
 * WMS 1.1.1 (LatLonBoundingBox minx/miny/maxx/maxy attributes).
 */

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_LAYERS = 200;

export interface WmsCapabilitiesOptions {
  providerId: string;
  baseUrl: string;
  version?: string;
}

interface WmsLayerNode {
  Name?: string | number;
  Title?: string | number;
  Abstract?: string | number;
  EX_GeographicBoundingBox?: {
    westBoundLongitude?: number | string;
    eastBoundLongitude?: number | string;
    southBoundLatitude?: number | string;
    northBoundLatitude?: number | string;
  };
  LatLonBoundingBox?: {
    '@_minx'?: number | string;
    '@_miny'?: number | string;
    '@_maxx'?: number | string;
    '@_maxy'?: number | string;
  };
}

/**
 * Parse a WMS GetCapabilities XML document into RemoteChartEntry records.
 * Exported as a pure function so it can be unit-tested without network access.
 */
export function parseWmsCapabilities(xml: string, opts: WmsCapabilitiesOptions): RemoteChartEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    isArray: (name) => name === 'Layer',
  });

  const parsed = parser.parse(xml) as unknown;
  const layers: WmsLayerNode[] = [];
  collectLayers(parsed, layers);

  const entries: RemoteChartEntry[] = [];
  const seen = new Set<string>();
  for (const layer of layers) {
    const entry = mapLayer(layer, opts);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      entries.push(entry);
      if (entries.length >= MAX_LAYERS) {
        break;
      }
    }
  }
  return entries;
}

export class WmsCapabilitiesClient {
  private cache: { entries: RemoteChartEntry[]; fetchedAt: number } | null = null;

  constructor(
    private readonly opts: WmsCapabilitiesOptions & { fallback: RemoteChartEntry[] },
  ) {}

  async fetchLayers(filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    const entries = await this.load();
    if (!filter?.bbox) {
      return entries;
    }
    const box = filter.bbox;
    return entries.filter((entry) => boundsIntersect(entry.bounds, box));
  }

  private async load(): Promise<RemoteChartEntry[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.entries;
    }

    const version = this.opts.version ?? '1.3.0';
    try {
      const separator = this.opts.baseUrl.includes('?') ? '&' : '?';
      const url = `${this.opts.baseUrl}${separator}SERVICE=WMS&REQUEST=GetCapabilities&VERSION=${version}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'OpenMarine-ChartEngine/0.1.0' },
      });
      if (!response.ok) {
        throw new Error(`WMS GetCapabilities failed: ${response.status} ${response.statusText}`);
      }
      const xml = await response.text();
      const entries = parseWmsCapabilities(xml, this.opts);
      if (entries.length === 0) {
        throw new Error('WMS GetCapabilities parsed but contained no named layers');
      }
      this.cache = { entries, fetchedAt: Date.now() };
      return entries;
    } catch (error) {
      console.warn(`[wms-capabilities:${this.opts.providerId}] Falling back to static list: ${(error as Error).message}`);
      return this.opts.fallback;
    }
  }
}

function mapLayer(layer: WmsLayerNode, opts: WmsCapabilitiesOptions): RemoteChartEntry | null {
  const name = layer.Name === undefined ? '' : String(layer.Name).trim();
  if (!name) {
    return null;
  }
  const bounds = boundsFromLayer(layer);
  if (!bounds) {
    return null;
  }

  const entry: RemoteChartEntry = {
    id: `${opts.providerId}-${slug(name)}`,
    providerId: opts.providerId,
    label: layer.Title !== undefined && String(layer.Title).length > 0 ? String(layer.Title) : name,
    bounds,
    format: 'wms-layer',
    downloadUrl: opts.baseUrl,
    wmsLayer: name,
  };

  if (layer.Abstract !== undefined && String(layer.Abstract).length > 0) {
    entry.description = String(layer.Abstract);
  }

  return entry;
}

function boundsFromLayer(layer: WmsLayerNode): [number, number, number, number] | null {
  const ex = layer.EX_GeographicBoundingBox;
  if (ex) {
    const minLon = toNumber(ex.westBoundLongitude);
    const minLat = toNumber(ex.southBoundLatitude);
    const maxLon = toNumber(ex.eastBoundLongitude);
    const maxLat = toNumber(ex.northBoundLatitude);
    if ([minLon, minLat, maxLon, maxLat].every((n) => n !== undefined)) {
      return [minLon!, minLat!, maxLon!, maxLat!];
    }
  }

  const ll = layer.LatLonBoundingBox;
  if (ll) {
    const minLon = toNumber(ll['@_minx']);
    const minLat = toNumber(ll['@_miny']);
    const maxLon = toNumber(ll['@_maxx']);
    const maxLat = toNumber(ll['@_maxy']);
    if ([minLon, minLat, maxLon, maxLat].every((n) => n !== undefined)) {
      return [minLon!, minLat!, maxLon!, maxLat!];
    }
  }

  return null;
}

function collectLayers(node: unknown, out: WmsLayerNode[]): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectLayers(child, out);
    }
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj['Layer'])) {
    out.push(...(obj['Layer'] as WmsLayerNode[]));
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      collectLayers(value, out);
    }
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
