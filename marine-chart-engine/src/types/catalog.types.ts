/**
 * Core types for the marine chart catalog system.
 * All identifiers and comments in English per OMI conventions.
 */

export type ChartProviderRegion = 'global' | 'europe' | 'spain' | 'usa' | 'uk' | 'other';

export type ChartProviderKind = 'wms' | 'wmts' | 'xyz' | 'enc-s57' | 'enc-s63' | 'raster' | 'vector';

export type ChartAvailability = 'online' | 'offline-capable' | 'subscription' | 'manual-import';

export interface ChartProviderEndpoints {
  catalog?: string;
  tiles?: string;
  wms?: string;
  wmts?: string;
  download?: string;
}

export interface ChartSourceProvider {
  id: string;
  name: string;
  description: string;
  region: ChartProviderRegion;
  kind: ChartProviderKind;
  availability: ChartAvailability;
  attribution: string;
  license: string;
  endpoints: ChartProviderEndpoints;
  coverage?: GeoJSONPolygon;
  minZoom?: number;
  maxZoom?: number;
  enabled: boolean;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface RemoteChartEntry {
  id: string;
  providerId: string;
  /** Concrete tile proxy provider when the visible catalog provider is a group. */
  tileProviderId?: string;
  label: string;
  description?: string;
  scale?: number;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  minZoom?: number;
  maxZoom?: number;
  format: 's57' | 'mbtiles' | 'geotiff' | 'wms-layer' | 'xyz-tiles';
  downloadUrl?: string;
  sizeBytes?: number;
  lastUpdated?: string;
  /** WMS layer name, when this entry is a single WMS layer (used for layer-aware download). */
  wmsLayer?: string;
}

export interface TileCacheEntry {
  key: string;
  providerId: string;
  z: number;
  x: number;
  y: number;
  fetchedAt: string;
  ttlDays: number;
  contentType: string;
}

export interface DownloadJob {
  id: string;
  providerId: string;
  chartId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressPercent: number;
  bytesDownloaded: number;
  bytesTotal: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartCatalogFilter {
  region?: ChartProviderRegion;
  providerId?: string;
  bbox?: [number, number, number, number];
  kind?: ChartProviderKind;
}
