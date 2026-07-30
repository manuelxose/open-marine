import fs from 'node:fs';
import Database from 'better-sqlite3';
import type { ChartRegistryService } from './chart-registry.service.js';

export interface EncHazardQuery {
  chartIds: string[];
  position: { latitude: number; longitude: number };
  courseDeg: number;
  speedMps: number;
  draftM: number;
  underKeelClearanceM: number;
  safetyDepthM: number;
  lookAheadMinutes: number;
  corridorWidthM: number;
}

interface IndexedFeatureRow {
  id: number;
  object_class: string;
  layer: string;
  geometry_json: string;
  properties_json: string;
}

export class EncHazardService {
  constructor(private readonly registry: ChartRegistryService) {}

  query(request: EncHazardQuery): object {
    validate(request);
    const safetyDepthM = Math.max(
      request.safetyDepthM,
      request.draftM + request.underKeelClearanceM,
    );
    const distanceM = Math.max(100, request.speedMps * request.lookAheadMinutes * 60);
    const sector = corridorPolygon(
      request.position.latitude,
      request.position.longitude,
      request.courseDeg,
      distanceM,
      request.corridorWidthM,
    );
    const bounds = polygonBounds(sector.coordinates[0]!);
    const chartIds = request.chartIds.length > 0
      ? request.chartIds
      : this.registry.list().filter((chart) => chart.kind === 'vector' && chart.available).map((chart) => chart.id);
    const hazards: object[] = [];
    let minDepthM: number | null = null;
    let indexedCharts = 0;

    for (const chartId of chartIds) {
      const mbtiles = this.registry.mbtilesPath(chartId);
      const indexFile = mbtiles ? `${mbtiles}.enc-index.sqlite` : null;
      if (!indexFile || !fs.existsSync(indexFile)) continue;
      indexedCharts += 1;
      const database = new Database(indexFile, { readonly: true, fileMustExist: true });
      try {
        const rows = database.prepare(`
          SELECT f.id, f.object_class, f.layer, f.geometry_json, f.properties_json
          FROM enc_features f
          JOIN enc_features_rtree r ON r.id = f.id
          WHERE r.max_lon >= ? AND r.min_lon <= ? AND r.max_lat >= ? AND r.min_lat <= ?
          LIMIT 1000
        `).all(bounds[0], bounds[2], bounds[1], bounds[3]) as IndexedFeatureRow[];
        for (const row of rows) {
          const geometry = JSON.parse(row.geometry_json) as Record<string, unknown>;
          if (!geometryIntersectsPolygon(geometry, sector.coordinates[0]!)) continue;
          const properties = JSON.parse(row.properties_json) as Record<string, unknown>;
          const depth = featureDepth(properties);
          if (depth !== null) minDepthM = minDepthM === null ? depth : Math.min(minDepthM, depth);
          const isHazard = row.layer === 'hazards' || (depth !== null && depth <= safetyDepthM);
          if (!isHazard) continue;
          hazards.push({
            type: 'Feature',
            id: `${chartId}:${row.id}`,
            geometry,
            properties: {
              ...properties,
              chartId,
              unsafe: true,
              depthM: depth,
            },
          });
        }
      } finally {
        database.close();
      }
    }

    return {
      coverage: indexedCharts > 0 ? 'available' : 'unavailable',
      advisoryOnly: true,
      safetyDepthM,
      minDepthM,
      sector,
      hazards: { type: 'FeatureCollection', features: hazards },
      evaluatedChartIds: chartIds,
      indexedChartCount: indexedCharts,
    };
  }
}

const validate = (request: EncHazardQuery): void => {
  const values = [
    request.position.latitude, request.position.longitude, request.courseDeg,
    request.speedMps, request.draftM, request.underKeelClearanceM,
    request.safetyDepthM, request.lookAheadMinutes, request.corridorWidthM,
  ];
  if (!values.every(Number.isFinite)
    || Math.abs(request.position.latitude) > 90
    || Math.abs(request.position.longitude) > 180
    || request.speedMps < 0
    || request.lookAheadMinutes < 1 || request.lookAheadMinutes > 30
    || request.corridorWidthM < 10 || request.corridorWidthM > 2000) {
    throw new Error('Invalid ENC hazard query');
  }
};

