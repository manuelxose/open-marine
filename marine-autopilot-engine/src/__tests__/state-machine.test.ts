import { test } from "node:test";
import assert from "node:assert/strict";
import { StateMachine } from "../app/state-machine.js";
import type { SensorSnapshot } from "../types.js";

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

test("boots in standby, motor never engaged by default", () => {
  const sm = new StateMachine();
  assert.equal(sm.getState(), "standby");
  assert.equal(sm.getStatus().engaged, false);
});

test("engage heading captures current heading as target", () => {
  const sm = new StateMachine();
  sm.setMode("compass");
  const result = sm.engage(snapshot({ headingTrueDeg: 137 }));
  assert.equal(result.ok, true);
  assert.equal(sm.getState(), "heading");
  assert.equal(sm.getTargetHeadingDeg(), 137);
});

test("engage wind fails without a valid wind sensor", () => {
  const sm = new StateMachine();
  sm.setMode("wind");
  const result = sm.engage(snapshot({ windValid: false }));
  assert.equal(result.ok, false);
  assert.equal(sm.getState(), "standby");
});

test("dodge nudges the active heading target", () => {
  const sm = new StateMachine();
  sm.setMode("compass");
  sm.engage(snapshot({ headingTrueDeg: 100 }));
  sm.dodge(10);
  assert.equal(sm.getTargetHeadingDeg(), 110);
});

test("fault latches and only clears explicitly", () => {
  const sm = new StateMachine();
  sm.setMode("compass");
  sm.engage(snapshot());
  sm.raiseFault("overcurrent");
  assert.equal(sm.getState(), "fault");
  // Cannot re-engage while faulted.
  assert.equal(sm.engage(snapshot()).ok, false);
  sm.clearFault();
  assert.equal(sm.getState(), "standby");
  assert.equal(sm.getStatus().fault, "none");
});

test("demote drops to a safer state but not from fault", () => {
  const sm = new StateMachine();
  sm.setMode("wind");
  sm.engage(snapshot());
  sm.demote("heading");
  assert.equal(sm.getState(), "heading");
  sm.raiseFault("heading-sensor-lost");
  sm.demote("standby");
  assert.equal(sm.getState(), "fault");
});
