
export interface DataPoint<T = unknown> {
  path: string;
  value: T;
  timestamp: number; // epoch ms
  source: string;
}

export interface HistoryPoint {
  timestamp: number;
  value: number;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  ts: number;
}

export type DataPointMap = Map<string, DataPoint>;

