import { test } from "node:test";
import assert from "node:assert/strict";
import { SimWorld } from "../sim/sim-world.js";
import { SimMotor } from "../actuators/backends/sim-backend.js";
import { HeadingController } from "../control/heading-controller.js";
import { Logger } from "../app/logger.js";
import { shortestAngleDiff } from "../control/angle-utils.js";

const silentLog = new Logger("test", "error");

test("HEADING closed loop converges to the target on the bench", async () => {
  const world = new SimWorld({ startLat: 43, startLon: -3, cruiseSpeedKt: 5 });
  const motor = new SimMotor(world, silentLog);
  await motor.init();
  await motor.enable();

  const controller = new HeadingController({
    kp: 1.2,
    ki: 0.05,
    kd: 8,
    deadband: 0.5,
    integralLimit: 15,
    outputMin: -35,
    outputMax: 35,
  });

  const targetDeg = 90;
  const dt = 0.1;
  for (let i = 0; i < 3000; i += 1) {
    const heading = world.getState().headingDeg;
    const rudderDeg = controller.computeRudder(targetDeg, heading, dt);
    motor.command({ rudderDeg, drive: rudderDeg / 35 });
    world.step(dt);
  }

  const finalError = Math.abs(shortestAngleDiff(targetDeg, world.getState().headingDeg));
  assert.ok(finalError < 3, `expected convergence within 3°, got ${finalError.toFixed(2)}°`);
});

test("rudder stays at zero while the drive is disabled", async () => {
  const world = new SimWorld({ startLat: 43, startLon: -3, cruiseSpeedKt: 5 });
  const motor = new SimMotor(world, silentLog);
  await motor.init();
  // Not enabled.
  motor.command({ rudderDeg: 30, drive: 30 / 35 });
  for (let i = 0; i < 50; i += 1) {
    world.step(0.1);
  }
  assert.ok(Math.abs(world.getState().rudderAngleDeg) < 1e-6);
  assert.ok(Math.abs(world.getState().headingDeg) < 1e-6);
});
