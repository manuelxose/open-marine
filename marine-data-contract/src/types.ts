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

/** 3-axis vector (accel, gyro, mag) */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Vessel attitude (roll = heel, pitch = trim, yaw = heading) */
export interface Attitude {
  roll: number;
  pitch: number;
  yaw: number;
}

/** GPS fix quality */
export type GpsFixType = "none" | "2d" | "3d" | "dgps";

/** GPS satellite info */
export interface GpsSatelliteInfo {
  inView: number;
  used: number;
  hdop?: number;
  pdop?: number;
  vdop?: number;
}

/**
 * Autopilot operating state, published on `steering.autopilot.state`.
 * `heading` keeps a compass heading, `wind` keeps an apparent wind angle,
 * `track` follows a GPS route, `calibration` runs setup routines and
 * `fault` means the safety layer has disabled the drive.
 */
export type AutopilotState =
  | "standby"
  | "heading"
  | "wind"
  | "track"
  | "fault"
  | "calibration";

/** Reference the control loop is currently steering to. */
export type AutopilotMode = "compass" | "wind" | "gps";

/** Why the autopilot dropped into FAULT (published on `steering.autopilot.fault`). */
export type AutopilotFaultReason =
  | "none"
  | "heading-sensor-lost"
  | "wind-sensor-lost"
  | "gps-lost"
  | "overcurrent"
  | "low-battery"
  | "emergency-stop"
  | "watchdog-timeout"
  | "rudder-sensor-lost"
  | "drive-blocked";

/** Snapshot describing the live autopilot status (engine → API/UI). */
export interface AutopilotStatus {
  state: AutopilotState;
  mode: AutopilotMode;
  engaged: boolean;
  fault: AutopilotFaultReason;
  /** Target heading in radians (true), when in heading/track modes. */
  targetHeadingTrue?: number;
  /** Target apparent wind angle in radians, when in wind mode. */
  targetWindAngleApparent?: number;
  /** Commanded rudder angle in radians (control output). */
  targetRudderAngle?: number;
  /** Measured rudder angle in radians, when a rudder sensor is present. */
  rudderAngle?: number;
}
