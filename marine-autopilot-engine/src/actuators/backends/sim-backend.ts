import type { Logger } from "../../app/logger.js";
import type { DriveCommand, MotorController, MotorFeedback } from "../../types.js";
import type { SimWorld } from "../../sim/sim-world.js";

/**
 * Simulated motor backend for the test bench. Writes the rudder demand into the
 * shared {@link SimWorld} and reads rudder/current back from it. Honours
 * enable/disable so the bench reflects the real failsafe behaviour.
 */
export class SimMotor implements MotorController {
  private enabled = false;

  constructor(
    private readonly world: SimWorld,
    private readonly log: Logger,
  ) {}

  async init(): Promise<void> {
    this.world.setDriveEnabled(false);
    this.log.info("sim motor backend ready");
  }

  async enable(): Promise<void> {
    this.enabled = true;
    this.world.setDriveEnabled(true);
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.world.setRudderDemand(0);
    this.world.setDriveEnabled(false);
  }

  command(cmd: DriveCommand): void {
    if (this.enabled) {
      // Position-aware backend: track the demanded rudder angle.
      this.world.setRudderDemand(cmd.rudderDeg);
    }
  }

  heartbeat(): void {
    // No-op for the sim; the SimWorld runs on its own timer.
  }

  getFeedback(): MotorFeedback {
    const s = this.world.getState();
    return {
      rudderAngleDeg: s.rudderAngleDeg,
      motorCurrentA: s.motorCurrentA,
      enabled: this.enabled,
      clutch: this.enabled,
    };
  }

  async shutdown(): Promise<void> {
    await this.disable();
    this.world.stop();
  }
}
