import type { FeatureCollection, LineString, Point } from 'geojson';

export interface WaypointFeatureProperties {
  id: string;
  name: string;
  active: boolean;
}

export type WaypointFeatureCollection = FeatureCollection<Point, WaypointFeatureProperties>;

export type RouteFeatureCollection = FeatureCollection<LineString>;

export type CpaLinesFeatureCollection = FeatureCollection<LineString>;
