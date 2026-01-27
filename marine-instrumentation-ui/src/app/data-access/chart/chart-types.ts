export interface ChartPosition {
  lat: number;
  lon: number;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  ts: number;
}

export interface ChartVector {
  position: ChartPosition;
  headingDeg: number;
  sogMps: number | null;
}

export interface ChartWaypoint {
  id: string;
  lat: number;
  lon: number;
  label?: string;
}

export interface ChartMapClick {
  lat: number;
  lon: number;
  screenX: number;
  screenY: number;
}

export interface ChartMapEventHandlers {
  onClick?: (event: ChartMapClick) => void;
  onMoveStart?: () => void;
  onZoomStart?: () => void;
  onRotateStart?: () => void;
}

export interface ChartMapInit {
  container: HTMLElement;
  center: ChartPosition;
  zoom: number;
  sourceId?: string;
}
