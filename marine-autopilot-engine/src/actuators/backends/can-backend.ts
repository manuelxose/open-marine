import type { Logger } from "../../app/logger.js";
import type { DriveCommand, MotorController, MotorFeedback } from "../../types.js";

/**
 * CAN / NMEA2000 backend for actuators/drivers that are CAN-native. Stub:
 * socketcan wiring lands when this transport is needed. Stays disabled until
 * wired.
 */
export class CanMotor implements MotorController {
  private enabled = false;

  constructor(private readonly log: Logger) {}

  async init(): Promise<void> {
    this.log.warn("CAN backend is a stub; motor will not be driven");
  }

  async enable(): Promise<void> {
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.enabled = false;
  }

  command(cmd: DriveCommand): void {
    void cmd;
    // no-op stub: would map _cmd.drive → CAN actuator setpoint.
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
