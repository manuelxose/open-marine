import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTelemetryLine } from "../actuators/backends/serial-backend.js";

test("parses rudder + current telemetry frame", () => {
  const out = parseTelemetryLine("T,12.5,3.2");
  assert.deepEqual(out, { rudderAngleDeg: 12.5, motorCurrentA: 3.2 });
});

test("parses a partial telemetry frame", () => {
  assert.deepEqual(parseTelemetryLine("T,-8,"), { rudderAngleDeg: -8 });
});

test("parses a fault frame with reason", () => {
  assert.deepEqual(parseTelemetryLine("F,overcurrent"), { fault: "overcurrent" });
});

test("fault frame without reason falls back", () => {
  assert.deepEqual(parseTelemetryLine("F"), { fault: "micro-fault" });
});

test("ignores unknown / malformed frames", () => {
  assert.equal(parseTelemetryLine("X,1,2"), null);
  assert.equal(parseTelemetryLine("T,abc,def"), null);
  assert.equal(parseTelemetryLine(""), null);
});
