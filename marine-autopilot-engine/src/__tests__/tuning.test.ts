import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../engine.js";
import { getConfig } from "../config.js";
import { Logger } from "../app/logger.js";
import { SimWorld } from "../sim/sim-world.js";
import { SimMotor } from "../actuators/backends/sim-backend.js";
import { SimSensorSource } from "../sim/sim-sensor-source.js";

const silent = new Logger("test", "error");

const makeEngine = (): Engine => {
  const world = new SimWorld({ startLat: 43, startLon: -3, cruiseSpeedKt: 5 });
  const motor = new SimMotor(world, silent);
  const sensors = new SimSensorSource(world);
  return new Engine(getConfig(), sensors, motor, silent, world);
};

test("setTuning updates and returns the new tuning", () => {
  const engine = makeEngine();
  const out = engine.setTuning({ kp: 2.5, deadbandDeg: 3 });
  assert.equal(out.kp, 2.5);
  assert.equal(out.deadbandDeg, 3);
  assert.equal(engine.getTuning().kp, 2.5);
});

test("setTuning clamps pwm and rudder limits to safe ranges", () => {
  const engine = makeEngine();
  const out = engine.setTuning({ pwmMin: -1, pwmMax: 5, rudderLimitDeg: 200 });
  assert.ok(out.pwmMin >= 0 && out.pwmMin <= 1);
  assert.ok(out.pwmMax >= out.pwmMin && out.pwmMax <= 1);
  assert.ok(out.rudderLimitDeg <= 90);
});

test("setTuning ignores non-finite / unknown fields", () => {
  const engine = makeEngine();
  const before = engine.getTuning();
  const out = engine.setTuning({ kp: Number.NaN, bogus: 1 } as never);
  assert.equal(out.kp, before.kp);
});

test("drive test is allowed in STANDBY", () => {
  const engine = makeEngine();
  assert.equal(engine.driveTest("stbd", 1).ok, true);
});