const featureDepth = (properties: Record<string, unknown>): number | null => {
  for (const key of ['depth', 'valsou', 'valdco', 'drval2', 'drval1']) {
    const value = Number(properties[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

const corridorPolygon = (
  latitude: number,
  longitude: number,
  courseDeg: number,
  distanceM: number,
  widthM: number,
) => {
  const startLeft = destination(latitude, longitude, courseDeg - 90, widthM / 2);
  const startRight = destination(latitude, longitude, courseDeg + 90, widthM / 2);
  const end = destination(latitude, longitude, courseDeg, distanceM);
  const endRight = destination(end[1], end[0], courseDeg + 90, widthM / 2);
  const endLeft = destination(end[1], end[0], courseDeg - 90, widthM / 2);
  return {
    type: 'Polygon' as const,
    coordinates: [[startLeft, startRight, endRight, endLeft, startLeft]],
  };
};

const destination = (latitude: number, longitude: number, bearingDeg: number, distanceM: number): [number, number] => {
  const radius = 6_371_000;
  const angular = distanceM / radius;
  const bearing = bearingDeg * Math.PI / 180;
  const lat1 = latitude * Math.PI / 180;
  const lon1 = longitude * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular)
    + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
    Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
  );
  return [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI];
};

const polygonBounds = (ring: number[][]): [number, number, number, number] => [
  Math.min(...ring.map((point) => point[0]!)),
  Math.min(...ring.map((point) => point[1]!)),
  Math.max(...ring.map((point) => point[0]!)),
  Math.max(...ring.map((point) => point[1]!)),
];

const geometryIntersectsPolygon = (geometry: Record<string, unknown>, polygon: number[][]): boolean => {
  const positions = flattenPositions(geometry['coordinates']);
  if (positions.some((position) => pointInRing(position, polygon))) return true;
  const geometryType = String(geometry['type'] ?? '');
  if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
    const rings = geometryRings(geometry['coordinates']);
    if (rings.some((ring) => polygon.some((position) => pointInRing(position, ring)))) return true;
  }
  const geometrySegments = segmentsFromCoordinates(geometry['coordinates']);
  const polygonSegments = ringSegments(polygon);
  return geometrySegments.some(([start, end]) =>
    polygonSegments.some(([left, right]) => segmentsIntersect(start, end, left, right)));
};

const flattenPositions = (value: unknown): number[][] => {
  if (!Array.isArray(value)) return [];
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return [[value[0], value[1]]];
  }
  return value.flatMap(flattenPositions);
};

const geometryRings = (value: unknown): number[][][] => {
  if (!Array.isArray(value)) return [];
  if (value.length >= 4 && value.every((position) =>
    Array.isArray(position) && typeof position[0] === 'number' && typeof position[1] === 'number')) {
    return [value as number[][]];
  }
  return value.flatMap(geometryRings);
};

const segmentsFromCoordinates = (value: unknown): Array<[number[], number[]]> =>
  geometryRings(value).flatMap(ringSegments);

const ringSegments = (ring: number[][]): Array<[number[], number[]]> =>
  ring.slice(1).map((point, index) => [ring[index]!, point]);

const pointInRing = (point: number[], ring: number[][]): boolean => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]!;
    const prior = ring[previous]!;
    if ((current[1]! > point[1]!) !== (prior[1]! > point[1]!)
      && point[0]! < (prior[0]! - current[0]!) * (point[1]! - current[1]!)
        / ((prior[1]! - current[1]!) || Number.EPSILON) + current[0]!) inside = !inside;
  }
  return inside;
};

const segmentsIntersect = (a: number[], b: number[], c: number[], d: number[]): boolean => {
  const cross = (p: number[], q: number[], r: number[]): number =>
    (q[0]! - p[0]!) * (r[1]! - p[1]!) - (q[1]! - p[1]!) * (r[0]! - p[0]!);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return (abC === 0 || abD === 0 || Math.sign(abC) !== Math.sign(abD))
    && (cdA === 0 || cdB === 0 || Math.sign(cdA) !== Math.sign(cdB));
};
