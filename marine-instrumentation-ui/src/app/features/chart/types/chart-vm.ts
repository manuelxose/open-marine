export type ChartFixState = 'no-fix' | 'fix' | 'stale';

export interface ChartPosition {
  lat: number;
  lon: number;
}

export interface ChartHudRow {
  label: string;
  value: string;
  unit: string;
}

export interface ChartCanvasVm {
  fixState: ChartFixState;
  hasFix: boolean;
  center: ChartPosition;
  statusLabel: string;
  centerLabel: string;
}

export interface ChartHudVm {
  fixState: ChartFixState;
  statusLabel: string;
  ageLabel: string;
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
