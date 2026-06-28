import type { TileCacheService } from './tile-cache.service.js';

export interface WmsProviderConfig {
  id: string;
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
  async fetchTile(providerId: string, z: number, x: number, y: number): Promise<{ data: Buffer; contentType: string } | null> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return null;
    }

    // Check cache first
    const cached = await this.cache.get(providerId, z, x, y);
    if (cached) {
      return { data: cached.data, contentType: cached.contentType };
    }

    const bbox = this.tileToBbox(z, x, y);
    const url = this.buildWmsUrl(provider, bbox);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenMarine-ChartEngine/0.1.0',
        ...(provider.headers ?? {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? 'image/png';

    // Store in cache
    await this.cache.set(providerId, z, x, y, data, contentType);

    return { data, contentType };
  }

  /**
   * Get the MapLibre style JSON for a WMS provider.
   */
  buildStyle(providerId: string): { version: 8; sources: Record<string, unknown>; layers: unknown[] } | null {
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
          tiles: [`http://localhost:8088/proxy/wms/${providerId}/{z}/{x}/{y}`],
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
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: provider.version ?? '1.1.1',
      REQUEST: 'GetMap',
      LAYERS: provider.layers,
      STYLES: provider.styles ?? '',
      FORMAT: provider.format ?? 'image/png',
      TRANSPARENT: String(provider.transparent ?? true),
      SRS: provider.srs ?? 'EPSG:3857',
      BBOX: bbox.join(','),
      WIDTH: '256',
      HEIGHT: '256',
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
}
