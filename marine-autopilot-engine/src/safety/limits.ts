import { clamp } from "../control/angle-utils.js";

export interface LimitConfig {
  rudderLimitDeg: number;
  currentLimitA: number;
  voltageCutoff: number;
}

/** Clamp a rudder demand to the mechanical hard limit. */
export const clampRudder = (demandDeg: number, rudderLimitDeg: number): number =>
  clamp(demandDeg, -rudderLimitDeg, rudderLimitDeg);

export const isOvercurrent = (currentA: number | undefined, limitA: number): boolean =>
  currentA !== undefined && currentA > limitA;

export const isLowBattery = (voltage: number | undefined, cutoff: number): boolean =>
  voltage !== undefined && voltage < cutoff;
