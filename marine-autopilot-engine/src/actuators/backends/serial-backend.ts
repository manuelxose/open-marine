import { openSync, writeSync, closeSync } from "node:fs";
import type { Logger } from "../../app/logger.js";
import type { MotorController, MotorFeedback } from "../../types.js";

export interface SerialBackendConfig {
  /** Serial device path, e.g. /dev/ttyAMA0. Configure baud with `stty` first. */
  port: string;
  baud: number;
}

/**
 * UART backend to the auxiliary microcontroller (the recommended real path).
 * The Raspberry sends a rudder demand + enable flag and a periodic heartbeat;
 * the microcontroller does the real-time PWM/direction/enable and, crucially,
 * cuts the motor if the heartbeat stops (hardware failsafe independent of this
 * software). Protocol is documented in docs/MOTOR_PROTOCOL.md.
 *
 * Telemetry parsing (rudder/current echo) is wired in phase 2; until then the
 * engine reads rudder angle and motor current from the Signal K sensors.
 */
export class SerialMotor implements MotorController {
  private fd: number | null = null;
  private enabled = false;
  private lastRudderDemand = 0;

  constructor(
    private readonly config: SerialBackendConfig,
    private readonly log: Logger,
  ) {}

  async init(): Promise<void> {
    try {
      this.fd = openSync(this.config.port, "w");
      this.log.info(`serial motor backend on ${this.config.port} @ ${this.config.baud}`);
    } catch (error) {
      this.fd = null;
      this.log.error(
        `failed to open serial port ${this.config.port}; motor will stay disabled`,
        error,
      );
    }
    // Boot disabled — motor is never live by default.
    this.writeFrame(`C,0,0`);
  }

  async enable(): Promise<void> {
    this.enabled = true;
    this.writeFrame(`C,${this.lastRudderDemand.toFixed(1)},1`);
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.writeFrame(`C,0,0`);
  }

  command(rudderDemandDeg: number): void {
    this.lastRudderDemand = rudderDemandDeg;
    if (this.enabled) {
      this.writeFrame(`C,${rudderDemandDeg.toFixed(1)},1`);
    }
  }

  heartbeat(): void {
    this.writeFrame("H");
  }

  getFeedback(): MotorFeedback {
    // Telemetry echo parsed in phase 2; rudder/current come from SK for now.
    return {
      rudderAngleDeg: undefined,
      motorCurrentA: undefined,
      enabled: this.enabled,
      clutch: this.enabled,
    };
  }

  async shutdown(): Promise<void> {
    await this.disable();
    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }
  }

  private writeFrame(payload: string): void {
    if (this.fd === null) {
      return;
    }
    try {
      writeSync(this.fd, `${payload}\n`);
    } catch (error) {
      this.log.error("serial write failed", error);
    }
  }
}
