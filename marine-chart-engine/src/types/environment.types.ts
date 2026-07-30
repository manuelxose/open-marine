export type EnvironmentalLayerId =
  | 'bathymetry'
  | 'seaTemperature'
  | 'airTemperature'
  | 'wind'
  | 'currents'
  | 'waves'
  | 'precipitation'
  | 'clouds'
  | 'pressure';

export type EnvironmentalDataState = 'observed' | 'forecast' | 'cached' | 'stale' | 'unavailable';
export type EnvironmentalRenderKind = 'raster' | 'vector' | 'timeseries';
export type CompatibleChartKind = 'raster' | 'vector' | 'bathymetry';

export interface EnvironmentalLayerDescriptor {
  id: EnvironmentalLayerId;
  label: string;
  unit: string;
  provider: string;
  renderKind: EnvironmentalRenderKind;
  state: EnvironmentalDataState;
  available: boolean;
  attribution: string;
  minZoom: number;
  maxZoom: number;
  tileUrl?: string;
  vectorUrl?: string;
  updatedAt?: string;
  validTimes: string[];
  compatibleMapKinds: CompatibleChartKind[];
  coverage?: [number, number, number, number];
  compatibilityNote: string;
  message?: string;
}

export interface TideEvent {
  time: string;
  heightMeters: number;
  type: 'high' | 'low';
}

export interface TideDay {
  portId: 29;
  port: 'Vigo';
  latitude: number;
  longitude: number;
  date: string;
  timezone: 'Europe/Madrid';
  state: Exclude<EnvironmentalDataState, 'forecast' | 'unavailable'> | 'forecast';
  fetchedAt: string;
  ageSeconds: number;
  events: TideEvent[];
  attribution: string;
}
