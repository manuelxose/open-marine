import Database from 'better-sqlite3';

export interface MBTilesMetadata {
  name: string;
  type: string;
  version: string;
  description: string;
  format: 'png' | 'jpg' | 'webp' | 'pbf';
  bounds: string;
  minzoom: string;
  maxzoom: string;
}

/**
 * MBTiles file generator for creating new MBTiles databases.
 * Unified from marine-chart-toolkit.
 */
export class MBTilesGenerator {
  private db: Database.Database;

  constructor(private outputPath: string) {
    this.db = new Database(outputPath);
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (name text, value text);
      CREATE TABLE IF NOT EXISTS tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
      CREATE UNIQUE INDEX IF NOT EXISTS metadata_name ON metadata (name);
      CREATE UNIQUE INDEX IF NOT EXISTS tile_index ON tiles (zoom_level, tile_column, tile_row);
    `);
  }

  setMetadata(metadata: MBTilesMetadata): void {
    const upsert = this.db.prepare('INSERT OR REPLACE INTO metadata (name, value) VALUES (?, ?)');
    for (const [name, value] of Object.entries(metadata)) {
      upsert.run(name, String(value));
    }
  }

  addTile(zoom: number, column: number, row: number, data: Buffer): void {
    const insert = this.db.prepare('INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)');
    insert.run(zoom, column, row, data);
  }

  close(): void {
    this.db.close();
  }
}
