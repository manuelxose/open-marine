import { PidController, type PidConfig } from "./pid-controller.js";
import { shortestAngleDiff, clamp } from "./angle-utils.js";

export interface TrackInputs {
  /** Cross-track error in metres (positive = boat is to starboard of track). */
  xteMeters: number;
  /** Bearing to the active waypoint, degrees true. */
  bearingToWaypointDeg: number;
  /** Current heading, degrees true. */
  headingDeg: number;
}

/**
 * TRACK / GPS mode controller: steers to a route. The demanded heading is the
 * bearing to the waypoint corrected by a cross-track term, then a heading PID
 * produces the rudder. The XTE correction is clamped so a large offset cannot
 * command an extreme heading change.
 *
 * Refined in phase 4 (sailing-limit guard, route sequencing).
 */
export class TrackController {
  private readonly pid: PidController;

  constructor(
    config: PidConfig,
    /** Degrees of heading correction per metre of XTE. */
    private readonly xteGainDegPerMeter = 2,
    /** Maximum heading correction applied for cross-track error. */
    private readonly maxXteCorrectionDeg = 30,
  ) {
    this.pid = new PidController(config);
  }

  setConfig(config: PidConfig): void {
    this.pid.setConfig(config);
  }

  reset(): void {
    this.pid.reset();
  }

  /** Heading the boat should steer to close the track, degrees true. */
  demandedHeading(inputs: TrackInputs): number {
    const correction = clamp(
      -inputs.xteMeters * this.xteGainDegPerMeter,
      -this.maxXteCorrectionDeg,
      this.maxXteCorrectionDeg,
    );
    return inputs.bearingToWaypointDeg + correction;
  }

  /**
   * @returns commanded rudder angle in degrees (positive = starboard).
   */
  computeRudder(inputs: TrackInputs, dtSeconds: number): number {
    const targetHeading = this.demandedHeading(inputs);
    const error = shortestAngleDiff(targetHeading, inputs.headingDeg);
    return this.pid.update(error, dtSeconds);
  }
}
