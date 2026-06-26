/**
 * Per-sensor staleness budgets (ms). A value older than its budget is treated
 * as missing/invalid by the snapshot, which drives the safety rules (e.g. lost
 * heading → motor off). Conservative defaults; tune via the bench.
 */
export const SENSOR_TIMEOUTS = {
  heading: 1500,
  wind: 3000,
  position: 3000,
  course: 5000,
  rudder: 2000,
  motorCurrent: 2000,
  battery: 10000,
} as const;

/** Read a numeric Signal K value, returning undefined for non-finite/missing. */
export const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** Read a boolean-ish Signal K value (true / "true" / 1). */
export const readBool = (value: unknown): boolean =>
  value === true || value === 1 || value === "true";
