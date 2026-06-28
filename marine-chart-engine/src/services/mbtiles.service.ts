import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import Database from 'better-sqlite3';
import type { TileCoordinate, TilePayload } from '../types/chart-source.types.js';

type MetadataRow = {
  name: string;
  value: string;
};

type TileRow = {
  tile_data: Buffer;
};

export class MbtilesService {
  private readonly databases = new Map<string, Database.Database>();

  findExistingMbtiles(paths: string[]): string | null {
    return paths.find((filePath) => fsSync.existsSync(filePath)) ?? null;
  }

  readMetadata(filePath: string): Record<string, string> | null {
    const db = this.openReadonly(filePath);
    if (!db) {
      return null;
    }

    const rows = db.prepare('SELECT name, value FROM metadata').all() as MetadataRow[];
    return Object.fromEntries(rows.map((row) => [row.name, row.value]));
  }

  close(filePath: string): void {
    const db = this.databases.get(filePath);
    if (!db) {
      return;
    }
    db.close();
    this.databases.delete(filePath);
  }

  readMbtilesTile(filePath: string, coord: TileCoordinate, expectedKind: 'raster' | 'vector'): TilePayload | null {
    const db = this.openReadonly(filePath);
    if (!db) {
      return null;
    }

    const rowTms = 2 ** coord.z - 1 - coord.y;
    const row = db
      .prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?')
      .get(coord.z, coord.x, rowTms) as TileRow | undefined;

    if (!row?.tile_data) {
      return null;
    }

    const metadata = this.readMetadata(filePath) ?? {};
    const format = metadata['format']?.toLowerCase();
    return {
      data: row.tile_data,
      contentType: this.contentType(format, expectedKind),
      ...(expectedKind === 'vector' && this.isGzip(row.tile_data) ? { contentEncoding: 'gzip' } : {}),
    };
  }

  async readStaticTile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private openReadonly(filePath: string): Database.Database | null {
    if (!fsSync.existsSync(filePath)) {
      return null;
    }

    const cached = this.databases.get(filePath);
    if (cached) {
      return cached;
    }

    const db = new Database(filePath, { readonly: true, fileMustExist: true });
    this.databases.set(filePath, db);
    return db;
  }

  private contentType(format: string | undefined, expectedKind: 'raster' | 'vector'): string {
    if (expectedKind === 'vector') {
      return 'application/x-protobuf';
    }
    if (format === 'jpg' || format === 'jpeg') {
      return 'image/jpeg';
    }
    if (format === 'webp') {
      return 'image/webp';
    }
    return 'image/png';
  }

  private isGzip(data: Buffer): boolean {
    return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
  }
}
