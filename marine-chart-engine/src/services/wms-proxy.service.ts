import type { TileCacheService } from './tile-cache.service.js';

export interface WmsProviderConfig {
  id: string;
  catalogGroupId?: string;
  baseUrl: string;
  layers: string;
  styles?: string;
  srs?: string;
  format?: string;
  transparent?: boolean;
  version?: string;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
  headers?: Record<string, string>;
  additionalParams?: Record<string, string>;
  expectedContentTypes?: string[];
}

export class RemoteWmsTileError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
    readonly remoteStatus?: number,
    readonly contentType?: string,
  ) {
    super(message);
    this.name = 'RemoteWmsTileError';
  }
}

/**
 * WMS proxy service that converts WMS GetMap requests to cached tiles.
 * Reprojects WMS requests to the standard Web Mercator (EPSG:3857) tile grid.
 */
export class WmsProxyService {
  private readonly providers = new Map<string, WmsProviderConfig>();

  constructor(private readonly cache: TileCacheService) {}

  registerProvider(config: WmsProviderConfig): void {
    this.providers.set(config.id, config);
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Fetch a tile via WMS GetMap, using cache if available.
   */
  async fetchTile(
    providerId: string,
    z: number,
    x: number,
    y: number,
    layersOverride?: string,
  ): Promise<{ data: Buffer; contentType: string } | null> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return null;
    }

    // A specific layer is cached separately from the provider's default layer.
    const cacheId = layersOverride ? `${providerId}__${layersOverride}` : providerId;

    // Check cache first
    const cached = await this.cache.get(cacheId, z, x, y);
    if (cached) {
      return { data: cached.data, contentType: cached.contentType };
    }

    const bbox = this.tileToBbox(z, x, y);
    const effectiveProvider = layersOverride ? { ...provider, layers: layersOverride } : provider;
    const url = this.buildWmsUrl(effectiveProvider, bbox);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenMarine-ChartEngine/0.1.0',
        ...(provider.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new RemoteWmsTileError(
        `Remote WMS tile request failed for ${providerId}: ${response.status} ${response.statusText}`,
        502,
        response.status,
        response.headers.get('content-type') ?? undefined,
      );
    }

    const data = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? 'image/png';
    if (!this.isExpectedTileResponse(provider, contentType, data)) {
      throw new RemoteWmsTileError(
        `Remote WMS returned non-image content for ${providerId}`,
        502,
        response.status,
        contentType,
      );
    }

    // Store in cache
    await this.cache.set(cacheId, z, x, y, data, contentType);

    return { data, contentType };
  }

  /**
   * Get the MapLibre style JSON for a WMS provider.
   */
  buildStyle(providerId: string, publicBaseUrl = 'http://localhost:8088'): { version: 8; sources: Record<string, unknown>; layers: unknown[] } | null {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return null;
    }

    const sourceId = `wms-${providerId}`;
    return {
      version: 8,
      sources: {
        [sourceId]: {
          type: 'raster',
          tiles: [`${publicBaseUrl.replace(/\/$/, '')}/proxy/wms/${providerId}/{z}/{x}/{y}.png`],
          tileSize: 256,
          minzoom: provider.minZoom ?? 0,
          maxzoom: provider.maxZoom ?? 18,
          attribution: provider.attribution ?? '',
        },
      },
      layers: [
        {
          id: `${sourceId}-layer`,
          type: 'raster',
          source: sourceId,
        },
      ],
    };
  }

  private buildWmsUrl(provider: WmsProviderConfig, bbox: [number, number, number, number]): string {
    const version = provider.version ?? '1.1.1';
    const crsParam = version.startsWith('1.3') ? 'CRS' : 'SRS';
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: version,
      REQUEST: 'GetMap',
      LAYERS: provider.layers,
      STYLES: provider.styles ?? '',
      FORMAT: provider.format ?? 'image/png',
      TRANSPARENT: String(provider.transparent ?? true),
      BBOX: bbox.join(','),
      WIDTH: '256',
      HEIGHT: '256',
      [crsParam]: provider.srs ?? 'EPSG:3857',
      ...(provider.additionalParams ?? {}),
    });

    const separator = provider.baseUrl.includes('?') ? '&' : '?';
    return `${provider.baseUrl}${separator}${params.toString()}`;
  }

  /**
   * Convert tile x/y/z to Web Mercator bounding box.
   */
  private tileToBbox(z: number, x: number, y: number): [number, number, number, number] {
    const n = 2 ** z;
    const tileSize = 256;
    const initialResolution = (2 * Math.PI * 6378137) / tileSize;
    const originShift = (2 * Math.PI * 6378137) / 2;

    const res = initialResolution / n;
    const minx = x * res * tileSize - originShift;
    const miny = -(y + 1) * res * tileSize + originShift;
    const maxx = (x + 1) * res * tileSize - originShift;
    const maxy = -y * res * tileSize + originShift;

    return [minx, miny, maxx, maxy];
  }

  private isExpectedTileResponse(provider: WmsProviderConfig, contentType: string, data: Buffer): boolean {
    const allowed = provider.expectedContentTypes ?? ['image/png', 'image/jpeg', 'image/webp'];
    const normalized = contentType.toLowerCase();
    if (!allowed.some((expected) => normalized.includes(expected))) {
      return false;
    }
    const prefix = data.subarray(0, Math.min(data.length, 256)).toString('utf8').trimStart().toLowerCase();
    return !prefix.startsWith('<?xml') && !prefix.includes('<serviceexception');
  }
}
