import { test } from "node:test";
import assert from "node:assert/strict";
import { WindController } from "../control/wind-controller.js";
import { SimWorld } from "../sim/sim-world.js";
import { SimMotor } from "../actuators/backends/sim-backend.js";
import { Logger } from "../app/logger.js";
import { shortestAngleDiff } from "../control/angle-utils.js";

const pid = { kp: 1.2, ki: 0.05, kd: 8, deadband: 0.5, integralLimit: 15, outputMin: -35, outputMax: 35 };
const silent = new Logger("test", "error");

test("detects an accidental tack (apparent wind crosses the bow)", () => {
  const wc = new WindController(pid);
  wc.evaluateHazards(20, 12); // on starboard tack, close-hauled
  const hz = wc.evaluateHazards(-20, 12); // crossed head-to-wind to port
  assert.equal(hz.accidentalTack, true);
  assert.equal(hz.accidentalGybe, false);
});

test("detects an accidental gybe (apparent wind crosses the stern)", () => {
  const wc = new WindController(pid);
  wc.evaluateHazards(170, 12); // running, wind on starboard quarter
  const hz = wc.evaluateHazards(-170, 12); // crossed dead-downwind to port quarter
  assert.equal(hz.accidentalGybe, true);
  assert.equal(hz.accidentalTack, false);
});

test("detects a gust relative to the running-average wind speed", () => {
  const wc = new WindController(pid);
  for (let i = 0; i < 5; i += 1) {
    wc.evaluateHazards(30, 10);
  }
  const hz = wc.evaluateHazards(30, 20); // sudden doubling
  assert.equal(hz.gust, true);
});

test("WIND closed loop holds the set apparent wind angle on the bench", async () => {
  const world = new SimWorld({
    startLat: 43,
    startLon: -3,
    cruiseSpeedKt: 5,
    trueWindDirDeg: 60,
    trueWindSpeedKt: 12,
  });
  const motor = new SimMotor(world, silent);
  await motor.init();
  await motor.enable();

  const wc = new WindController(pid);
  // Capture the live AWA then demand a 12° change — the loop must converge to it.
  const targetAwa = world.getState().awaDeg + 12;
  const dt = 0.1;
  for (let i = 0; i < 4000; i += 1) {
    const awa = world.getState().awaDeg;
    const rudderDeg = wc.computeRudder(targetAwa, awa, dt);
    motor.command({ rudderDeg, drive: rudderDeg / 35 });
    world.step(dt);
  }

  const finalErr = Math.abs(shortestAngleDiff(targetAwa, world.getState().awaDeg));
  assert.ok(finalErr < 4, `expected AWA convergence within 4°, got ${finalErr.toFixed(2)}°`);
});
