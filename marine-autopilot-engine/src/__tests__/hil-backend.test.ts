import { test } from "node:test";
import assert from "node:assert/strict";
import { HilMotor } from "../actuators/backends/hil-backend.js";
import type { DriveCommand, MotorController, MotorFeedback } from "../types.js";
import { Logger } from "../app/logger.js";

class FakeMotor implements MotorController {
  enabled = false;
  commands: DriveCommand[] = [];
  feedback: MotorFeedback = {
    rudderAngleDeg: undefined,
    motorCurrentA: undefined,
    enabled: false,
    clutch: false,
  };

  async init(): Promise<void> {}
  async enable(): Promise<void> {
    this.enabled = true;
    this.feedback.enabled = true;
    this.feedback.clutch = true;
  }
  async disable(): Promise<void> {
    this.enabled = false;
    this.feedback.enabled = false;
    this.feedback.clutch = false;
  }
  command(command: DriveCommand): void {
    this.commands.push(command);
  }
  heartbeat(): void {}
  getFeedback(): MotorFeedback {
    return this.feedback;
  }
  async shutdown(): Promise<void> {
    await this.disable();
  }
}

test("HIL mirrors rudder to simulation and caps physical PWM at 10%", async () => {
  const physical = new FakeMotor();
  const simulated = new FakeMotor();
  simulated.feedback.rudderAngleDeg = 4;
  let now = 1_000;
  const hil = new HilMotor(
    physical,
    simulated,
    0.10,
    30_000,
    new Logger("hil-test", "error"),
    () => now,
  );

  await hil.init();
  await hil.enable();
  hil.command({ rudderDeg: 20, drive: 0.8 });

  assert.deepEqual(physical.commands.at(-1), { rudderDeg: 20, drive: 0.10 });
  assert.deepEqual(simulated.commands.at(-1), { rudderDeg: 20, drive: 0.8 });
  assert.equal(hil.getFeedback().rudderAngleDeg, 4);
});

test("HIL latches timeout and stops after 30 seconds", async () => {
  const physical = new FakeMotor();
  const simulated = new FakeMotor();
  let now = 10_000;
  const hil = new HilMotor(
    physical,
    simulated,
    0.10,
    30_000,
    new Logger("hil-test", "error"),
    () => now,
  );

  await hil.init();
  await hil.enable();
  now += 30_000;
  hil.heartbeat(now);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(physical.enabled, false);
  assert.equal(simulated.enabled, false);
  assert.equal(hil.getFeedback().fault, "hil-session-timeout");
});
