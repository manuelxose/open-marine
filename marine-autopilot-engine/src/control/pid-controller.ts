import { clamp } from "./angle-utils.js";

export interface PidConfig {
  kp: number;
  ki: number;
  kd: number;
  /** Errors with magnitude below this (same unit as error) produce zero output. */
  deadband: number;
  /** Symmetric clamp on the integral term contribution (anti-windup). */
  integralLimit: number;
  /** Output clamp (e.g. rudder demand in degrees). */
  outputMin: number;
  outputMax: number;
}

/**
 * Generic PID controller with deadband, integral anti-windup clamp and output
 * limiting. Stateless across resets; call {@link reset} when (re)engaging so a
 * stale integral/derivative does not cause a kick.
 */
export class PidController {
  private integral = 0;
  private prevError: number | null = null;

  constructor(private config: PidConfig) {}

  /** Replace tunables at runtime (e.g. from the settings UI). */
  setConfig(config: PidConfig): void {
    this.config = config;
  }

  reset(): void {
    this.integral = 0;
    this.prevError = null;
  }

  /**
   * @param error    setpoint - measurement (degrees)
   * @param dtSeconds elapsed time since the previous update; ignored if <= 0
   * @returns clamped control output (degrees of rudder demand)
   */
  update(error: number, dtSeconds: number): number {
    const { kp, ki, kd, deadband, integralLimit, outputMin, outputMax } = this.config;

    if (Math.abs(error) <= deadband) {
      // Inside the deadband we hold the integral but emit no proportional drive
      // so the rudder is not constantly hunting around the setpoint.
      this.prevError = error;
      return clamp(this.integralTerm(), outputMin, outputMax);
    }

    if (dtSeconds > 0) {
      this.integral += error * dtSeconds;
      const maxIntegral = ki > 0 ? integralLimit / ki : 0;
      this.integral = clamp(this.integral, -maxIntegral, maxIntegral);
    }

    let derivative = 0;
    if (this.prevError !== null && dtSeconds > 0) {
      derivative = (error - this.prevError) / dtSeconds;
    }
    this.prevError = error;

    const output = kp * error + this.integralTerm() + kd * derivative;
    return clamp(output, outputMin, outputMax);
  }

  private integralTerm(): number {
    return this.config.ki * this.integral;
  }
}
