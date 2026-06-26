import { PidController, type PidConfig } from "./pid-controller.js";
import { shortestAngleDiff } from "./angle-utils.js";

/**
 * HEADING / AUTO mode controller: keeps a fixed compass heading.
 * `error = shortestAngle(target_heading - current_heading)` so the boat always
 * turns the short way round and never spins through 360°.
 */
export class HeadingController {
  private readonly pid: PidController;

  constructor(config: PidConfig) {
    this.pid = new PidController(config);
  }

  setConfig(config: PidConfig): void {
    this.pid.setConfig(config);
  }

  reset(): void {
    this.pid.reset();
  }

  /**
   * @returns commanded rudder angle in degrees (positive = starboard).
   */
  computeRudder(targetHeadingDeg: number, currentHeadingDeg: number, dtSeconds: number): number {
    const error = shortestAngleDiff(targetHeadingDeg, currentHeadingDeg);
    return this.pid.update(error, dtSeconds);
  }
}
