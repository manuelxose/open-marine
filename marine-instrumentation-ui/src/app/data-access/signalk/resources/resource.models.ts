// Signal K Resource Types
// Based on Signal K Specification for Resources

export interface SKPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface SKResourceBase {
  name?: string;
  description?: string;
  timestamp?: string;
  source?: string;
  group?: string;
}

export interface SKWaypoint extends SKResourceBase {
  position?: SKPosition;
  feature?: any; // GeoJSON Point
}

export interface SKRoute extends SKResourceBase {
  distance?: number;
  start?: string;
  end?: string;
  feature?: any; // GeoJSON LineString
}

export interface SKTrack extends SKResourceBase {
  feature?: any; // GeoJSON LineString or MultiLineString
}

export interface SKNote extends SKResourceBase {
  position?: SKPosition;
  region?: string;
  geohash?: string;
  mimeType?: string;
  url?: string;
}

export interface SKRegion extends SKResourceBase {
  feature?: any; // GeoJSON Polygon/MultiPolygon
}

export type ResourceType = 'waypoints' | 'routes' | 'notes' | 'regions' | 'tracks';

export interface ResourceMap<T> {
  [id: string]: T;
}
