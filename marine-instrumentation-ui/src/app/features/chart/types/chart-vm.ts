export type ChartFixState = 'no-fix' | 'fix' | 'stale';

export type MapOrientation = 'north-up' | 'course-up';

export interface ChartPosition {
  lat: number;
  lon: number;
}

export interface ChartHudRow {
  labelKey: string;
  value: string;
  unit: string;
}

export interface ChartCanvasVm {
  fixState: ChartFixState;
  hasFix: boolean;
  center: ChartPosition;
  statusLabelKey: string;
  centerLabel: string;
}

export interface ChartHudVm {
  fixState: ChartFixState;
  statusLabelKey: string;
  ageSeconds: number | null;
  latLabel: string;
  lonLabel: string;
  rows: ChartHudRow[];
  canToggleAutopilot?: boolean; 
}

export interface ChartControlsVm {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
  showRangeRings: boolean;
  showOpenSeaMap: boolean;
  rangeRingIntervals: number[];
  canCenter: boolean;
  sourceId: string;
  showAisTargets: boolean;
  showAisLabels: boolean;
  showCpaLines: boolean;
}

export interface ChartWaypointVm {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: number;
  positionLabel: string;
}

export interface ChartWaypointListVm {
  waypoints: ChartWaypointVm[];
  activeId: string | null;
}

export type ChartDataQuality = 'good' | 'warn' | 'stale' | 'missing';

export interface TopBarMetricVm {
  value: number | null;
  formatted: string;
  quality: ChartDataQuality;
}

export interface TopBarPositionVm {
  lat: string;
  lon: string;
  quality: ChartDataQuality;
}

export interface TopBarActiveRouteVm {
  name: string;
  nextWaypointName: string;
  dtwNm: number;
  btwDeg: number;
  xteNm: number;
  vmgKnots: number | null;
  eta: string;
  ttg: string;
}

export interface ChartTopBarVm {
  sog: TopBarMetricVm;
  cog: TopBarMetricVm;
  hdg: TopBarMetricVm;
  position: TopBarPositionVm;
  utcTime: string;
  localTime: string;
  signalKConnected: boolean;
  signalKQuality: 'online' | 'degraded' | 'offline';
  activeRoute: TopBarActiveRouteVm | null;
}

export type ChartLeftPanelTab = 'layers' | 'ais' | 'waypoints' | 'routes';

export interface ChartRouteLegVm {
  from: string;
  to: string;
  bearingDeg: number;
  distanceNm: number;
  eta: string;
}

export interface ChartRouteListItemVm {
  id: string;
  name: string;
  waypointCount: number;
  totalDistanceNm: number;
  isActive: boolean;
  estimatedDuration: string;
  legs: ChartRouteLegVm[];
}

export interface ChartRoutesPanelVm {
  routes: ChartRouteListItemVm[];
}
