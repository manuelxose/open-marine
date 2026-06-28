export type ChartKind = 'raster' | 'vector' | 'bathymetry';

export interface LocalChartSource {
  id: string;
  label: string;
  kind: ChartKind;
  storage: 'static' | 'mbtiles' | 'proxy';
  description?: string;
  attribution?: string;
  minZoom?: number;
  maxZoom?: number;
  tileUrl?: string;
  styleUrl?: string;
  mbtilesFile?: string;
  available: boolean;
  metadata?: Record<string, string>;
}

export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

export interface TilePayload {
  data: Buffer;
  contentType: string;
  contentEncoding?: string;
}

export type LocalChartRegistryEntry = Omit<LocalChartSource, 'available' | 'metadata'>;

export interface LocalChartRegistryFile {
  version: 1;
  charts: LocalChartRegistryEntry[];
}

export type ChartImportKind = 'mbtiles' | 'raster' | 's57' | 'area-download' | 'enc-download';

export type ChartJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ChartJob {
  id: string;
  kind: ChartImportKind;
  status: ChartJobStatus;
  chartId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: LocalChartSource;
}

export interface ChartImportRequest {
  id: string;
  label: string;
  kind: Extract<ChartKind, 'raster' | 'vector'>;
  sourceFile: string;
  description?: string;
  attribution?: string;
  minZoom?: number;
  maxZoom?: number;
  force?: boolean;
}
