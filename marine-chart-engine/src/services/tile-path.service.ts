import path from 'node:path';
import type { TileCoordinate } from '../types/chart-source.types.js';

export class TilePathService {
  constructor(private readonly dataDir: string) {}

  chartDir(chartId: string): string {
    return path.join(this.dataDir, 'charts', chartId);
  }

  mbtilesPath(chartId: string): string {
    return path.join(this.dataDir, 'charts', `${chartId}.mbtiles`);
  }

  nestedMbtilesPath(chartId: string): string {
    return path.join(this.chartDir(chartId), 'chart.mbtiles');
  }

  rasterTilePath(chartId: string, coord: TileCoordinate): string {
    return path.join(this.dataDir, 'charts', chartId, 'raster', String(coord.z), String(coord.x), `${coord.y}.png`);
  }

  vectorTilePath(chartId: string, coord: TileCoordinate): string {
    return path.join(this.dataDir, 'charts', chartId, 'vector', String(coord.z), String(coord.x), `${coord.y}.pbf`);
  }
}
