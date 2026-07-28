import type { Logger } from "../../app/logger.js";
import type { DriveCommand, MotorController, MotorFeedback } from "../../types.js";

/**
 * Explicit hardware-in-the-loop backend. The virtual rudder closes the
 * simulated navigation loop while the real Pico mirrors only a capped demand.
 * It is deliberately separate from the ordinary simulation platform.
 */
export class HilMotor implements MotorController {
  private enabled = false;
  private expired = false;
  private enabledAtMs = 0;

  constructor(
    private readonly physical: MotorController,
    private readonly simulated: MotorController,
    private readonly maxDuty: number,
    private readonly maxSessionMs: number,
    private readonly log: Logger,
    private readonly now: () => number = Date.now,
  ) {}

  async init(): Promise<void> {
    await this.physical.init();
    await this.simulated.init();
    await this.disable();
    this.log.info(
      `HIL motor ready (physical cap=${Math.round(this.maxDuty * 100)}%, session=${this.maxSessionMs}ms)`,
    );
  }

  async enable(): Promise<void> {
    this.expired = false;
    this.enabledAtMs = this.now();
    await this.physical.enable();
    await this.simulated.enable();
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.enabled = false;
    await this.physical.disable();
    await this.simulated.disable();
  }

  command(cmd: DriveCommand): void {
    if (!this.enabled || this.expired) return;
    this.simulated.command(cmd);
    this.physical.command({
      rudderDeg: cmd.rudderDeg,
      drive: Math.max(-this.maxDuty, Math.min(this.maxDuty, cmd.drive)),
    });
  }

  heartbeat(nowMs: number): void {
    if (this.enabled && nowMs - this.enabledAtMs >= this.maxSessionMs) {
      this.expired = true;
      this.enabled = false;
      this.physical.command({ rudderDeg: 0, drive: 0 });
      void this.physical.disable();
      void this.simulated.disable();
      this.log.warn("HIL session limit reached; physical motor stopped");
      return;
    }
    this.physical.heartbeat(nowMs);
    this.simulated.heartbeat(nowMs);
  }

  getFeedback(): MotorFeedback {
    const physical = this.physical.getFeedback();
    const simulated = this.simulated.getFeedback();
    return {
      rudderAngleDeg: simulated.rudderAngleDeg,
      motorCurrentA: physical.motorCurrentA,
      enabled: this.enabled && physical.enabled,
      clutch: this.enabled && physical.clutch,
      ...(this.expired
        ? { fault: "hil-session-timeout" }
        : physical.fault
          ? { fault: physical.fault }
          : {}),
    };
  }

  async shutdown(): Promise<void> {
    await this.disable();
    await this.physical.shutdown();
    await this.simulated.shutdown();
  }
}
