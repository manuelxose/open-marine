import type { TileCacheService } from './tile-cache.service.js';
import { isValidTileImage } from './tile-image-validation.js';

export interface XyzProviderConfig {
  id: string;
  tileUrlTemplate: string;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
  headers?: Record<string, string>;
  /** Optional cache freshness override (minutes); used for fast-changing layers like weather. */
  cacheTtlMinutes?: number;
}

/**
 * Proxy service for XYZ tile sources with local caching.
 * Fetches tiles from remote XYZ endpoints and caches them on disk.
 */
export class XyzProxyService {
  private readonly providers = new Map<string, XyzProviderConfig>();
  private readonly providerState = new Map<string, { lastSuccessAt?: string; lastErrorAt?: string; lastError?: string }>();

  constructor(private readonly cache: TileCacheService) {}

  registerProvider(config: XyzProviderConfig): void {
    this.providers.set(config.id, config);
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  diagnostics(): Array<{ id: string; available: true; lastSuccessAt?: string; lastErrorAt?: string; lastError?: string }> {
    return [...this.providers.keys()].map((id) => ({ id, available: true, ...(this.providerState.get(id) ?? {}) }));
  }

  /**
   * Fetch a tile from the provider, using cache if available.
   */
  async fetchTile(providerId: string, z: number, x: number, y: number): Promise<{ data: Buffer; contentType: string } | null> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return null;
    }

    // Check cache first (weather and other fast-changing layers use a short TTL).
    const ttlMsOverride = provider.cacheTtlMinutes ? provider.cacheTtlMinutes * 60 * 1000 : undefined;
    const cached = await this.cache.get(providerId, z, x, y, ttlMsOverride);
    if (cached) {
      if (isValidTileImage(cached.contentType, cached.data)) {
        return { data: cached.data, contentType: cached.contentType };
      }
      await this.cache.delete(providerId, z, x, y);
    }

    // Fetch from remote
    const url = this.buildTileUrl(provider.tileUrlTemplate, z, x, y);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpenMarine-ChartEngine/0.1.0',
          ...(provider.headers ?? {}),
        },
      });

      if (!response.ok) {
        this.providerState.set(providerId, { lastErrorAt: new Date().toISOString(), lastError: `${response.status} ${response.statusText}` });
        return null;
      }

      const data = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') ?? 'image/png';
      if (!isValidTileImage(contentType, data)) {
        this.providerState.set(providerId, { lastErrorAt: new Date().toISOString(), lastError: `Invalid tile response (${contentType})` });
        return null;
      }

      await this.cache.set(providerId, z, x, y, data, contentType);
      this.providerState.set(providerId, { lastSuccessAt: new Date().toISOString() });
      return { data, contentType };
    } catch (error) {
      this.providerState.set(providerId, { lastErrorAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Get the MapLibre style JSON for a provider.
   */
  buildStyle(
    providerId: string,
    publicBaseUrl = 'http://localhost:8088',
  ): { version: 8; sources: Record<string, unknown>; layers: unknown[] } | null {
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
          tiles: [`${publicBaseUrl.replace(/\/$/, '')}/proxy/xyz/${providerId}/{z}/{x}/{y}`],
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
