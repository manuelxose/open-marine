import type { TileCacheService } from './tile-cache.service.js';

export interface XyzProviderConfig {
  id: string;
  tileUrlTemplate: string;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
  headers?: Record<string, string>;
}

/**
 * Proxy service for XYZ tile sources with local caching.
 * Fetches tiles from remote XYZ endpoints and caches them on disk.
 */
export class XyzProxyService {
  private readonly providers = new Map<string, XyzProviderConfig>();

  constructor(private readonly cache: TileCacheService) {}

  registerProvider(config: XyzProviderConfig): void {
    this.providers.set(config.id, config);
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Fetch a tile from the provider, using cache if available.
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

    // Fetch from remote
    const url = this.buildTileUrl(provider.tileUrlTemplate, z, x, y);
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
   * Get the MapLibre style JSON for a provider.
   */
  buildStyle(providerId: string): { version: 8; sources: Record<string, unknown>; layers: unknown[] } | null {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return null;
    }

    const sourceId = `xyz-${providerId}`;
    return {
      version: 8,
      sources: {
        [sourceId]: {
          type: 'raster',
          tiles: [`http://localhost:8088/proxy/xyz/${providerId}/{z}/{x}/{y}`],
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

  private buildTileUrl(template: string, z: number, x: number, y: number): string {
    return template
      .replace(/{z}/g, String(z))
      .replace(/{x}/g, String(x))
      .replace(/{y}/g, String(y));
  }
}
