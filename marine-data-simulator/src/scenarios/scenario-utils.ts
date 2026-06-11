import {
  QualityFlag,
  type Position,
  type SignalKPath,
  type SourceRef,
} from "@omi/marine-data-contract";
import type { ScenarioPoint } from "./scenario.js";

export const METERS_PER_DEG_LAT = 111_320;

export const DEFAULT_SOURCE_REF: SourceRef = {
  label: "mock",
  type: "virtual",
  priority: 10,
  fallback: "signalk",
  validityTimeoutMs: 5_000,
};

export const wrapRadians = (value: number): number => {
  const twoPi = Math.PI * 2;
  const wrapped = value % twoPi;
  return wrapped < 0 ? wrapped + twoPi : wrapped;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const randomInRange = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

export const stepPosition = (
  latitude: number,
  longitude: number,
  distanceMeters: number,
  cog: number,
): { latitude: number; longitude: number } => {
  const latRad = (latitude * Math.PI) / 180;
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(latRad);

  const north = Math.cos(cog) * distanceMeters;
  const east = Math.sin(cog) * distanceMeters;

  const deltaLat = north / METERS_PER_DEG_LAT;
  const deltaLon = east / metersPerDegLon;

  return {
    latitude: latitude + deltaLat,
    longitude: longitude + deltaLon,
  };
};

export const makePoint = (
  path: SignalKPath,
  value: number | Position | string,
  timestamp: string,
  quality: QualityFlag = QualityFlag.Good,
  context = "vessels.self",
  source: SourceRef = DEFAULT_SOURCE_REF,
): ScenarioPoint => ({
  path,
  value,
  timestamp,
  source,
  quality,
  context,
});

export const makePointWithContext = (
  context: string,
  path: SignalKPath | string,
  value: number | Position | string,
  timestamp: string,
  quality: QualityFlag = QualityFlag.Good,
): ScenarioPoint => ({
  path: path as any,
  value: value as any,
  timestamp,
  source: DEFAULT_SOURCE_REF,
  quality,
  context,
});
