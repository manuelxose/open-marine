export const UNITS = {
  angle: "rad",
  speed: "m/s",
  depth: "m",
  voltage: "V",
  current: "A",
} as const;

export const degToRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

export const radToDeg = (radians: number): number => {
  return (radians * 180) / Math.PI;
};

export const knotsToMetersPerSecond = (knots: number): number => {
  return knots * 0.514444;
};

export const metersPerSecondToKnots = (metersPerSecond: number): number => {
  return metersPerSecond / 0.514444;
};
