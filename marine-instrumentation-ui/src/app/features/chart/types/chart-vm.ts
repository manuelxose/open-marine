export type ChartFixState = 'no-fix' | 'fix' | 'stale';

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
}

export interface ChartControlsVm {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  canCenter: boolean;
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
