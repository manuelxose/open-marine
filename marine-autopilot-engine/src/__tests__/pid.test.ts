import { test } from "node:test";
import assert from "node:assert/strict";
import { PidController } from "../control/pid-controller.js";
import { shortestAngleDiff, wrapTo180 } from "../control/angle-utils.js";

const baseConfig = {
  kp: 1.2,
  ki: 0,
  kd: 0,
  deadband: 1,
  integralLimit: 10,
  outputMin: -35,
  outputMax: 35,
};

test("PID emits zero inside the deadband", () => {
  const pid = new PidController(baseConfig);
  assert.equal(pid.update(0.5, 0.1), 0);
  assert.equal(pid.update(-0.9, 0.1), 0);
});

test("PID proportional output follows the error sign and is clamped", () => {
  const pid = new PidController(baseConfig);
  // Large positive error → clamped to outputMax.
  assert.equal(pid.update(100, 0.1), 35);
  pid.reset();
  // Large negative error → clamped to outputMin.
  assert.equal(pid.update(-100, 0.1), -35);
  pid.reset();
  // Small error → proportional.
  assert.ok(Math.abs(pid.update(5, 0.1) - 6) < 1e-9);
});

test("integral term accumulates and respects anti-windup clamp", () => {
  const pid = new PidController({ ...baseConfig, kp: 0, ki: 1, integralLimit: 5 });
  let out = 0;
  for (let i = 0; i < 100; i += 1) {
    out = pid.update(10, 0.1);
  }
  // Integral contribution clamped to integralLimit.
  assert.ok(out <= 5 + 1e-6);
});

test("angle helpers wrap correctly", () => {
  assert.equal(wrapTo180(190), -170);
  assert.equal(wrapTo180(-190), 170);
  assert.equal(shortestAngleDiff(10, 350), 20);
  assert.equal(shortestAngleDiff(350, 10), -20);
});
