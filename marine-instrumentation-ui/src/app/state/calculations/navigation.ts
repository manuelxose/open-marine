export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface BearingDistance {
  bearingDeg: number;
  distanceNm: number;
}

export const METERS_PER_NM = 1852;
export const KNOTS_PER_MPS = 1.9438444924406;

const EARTH_RADIUS_METERS = 6371000;

export const toRadians = (deg: number): number => (deg * Math.PI) / 180;
export const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

export const normalizeDegrees = (deg: number): number => {
  const normalized = deg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const normalizeLongitude = (lon: number): number => {
  const normalized = ((lon + 180) % 360 + 360) % 360 - 180;
  return normalized;
};

export const metersPerSecondToKnots = (mps: number): number => mps * KNOTS_PER_MPS;

export const haversineDistanceMeters = (from: GeoPoint, to: GeoPoint): number => {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

export const bearingDegrees = (from: GeoPoint, to: GeoPoint): number => {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLon = toRadians(to.lon - from.lon);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
};

export const bearingDistanceNm = (from: GeoPoint, to: GeoPoint): BearingDistance => {
  const distanceMeters = haversineDistanceMeters(from, to);
  return {
    bearingDeg: bearingDegrees(from, to),
    distanceNm: distanceMeters / METERS_PER_NM,
  };
};

export const projectDestination = (
  from: GeoPoint,
  bearingDeg: number,
  distanceMeters: number,
): GeoPoint => {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDeg);
  const lat1 = toRadians(from.lat);
  const lon1 = toRadians(from.lon);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);

  const lat2 = Math.asin(sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearingRad));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2),
    );

  return {
    lat: toDegrees(lat2),
    lon: normalizeLongitude(toDegrees(lon2)),
  };
};

export const formatFixed = (value: number | null | undefined, fraction: number): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return value.toFixed(fraction);
};

// ── Cross Track Error (XTE) ────────────────────────────────
// Formula: xte = asin(sin(d_ac / R) * sin(θ_ac − θ_ab)) * R
//   where d_ac = distance from leg start to vessel,
//         θ_ac = bearing from leg start to vessel,
//         θ_ab = bearing of the leg (start → end),
//         R    = earth radius.
// Returns signed NM: positive = starboard, negative = port.

export interface CrossTrackResult {
  /** Signed cross-track error in NM (positive = starboard, negative = port) */
  xteNm: number;
  /** Absolute XTE value */
  absXteNm: number;
  /** Side of the vessel relative to the leg */
  side: 'port' | 'starboard';
}

export const crossTrackErrorNm = (
  legStart: GeoPoint,
  legEnd: GeoPoint,
  vessel: GeoPoint,
): CrossTrackResult => {
  const dAcMeters = haversineDistanceMeters(legStart, vessel);
  const angularDistAc = dAcMeters / EARTH_RADIUS_METERS;
  const bearingAcRad = toRadians(bearingDegrees(legStart, vessel));
  const bearingAbRad = toRadians(bearingDegrees(legStart, legEnd));

  const xteRad = Math.asin(Math.sin(angularDistAc) * Math.sin(bearingAcRad - bearingAbRad));
  const xteMeters = xteRad * EARTH_RADIUS_METERS;
  const xteNm = xteMeters / METERS_PER_NM;

  return {
    xteNm,
    absXteNm: Math.abs(xteNm),
    side: xteNm >= 0 ? 'starboard' : 'port',
  };
};

// ── VMG (Velocity Made Good toward waypoint) ─────────────
// VMG = SOG × cos(COG − BRG_wp)
// Positive = closing on waypoint, negative = opening.

export const vmgToWaypointKnots = (
  sogKnots: number,
  cogDeg: number,
  bearingToWpDeg: number,
): number => {
  const deltaRad = toRadians(cogDeg - bearingToWpDeg);
  return sogKnots * Math.cos(deltaRad);
};
