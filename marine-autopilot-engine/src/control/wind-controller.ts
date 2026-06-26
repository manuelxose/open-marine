import { PidController, type PidConfig } from "./pid-controller.js";
import { shortestAngleDiff } from "./angle-utils.js";

export interface WindHazard {
  /** Apparent wind angle crossed the bow/stern → possible accidental tack/gybe. */
  accidentalTack: boolean;
  accidentalGybe: boolean;
  /** Sudden gust relative to the running average apparent wind speed. */
  gust: boolean;
}

/**
 * WIND VANE mode controller: keeps a target apparent wind angle (AWA) rather
 * than a fixed heading. `error = target_awa - current_awa`. Also flags wind
 * hazards (accidental tack/gybe, gusts) so the engine/UI can react.
 *
 * Note: full hazard mitigation is refined in phase 3; this provides the control
 * law and detection signals.
 */
export class WindController {
  private readonly pid: PidController;
  private awsAverage: number | null = null;
  private prevAwa: number | null = null;

  constructor(
    config: PidConfig,
    /** Fraction over the running-average AWS that counts as a gust. */
    private readonly gustFactor = 1.4,
    /** AWS smoothing factor (0..1); higher reacts faster. */
    private readonly awsSmoothing = 0.1,
  ) {
    this.pid = new PidController(config);
  }

  setConfig(config: PidConfig): void {
    this.pid.setConfig(config);
  }

  reset(): void {
    this.pid.reset();
    this.awsAverage = null;
    this.prevAwa = null;
  }

  /**
   * The sign convention mirrors the rudder: a positive target AWA means wind on
   * starboard. We steer to reduce the AWA error, but invert because bearing away
   * from the wind requires opposite rudder than heading up.
   *
   * @returns commanded rudder angle in degrees (positive = starboard).
   */
  computeRudder(targetAwaDeg: number, currentAwaDeg: number, dtSeconds: number): number {
    const error = shortestAngleDiff(targetAwaDeg, currentAwaDeg);
    // To keep AWA constant, steering up-wind (reducing |AWA|) requires turning
    // toward the wind; the rudder sign is the negative of the heading case.
    return -this.pid.update(error, dtSeconds);
  }

  /** Update detectors and return current hazard flags. */
  evaluateHazards(currentAwaDeg: number, awsKt: number): WindHazard {
    this.awsAverage =
      this.awsAverage === null
        ? awsKt
        : this.awsAverage + this.awsSmoothing * (awsKt - this.awsAverage);

    const gust = this.awsAverage > 0 && awsKt > this.awsAverage * this.gustFactor;

    let accidentalTack = false;
    let accidentalGybe = false;
    if (this.prevAwa !== null) {
      const prevSign = Math.sign(this.prevAwa);
      const curSign = Math.sign(currentAwaDeg);
      if (prevSign !== 0 && curSign !== 0 && prevSign !== curSign) {
        // Crossed through 0° (head to wind) → tack; through 180° → gybe.
        const crossedBow = Math.abs(this.prevAwa) < 90 && Math.abs(currentAwaDeg) < 90;
        if (crossedBow) {
          accidentalTack = true;
        } else {
          accidentalGybe = true;
        }
      }
    }
    this.prevAwa = currentAwaDeg;

    return { accidentalTack, accidentalGybe, gust };
  }
}
