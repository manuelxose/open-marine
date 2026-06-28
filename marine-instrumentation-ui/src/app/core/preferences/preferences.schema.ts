export type ThemeMode = 'day' | 'night';
export type SpeedUnit = 'kn' | 'm/s' | 'km/h';
export type DepthUnit = 'm' | 'ft';

export interface UnitPreferences {
  speed: SpeedUnit;
  depth: DepthUnit;
}

export interface ChartPreferences {
  autoCenter: boolean;
  trackLengthMinutes: number;
  source: 'signalk' | 'mock';
  mapSourceId: string;
}

export interface UserPreferences {
  version: number;
  theme: ThemeMode;
  units: UnitPreferences;
  chart: ChartPreferences;
  shallowThreshold: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: 1,
  theme: 'day',
  units: {
    speed: 'kn',
    depth: 'm',
  },
  chart: {
    autoCenter: true,
    trackLengthMinutes: 60,
    source: 'signalk',
    mapSourceId: 'osm-raster',
  },
  shallowThreshold: 3.0,
};
