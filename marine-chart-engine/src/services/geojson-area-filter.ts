export interface AreaPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}
export interface AreaMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    geometry?: { type?: string; coordinates?: unknown };
  }>;
}

export const parseAreaPolygon = (value: unknown): AreaPolygon | null => {
  if (typeof value !== 'string' || value.length > 40_000) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AreaPolygon>;
    if (parsed.type !== 'Polygon' || !Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) return null;
    const valid = parsed.coordinates.every((ring) => Array.isArray(ring)
      && ring.length >= 4
      && ring.length <= 1000
      && ring.every((point) => Array.isArray(point)
        && point.length >= 2
        && Number.isFinite(point[0])
        && Number.isFinite(point[1])));
    return valid ? parsed as AreaPolygon : null;
  } catch {
    return null;
  }
};

export const filterFeatureCollection = <T extends GeoJsonFeatureCollection>(
  collection: T,
  polygon: AreaPolygon | null,
): T => {
  if (!polygon) return collection;
  return {
    ...collection,
    features: collection.features.filter((feature) => featureIntersectsArea(feature.geometry?.coordinates, polygon)),
  };
};

const featureIntersectsArea = (coordinates: unknown, polygon: AreaPolygon): boolean => {
  const positions = flattenPositions(coordinates);
  if (positions.length === 0) return false;
  if (positions.some(([longitude, latitude]) => pointInPolygon(longitude, latitude, polygon.coordinates))) {
    return true;
  }
  const west = Math.min(...positions.map((position) => position[0]));
  const east = Math.max(...positions.map((position) => position[0]));
  const south = Math.min(...positions.map((position) => position[1]));
  const north = Math.max(...positions.map((position) => position[1]));
  return polygon.coordinates[0]?.some(([longitude, latitude]) =>
    longitude! >= west && longitude! <= east && latitude! >= south && latitude! <= north) ?? false;
};

const flattenPositions = (value: unknown): Array<[number, number]> => {
  if (!Array.isArray(value)) return [];
  if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    return [[Number(value[0]), Number(value[1])]];
  }
  return value.flatMap(flattenPositions);
};

const pointInPolygon = (longitude: number, latitude: number, rings: number[][][]): boolean =>
  Boolean(rings[0] && pointInRing(longitude, latitude, rings[0]))
  && !rings.slice(1).some((ring) => pointInRing(longitude, latitude, ring));

export const pointInArea = (
  longitude: number,
  latitude: number,
  area: AreaPolygon | AreaMultiPolygon,
): boolean => area.type === 'Polygon'
  ? pointInPolygon(longitude, latitude, area.coordinates)
  : area.coordinates.some((polygon) => pointInPolygon(longitude, latitude, polygon));

const pointInRing = (longitude: number, latitude: number, ring: number[][]): boolean => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]!;
    const prior = ring[previous]!;
    const intersects = current[1]! > latitude !== prior[1]! > latitude
      && longitude < (prior[0]! - current[0]!) * (latitude - current[1]!)
        / ((prior[1]! - current[1]!) || Number.EPSILON) + current[0]!;
    if (intersects) inside = !inside;
  }
  return inside;
};
