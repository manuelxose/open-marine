const KNOTS_PER_MPS = 1.9438444924406;
const EARTH_RADIUS_KM = 6371.0088;

export const knotsToMetersPerSecond = (knots: number): number => knots / KNOTS_PER_MPS;
export const metersPerSecondToKnots = (metersPerSecond: number): number => metersPerSecond * KNOTS_PER_MPS;

/** Converts a meteorological FROM bearing into an eastward/northward TO vector. */
export const meteorologicalFromToVector = (
  speedMetersPerSecond: number,
  fromDegrees: number,
): { u: number; v: number } => {
  const radians = fromDegrees * Math.PI / 180;
  return {
    u: -speedMetersPerSecond * Math.sin(radians),
    v: -speedMetersPerSecond * Math.cos(radians),
  };
};

/** Converts an eastward/northward TO vector into a clockwise bearing. */
export const vectorToBearing = (u: number, v: number): number =>
  (Math.atan2(u, v) * 180 / Math.PI + 360) % 360;

export const oceanographicFromToVector = (
  speedMetersPerSecond: number,
  fromDegrees: number,
): { u: number; v: number } => meteorologicalFromToVector(speedMetersPerSecond, fromDegrees);

export const geodesicDistanceKm = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number => {
  const toRadians = Math.PI / 180;
  const lat1 = latitudeA * toRadians;
  const lat2 = latitudeB * toRadians;
  const deltaLat = (latitudeB - latitudeA) * toRadians;
  const deltaLon = (longitudeB - longitudeA) * toRadians;
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

