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

const parseTimestampMs = (timestamp: Timestamp): number | null => {
  return toTimestampMs(timestamp);
};

export const DEFAULT_SOURCE_PRIORITY = 0;
export const DEFAULT_SOURCE_VALIDITY_TIMEOUT_MS = 10_000;

export const normalizeSourceRef = (
  source: SourceRef,
): SourceRef & { priority: number; validityTimeoutMs: number } => {
  return {
    ...source,
    priority: source.priority ?? DEFAULT_SOURCE_PRIORITY,
    validityTimeoutMs: source.validityTimeoutMs ?? DEFAULT_SOURCE_VALIDITY_TIMEOUT_MS,
  };
};

export const isSourceValid = (timestamp: Timestamp, nowMs: number, source?: SourceRef): boolean => {
  const ms = parseTimestampMs(timestamp);
  if (ms === null) {
    return false;
  }
  const validity = source?.validityTimeoutMs ?? DEFAULT_SOURCE_VALIDITY_TIMEOUT_MS;
  return nowMs - ms <= validity;
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

export type Angle = number;
export type Speed = number;
export type Depth = number;
export type Voltage = number;
export type Current = number;

export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
}
