import fs from 'node:fs/promises';
import path from 'node:path';
import { MBTilesGenerator } from '../toolkit/mbtiles-generator.js';
import type { TileCacheService } from '../services/tile-cache.service.js';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';

export interface AreaDownloadRequest {
  id: string;
  label: string;
  providerId: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  minZoom: number;
  maxZoom: number;
  description?: string;
  attribution?: string;
  /** Optional WMS layer override (when caching a specific layer of a WMS provider). */
  layers?: string;
}

export interface DownloadProgress {
  totalTiles: number;
  downloadedTiles: number;
  skippedTiles: number;
  failedTiles: number;
  currentZoom: number;
  lastError?: string;
}

export interface AreaDownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Downloads tiles for a given bounding box and zoom range,
 * storing them into a new MBTiles file for offline use.
 */
export class TileBatchDownloader {
  // Public WMS endpoints are deliberately kept below browser-style burst rates.
  private readonly concurrency = 3;

  constructor(
    private readonly tileCache: TileCacheService,
    private readonly xyzProxy: XyzProxyService,
    private readonly wmsProxy: WmsProxyService,
    private readonly dataDir: string,
  ) {}

  async downloadArea(request: AreaDownloadRequest, options: AreaDownloadOptions = {}): Promise<string> {
    const { onProgress, signal } = options;
    const targetFile = path.join(this.dataDir, 'charts', `${request.id}.mbtiles`);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });

    // Existing databases are intentionally reused: completed tiles are skipped,
    // making interrupted/cancelled downloads resumable.
    const generator = new MBTilesGenerator(targetFile);
    generator.init();
    generator.setMetadata({
      name: request.label,
      type: 'baselayer',
      version: '1',
      description: request.description ?? `Offline tiles for ${request.providerId}`,
      format: 'png',
      bounds: request.bbox.join(','),
      minzoom: String(request.minZoom),
      maxzoom: String(request.maxZoom),
    });

    const allTiles = Array.from(
      { length: request.maxZoom - request.minZoom + 1 },
      (_, offset) => this.bboxToTiles(request.bbox, request.minZoom + offset),
    );
    const totalTiles = allTiles.reduce((total, tiles) => total + tiles.length, 0);
    let downloadedTiles = 0;
    let skippedTiles = 0;
    let failedTiles = 0;
    let lastError: string | undefined;

    try {
      for (let z = request.minZoom; z <= request.maxZoom; z++) {
        const tiles = allTiles[z - request.minZoom]!;

      // Process in batches with concurrency limit
      for (let i = 0; i < tiles.length; i += this.concurrency) {
        if (signal?.aborted) {
          generator.close();
          throw new Error('Area download cancelled');
        }
        const batch = tiles.slice(i, i + this.concurrency);
        const results = await Promise.all(
          batch.map(async (t) => {
            const rowTms = 2 ** t.z - 1 - t.y;
            if (generator.hasTile(t.z, t.x, rowTms)) {
              return { ...t, skipped: true, success: true };
            }
            try {
              const tile = await this.fetchTile(request.providerId, t.z, t.x, t.y, request.layers);
              if (tile) {
                return { ...t, data: tile.data, success: true };
              }
              return { ...t, success: false };
            } catch (error) {
              return {
                ...t,
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          }),
        );

        for (const result of results) {
          if ('skipped' in result && result.skipped) {
            skippedTiles++;
          } else if (result.success && 'data' in result) {
            const rowTms = 2 ** result.z - 1 - result.y;
            generator.addTile(result.z, result.x, rowTms, result.data);
            downloadedTiles++;
          } else {
            failedTiles++;
            if ('error' in result && result.error) {
              lastError = result.error;
            }
          }
        }

        onProgress?.({
          totalTiles,
          downloadedTiles,
          skippedTiles,
          failedTiles,
          currentZoom: z,
          ...(lastError ? { lastError } : {}),
        });
        }
      }
      if (failedTiles > 0) {
        const reason = lastError ? ` Last error: ${lastError}` : '';
        throw new Error(`Offline package incomplete: ${failedTiles} of ${totalTiles} tiles failed; retry to resume.${reason}`);
      }
      if (generator.countTiles() < totalTiles) {
        throw new Error(`Offline package verification failed: expected ${totalTiles} tiles`);
      }
    } finally {
      generator.close();
    }
    return targetFile;
  }

  private async fetchTile(providerId: string, z: number, x: number, y: number, layers?: string): Promise<{ data: Buffer } | null> {
    // Try XYZ proxy first
    if (this.xyzProxy.hasProvider(providerId)) {
      const tile = await this.xyzProxy.fetchTile(providerId, z, x, y);
      if (tile) return tile;
    }
    // Fall back to WMS proxy (with optional layer override)
    if (this.wmsProxy.hasProvider(providerId)) {
      const tile = await this.wmsProxy.fetchTile(providerId, z, x, y, layers);
      if (tile) return tile;
    }
    return null;
  }

  /**
   * Convert bounding box to tile coordinates for a given zoom level.
   */
  private bboxToTiles(bbox: [number, number, number, number], z: number): Array<{ z: number; x: number; y: number }> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const minTile = this.lonLatToTile(minLon, minLat, z);
    const maxTile = this.lonLatToTile(maxLon, maxLat, z);

    const tiles: Array<{ z: number; x: number; y: number }> = [];
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = maxTile.y; y <= minTile.y; y++) { // y is inverted (TMS vs XYZ)
        tiles.push({ z, x, y });
      }
    }
    return tiles;
  }

  private lonLatToTile(lon: number, lat: number, z: number): { x: number; y: number } {
    const n = 2 ** z;
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x: Math.max(0, Math.min(x, n - 1)), y: Math.max(0, Math.min(y, n - 1)) };
  }
}
