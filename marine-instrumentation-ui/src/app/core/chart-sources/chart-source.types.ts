export type ChartSourceType = 'raster' | 'vector';

export interface ChartSourceConfig {
  id: string;
  name: string;
  description?: string;
  type: ChartSourceType;
  attribution?: string;
  // MapLibre style properties
  style: any;
  minZoom?: number;
  maxZoom?: number;
}

export interface ChartSourceRegistryItem {
  id: string;
  name: string;
  description: string;
  config: ChartSourceConfig;
}
