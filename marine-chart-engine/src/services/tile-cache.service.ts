import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface TileCacheConfig {
  cacheDir: string;
  ttlDays: number;
  maxSizeMb?: number;
}

export interface CachedTile {
  data: Buffer;
  contentType: string;
  hit: boolean;
}

/**
 * Disk-based tile cache with TTL eviction.
 * Stores tiles in a slippy-map directory structure: {cacheDir}/{provider}/{z}/{x}/{y}.png
 */
export class TileCacheService {
  private readonly config: TileCacheConfig;

  constructor(config: TileCacheConfig) {
    this.config = config;
    this.ensureCacheDir();
  }

  /**
   * Try to read a tile from cache. Returns null if not found or expired.
   */
  async get(providerId: string, z: number, x: number, y: number): Promise<CachedTile | null> {
    const filePath = this.tilePath(providerId, z, x, y);
    if (!fsSync.existsSync(filePath)) {
      return null;
    }

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) {
      return null;
    }

    const ageMs = Date.now() - stat.mtimeMs;
    const ttlMs = this.config.ttlDays * 24 * 60 * 60 * 1000;
    if (ageMs > ttlMs) {
      await fs.rm(filePath, { force: true }).catch(() => {});
      return null;
    }

    const data = await fs.readFile(filePath);
    const contentType = this.inferContentType(filePath);
    return { data, contentType, hit: true };
  }

  /**
   * Store a tile in the cache.
   */
  async set(providerId: string, z: number, x: number, y: number, data: Buffer, contentType: string): Promise<void> {
    const filePath = this.tilePath(providerId, z, x, y);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const ext = this.extensionFromContentType(contentType);
    const finalPath = this.ensureExtension(filePath, ext);
    await fs.writeFile(finalPath, data);
  }

  /**
   * Build a cache key for a tile request.
   */
  buildKey(providerId: string, z: number, x: number, y: number): string {
    return `${providerId}/${z}/${x}/${y}`;
  }

  /**
   * Get the cache directory path.
   */
  getCacheDir(): string {
    return this.config.cacheDir;
  }

  private tilePath(providerId: string, z: number, x: number, y: number): string {
    return path.join(this.config.cacheDir, providerId, String(z), String(x), String(y));
  }

  private ensureExtension(filePath: string, ext: string): string {
    if (filePath.endsWith(ext)) {
      return filePath;
    }
    return `${filePath}.${ext}`;
  }

  private inferContentType(filePath: string): string {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (filePath.endsWith('.webp')) {
      return 'image/webp';
    }
    if (filePath.endsWith('.pbf')) {
      return 'application/x-protobuf';
    }
    return 'image/png';
  }

  private extensionFromContentType(contentType: string): string {
    const ct = contentType.toLowerCase();
    if (ct.includes('jpeg') || ct.includes('jpg')) {
      return 'jpg';
    }
    if (ct.includes('webp')) {
      return 'webp';
    }
    if (ct.includes('protobuf') || ct.includes('pbf')) {
      return 'pbf';
    }
    return 'png';
  }

  private async ensureCacheDir(): Promise<void> {
    await fs.mkdir(this.config.cacheDir, { recursive: true });
  }
}
