import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFaults } from "../safety/fault-manager.js";
import type { SensorSnapshot } from "../types.js";

const limits = { rudderLimitDeg: 35, currentLimitA: 10, voltageCutoff: 11.5 };

const snapshot = (over: Partial<SensorSnapshot> = {}): SensorSnapshot => ({
  nowMs: 0,
  headingTrueDeg: 100,
  headingValid: true,
  awaDeg: 30,
  awsKt: 12,
  windValid: true,
  cogDeg: 100,
  sogKt: 5,
  positionValid: true,
  xteMeters: 0,
  bearingToWaypointDeg: 100,
  distanceToWaypointMeters: 500,
  rudderAngleDeg: 0,
  rudderValid: true,
  motorCurrentA: 1,
  batteryVoltage: 13,
  emergencyStop: false,
  ...over,
});

test("emergency stop faults even in standby", () => {
  const e = evaluateFaults(snapshot({ emergencyStop: true }), "standby", limits);
  assert.equal(e.action, "fault");
  assert.equal(e.reason, "emergency-stop");
});

test("overcurrent and low battery fault", () => {
  assert.equal(evaluateFaults(snapshot({ motorCurrentA: 20 }), "heading", limits).reason, "overcurrent");
  assert.equal(evaluateFaults(snapshot({ batteryVoltage: 10 }), "heading", limits).reason, "low-battery");
});

test("lost heading while engaged is a hard fault", () => {
  const e = evaluateFaults(snapshot({ headingValid: false }), "heading", limits);
  assert.equal(e.action, "fault");
  assert.equal(e.reason, "heading-sensor-lost");
});

test("lost heading while in standby is not a fault", () => {
  const e = evaluateFaults(snapshot({ headingValid: false }), "standby", limits);
  assert.equal(e.action, "none");
});

test("wind loss in WIND demotes to heading", () => {
  const e = evaluateFaults(snapshot({ windValid: false }), "wind", limits);
  assert.equal(e.action, "demote");
  assert.equal(e.demoteTo, "heading");
  assert.equal(e.reason, "wind-sensor-lost");
});

test("gps loss in TRACK demotes; to standby when heading also gone", () => {
  assert.equal(evaluateFaults(snapshot({ positionValid: false }), "track", limits).demoteTo, "heading");
  const e = evaluateFaults(snapshot({ positionValid: false, headingValid: false }), "track", limits);
  // Heading loss takes priority as a hard fault.
  assert.equal(e.action, "fault");
});

test("all good → no action", () => {
  assert.equal(evaluateFaults(snapshot(), "heading", limits).action, "none");
});
