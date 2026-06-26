import type {
  AutopilotFaultReason,
  AutopilotMode,
  AutopilotState,
  AutopilotStatus,
} from "@omi/marine-data-contract";
import type { SensorSnapshot } from "../types.js";

export const modeForState = (state: AutopilotState): AutopilotMode => {
  switch (state) {
    case "wind":
      return "wind";
    case "track":
      return "gps";
    default:
      return "compass";
  }
};

export const stateForMode = (mode: AutopilotMode): AutopilotState => {
  switch (mode) {
    case "wind":
      return "wind";
    case "gps":
      return "track";
    default:
      return "heading";
  }
};

export interface EngageResult {
  ok: boolean;
  reason?: string;
}

/**
 * Discrete autopilot state machine. Boots in STANDBY (motor never enabled by
 * default). Engagement captures the live setpoint (current heading or AWA) from
 * the supplied snapshot. Feasibility (e.g. valid heading before engaging) is
 * guarded by the engine, which has the sensor validity; this object owns the
 * state/targets and the legal transitions.
 */
export class StateMachine {
  private state: AutopilotState = "standby";
  private pendingMode: AutopilotMode = "compass";
  private fault: AutopilotFaultReason = "none";

  private targetHeadingDeg: number | undefined;
  private targetWindAngleDeg: number | undefined;

  getState(): AutopilotState {
    return this.state;
  }

  getStatus(): AutopilotStatus {
    return {
      state: this.state,
      mode: modeForState(this.state),
      engaged: this.state !== "standby" && this.state !== "fault",
      fault: this.fault,
      ...(this.targetHeadingDeg !== undefined ? { targetHeadingTrue: this.targetHeadingDeg } : {}),
      ...(this.targetWindAngleDeg !== undefined
        ? { targetWindAngleApparent: this.targetWindAngleDeg }
        : {}),
    };
  }

  getTargetHeadingDeg(): number | undefined {
    return this.targetHeadingDeg;
  }

  getTargetWindAngleDeg(): number | undefined {
    return this.targetWindAngleDeg;
  }

  /** UI sets the desired mode; engagement happens separately via {@link engage}. */
  setMode(mode: AutopilotMode): void {
    this.pendingMode = mode;
  }

  /** Active mode if engaged, otherwise the pending mode awaiting engagement. */
  getEffectiveMode(): AutopilotMode {
    const engaged = this.state !== "standby" && this.state !== "fault";
    return engaged ? modeForState(this.state) : this.pendingMode;
  }

  /** Engage the pending mode, capturing the live setpoint from the snapshot. */
  engage(snapshot: SensorSnapshot): EngageResult {
    if (this.state === "fault") {
      return { ok: false, reason: "fault must be cleared first" };
    }
    const target = stateForMode(this.pendingMode);

    if (target === "heading" || target === "track") {
      if (snapshot.headingTrueDeg === undefined || !snapshot.headingValid) {
        return { ok: false, reason: "no valid heading" };
      }
      this.targetHeadingDeg = snapshot.headingTrueDeg;
    }
    if (target === "wind") {
      if (snapshot.awaDeg === undefined || !snapshot.windValid) {
        return { ok: false, reason: "no valid apparent wind" };
      }
      this.targetWindAngleDeg = snapshot.awaDeg;
    }

    this.state = target;
    return { ok: true };
  }

  disengage(): void {
    if (this.state === "fault") {
      return;
    }
    this.state = "standby";
  }

  /** Set the absolute target for the current mode (radians handled at the API). */
  setTargetHeadingDeg(deg: number): void {
    this.targetHeadingDeg = deg;
  }
  setTargetWindAngleDeg(deg: number): void {
    this.targetWindAngleDeg = deg;
  }

  /** Nudge the active setpoint (dodge buttons). */
  dodge(deltaDeg: number): void {
    if (this.state === "heading" || this.state === "track") {
      if (this.targetHeadingDeg !== undefined) {
        this.targetHeadingDeg += deltaDeg;
      }
    } else if (this.state === "wind") {
      if (this.targetWindAngleDeg !== undefined) {
        this.targetWindAngleDeg += deltaDeg;
      }
    }
  }

  /** Track mode keeps its display heading in sync with the steered bearing. */
  updateTrackHeading(deg: number): void {
    if (this.state === "track") {
      this.targetHeadingDeg = deg;
    }
  }

  /** Hard fault: motor off + FAULT (latched until cleared by the operator). */
  raiseFault(reason: AutopilotFaultReason): void {
    this.state = "fault";
    this.fault = reason;
  }

  /** Soft demotion to a safer state (e.g. WIND→HEADING when wind is lost). */
  demote(to: AutopilotState): void {
    if (this.state === "fault") {
      return;
    }
    this.state = to;
  }

  clearFault(): void {
    if (this.state === "fault") {
      this.state = "standby";
      this.fault = "none";
    }
  }
}
