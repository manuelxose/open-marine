import type { Logger } from "../../app/logger.js";
import type { DriveCommand, MotorController, MotorFeedback } from "../../types.js";

/**
 * Direct Raspberry-GPIO backend (PWM + direction + enable to a 12V H-bridge).
 * Stub: wiring to a GPIO library (e.g. pigpio) lands when this transport is
 * needed. Note this path has no failsafe independent of the Pi software, so the
 * UART-to-microcontroller backend remains the recommended default. Until wired
 * it stays disabled and commands nothing.
 */
export class GpioMotor implements MotorController {
  private enabled = false;

  constructor(private readonly log: Logger) {}

  async init(): Promise<void> {
    this.log.warn("GPIO backend is a stub; motor will not be driven");
  }

  async enable(): Promise<void> {
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.enabled = false;
  }

  command(_cmd: DriveCommand): void {
    // no-op stub: would map _cmd.drive → PWM + direction GPIO lines.
  }

  heartbeat(): void {
    // no-op stub
  }

  getFeedback(): MotorFeedback {
    return {
      rudderAngleDeg: undefined,
      motorCurrentA: undefined,
      enabled: this.enabled,
      clutch: this.enabled,
    };
  }

  async shutdown(): Promise<void> {
    this.enabled = false;
  }
}
