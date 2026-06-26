import type { AutopilotFaultReason, AutopilotState } from "@omi/marine-data-contract";
import type { SensorSnapshot } from "../types.js";
import { isLowBattery, isOvercurrent, type LimitConfig } from "./limits.js";

export type FaultAction = "none" | "fault" | "demote";

export interface FaultEvaluation {
  reason: AutopilotFaultReason;
  action: FaultAction;
  /** For `demote`, the state to fall back to. */
  demoteTo?: AutopilotState;
}

const OK: FaultEvaluation = { reason: "none", action: "none" };

/**
 * Centralises the mandatory safety rules. Pure function of the latest snapshot
 * and the current state so it is trivially testable. The engine applies the
 * result: `fault` cuts the motor and enters FAULT; `demote` drops to a safer
 * mode (e.g. WIND→HEADING/STANDBY when the wind sensor is lost).
 *
 * Priority: emergency-stop > overcurrent > low-battery > heading loss >
 * mode-specific sensor loss.
 */
export const evaluateFaults = (
  snapshot: SensorSnapshot,
  state: AutopilotState,
  limits: LimitConfig,
): FaultEvaluation => {
  const engaged = state !== "standby" && state !== "fault";

  // Hard cuts apply regardless of engagement so a fault is latched on the spot.
  if (snapshot.emergencyStop) {
    return { reason: "emergency-stop", action: "fault" };
  }
  if (isOvercurrent(snapshot.motorCurrentA, limits.currentLimitA)) {
    return { reason: "overcurrent", action: "fault" };
  }
  if (isLowBattery(snapshot.batteryVoltage, limits.voltageCutoff)) {
    return { reason: "low-battery", action: "fault" };
  }

  if (!engaged) {
    return OK;
  }

  // Compass/IMU is the primary reference for every steering mode → hard fault.
  if (!snapshot.headingValid) {
    return { reason: "heading-sensor-lost", action: "fault" };
  }

  if (state === "wind" && !snapshot.windValid) {
    return {
      reason: "wind-sensor-lost",
      action: "demote",
      demoteTo: snapshot.headingValid ? "heading" : "standby",
    };
  }

  if (state === "track" && !snapshot.positionValid) {
    return {
      reason: "gps-lost",
      action: "demote",
      demoteTo: snapshot.headingValid ? "heading" : "standby",
    };
  }

  return OK;
};
