import { PidController, type PidConfig } from "./pid-controller.js";
import { shortestAngleDiff, clamp, wrapTo180, wrapTo360 } from "./angle-utils.js";

export interface TrackInputs {
  /** Cross-track error in metres (positive = boat is to starboard of track). */
  xteMeters: number;
  /** Bearing to the active waypoint, degrees true. */
  bearingToWaypointDeg: number;
  /** Current heading, degrees true. */
  headingDeg: number;
}

export interface SailingLimitResult {
  /** Heading to actually steer (clamped to the edge of the no-go zone if limited). */
  headingDeg: number;
  /** True when the demanded heading would point inside the no-go zone. */
  limited: boolean;
}

/**
 * Sailing-limit guard for TRACK mode: a route bearing may point too close to the
 * wind to sail. Given the demanded heading, the current heading and the current
 * apparent wind angle, this clamps the steered heading to the edge of the no-go
 * zone (|AWA| = tackAngle) on the same side, so the autopilot never tries to
 * steer a sailboat into irons. Apparent wind rotates opposite to heading:
 * `awaAt(h) = awa + heading - h`.
 */
export const applySailingLimit = (
  demandedDeg: number,
  headingDeg: number,
  awaDeg: number,
  tackAngleDeg: number,
): SailingLimitResult => {
  const awaAtTarget = wrapTo180(awaDeg + headingDeg - demandedDeg);
  if (Math.abs(awaAtTarget) >= tackAngleDeg) {
    return { headingDeg: wrapTo360(demandedDeg), limited: false };
  }
  const sign = awaAtTarget >= 0 ? 1 : -1;
  const limitedHeading = wrapTo360(awaDeg + headingDeg - sign * tackAngleDeg);
  return { headingDeg: limitedHeading, limited: true };
};

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
    return this.computeRudderToHeading(this.demandedHeading(inputs), inputs.headingDeg, dtSeconds);
  }

  /** Rudder to steer an explicit target heading (e.g. after a sailing-limit clamp). */
  computeRudderToHeading(targetHeadingDeg: number, headingDeg: number, dtSeconds: number): number {
    const error = shortestAngleDiff(targetHeadingDeg, headingDeg);
    return this.pid.update(error, dtSeconds);
  }
}
