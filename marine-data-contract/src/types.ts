import type { SignalKPath } from "./paths.js";
import { QualityFlag } from "./quality.js";

export type Timestamp = string;

export interface SourceRef {
  label?: string;
  type?: string;
  priority?: number;
  fallback?: string;
  validityTimeoutMs?: number;
}

export interface DataPoint<T> {
  // Signal K context (e.g., "vessels.self" or "vessels.urn:mrn:imo:mmsi:123456789")
  context?: string;
  path: SignalKPath;
  value: T;
  timestamp: Timestamp;
  source?: SourceRef;
  quality?: QualityFlag;
}

const toTimestampMs = (input: Timestamp | Date | number): number | null => {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (input instanceof Date) {
    const ms = input.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(input);
  return Number.isFinite(ms) ? ms : null;
};

export const DEFAULT_MAX_CLOCK_DRIFT_MS = 2_000;

export interface TimestampNormalizationResult {
  timestamp: Timestamp;
  driftMs: number;
  wasClamped: boolean;
}

export const normalizeTimestamp = (
  input?: Timestamp | Date | number,
  options?: { nowMs?: number; maxDriftMs?: number },
): TimestampNormalizationResult => {
  const nowMs = options?.nowMs ?? Date.now();
  const maxDriftMs = options?.maxDriftMs ?? DEFAULT_MAX_CLOCK_DRIFT_MS;
  const inputMs = input === undefined ? null : toTimestampMs(input);

  if (inputMs === null) {
    return {
      timestamp: new Date(nowMs).toISOString(),
      driftMs: 0,
      wasClamped: true,
    };
  }

  const driftMs = inputMs - nowMs;
  if (Math.abs(driftMs) > maxDriftMs) {
    return {
      timestamp: new Date(nowMs).toISOString(),
      driftMs,
      wasClamped: true,
    };
  }

  return {
    timestamp: new Date(inputMs).toISOString(),
    driftMs,
    wasClamped: false,
  };
};

export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
}
