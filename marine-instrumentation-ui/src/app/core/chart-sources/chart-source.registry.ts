import { Injectable } from '@angular/core';
import { ChartSourceConfig } from './chart-source.types';
import { OSM_RASTER_SOURCE } from './builtins/osm-raster';
import { LOCAL_RASTER_SOURCE } from './builtins/local-raster';
import { LOCAL_VECTOR_SOURCE } from './builtins/local-vector';

@Injectable({
  providedIn: 'root',
})
export class ChartSourceRegistryService {
  private readonly sources: Map<string, ChartSourceConfig> = new Map();

  constructor() {
    this.register(OSM_RASTER_SOURCE);
    this.register(LOCAL_RASTER_SOURCE);
    this.register(LOCAL_VECTOR_SOURCE);
  }

  register(config: ChartSourceConfig): void {
    this.sources.set(config.id, config);
  }

  getSource(id: string): ChartSourceConfig | undefined {
    return this.sources.get(id);
  }

  getAllSources(): ChartSourceConfig[] {
    return Array.from(this.sources.values());
  }
}
