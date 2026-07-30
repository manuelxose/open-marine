import type { AreaGeometry } from '../types/package.types.js';

const MAX_LATITUDE = 85.05112878;

export const validateAreaGeometry = (value: unknown): AreaGeometry => {
  if (!value || typeof value !== 'object' || (value as { type?: unknown }).type !== 'Polygon') {
    throw new Error('Invalid area geometry: a GeoJSON Polygon is required');
  }
  const coordinates = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 1 || !Array.isArray(coordinates[0])) {
    throw new Error('Invalid area geometry: exactly one exterior ring is required');
  }
  const ring = coordinates[0] as unknown[];
  if (ring.length < 4 || ring.length > 2_000) {
    throw new Error('Invalid area geometry: the ring must contain between 4 and 2000 positions');
  }
  const normalized = ring.map((position) => {
    if (!Array.isArray(position) || position.length < 2) {
      throw new Error('Invalid area geometry position');
    }
    const lon = Number(position[0]);
    const lat = Number(position[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -MAX_LATITUDE || lat > MAX_LATITUDE) {
      throw new Error('Invalid area geometry coordinate');
    }
    return [lon, lat];
  });
  const first = normalized[0]!;
  const last = normalized[normalized.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    normalized.push([...first]);
  }
  if (Math.abs(signedRingArea(normalized)) < 1e-8) {
    throw new Error('Invalid area geometry: polygon has no area');
  }
  return { type: 'Polygon', coordinates: [normalized] };
};

export const geometryBounds = (geometry: AreaGeometry): [number, number, number, number] => {
  const points = geometry.coordinates[0]!;
  const longitudes = points.map(([lon]) => lon!);
  const latitudes = points.map(([, lat]) => lat!);
  const ordinaryWest = Math.min(...longitudes);
  const ordinaryEast = Math.max(...longitudes);

  // Choose the smaller longitude span. A west > east bbox represents an
  // antimeridian-crossing polygon throughout the package planner.
  const shifted = longitudes.map((lon) => (lon < 0 ? lon + 360 : lon));
  const shiftedWest = Math.min(...shifted);
  const shiftedEast = Math.max(...shifted);
  const crossesAntimeridian = shiftedEast - shiftedWest < ordinaryEast - ordinaryWest;
  const west = crossesAntimeridian ? normalizeLongitude(shiftedWest) : ordinaryWest;
  const east = crossesAntimeridian ? normalizeLongitude(shiftedEast) : ordinaryEast;
  return [west, Math.min(...latitudes), east, Math.max(...latitudes)];
};

export const rectangleGeometry = (bounds: [number, number, number, number]): AreaGeometry => {
  const [west, south, east, north] = bounds;
  return validateAreaGeometry({
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  });
};

export const boundsIntersect = (
  left: [number, number, number, number],
  right: [number, number, number, number],
): boolean => {
  if (left[3] < right[1] || left[1] > right[3]) return false;
  return longitudeRanges(left).some(([lw, le]) =>
    longitudeRanges(right).some(([rw, re]) => le >= rw && lw <= re),
  );
};

const longitudeRanges = (bounds: [number, number, number, number]): Array<[number, number]> =>
  bounds[0] <= bounds[2]
    ? [[bounds[0], bounds[2]]]
    : [[bounds[0], 180], [-180, bounds[2]]];

const normalizeLongitude = (longitude: number): number =>
  longitude > 180 ? longitude - 360 : longitude;

const signedRingArea = (ring: number[][]): number =>
  ring.slice(0, -1).reduce((area, [x1, y1], index) => {
    const [x2, y2] = ring[index + 1]!;
    return area + x1! * y2! - x2! * y1!;
  }, 0) / 2;

