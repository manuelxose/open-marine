import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPicoPreflightReady,
  parseTelemetryLine,
} from "../actuators/backends/serial-backend.js";

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

test("parses Pico 2 production preflight status", () => {
  const out = parseTelemetryLine(
    "R,pico2,profile=production,pwm=15,dir=14,enabled=0,ready=1,fault=",
  );
  assert.deepEqual(out, {
    profile: "production",
    safetyReady: true,
    enabled: false,
  });
});

test("parses Pico 2 safety fault status", () => {
  const out = parseTelemetryLine(
    "R,pico2,profile=production,enabled=0,ready=0,fault=safety-not-configured",
  );
  assert.deepEqual(out, {
    profile: "production",
    safetyReady: false,
    enabled: false,
    fault: "safety-not-configured",
  });
});

test("requires the exact Pico profile for production and HIL preflight", () => {
  const production = { profile: "production", safetyReady: true };
  const hil = { profile: "hil-motor", safetyReady: true };
  assert.equal(isPicoPreflightReady(production, "production"), true);
  assert.equal(isPicoPreflightReady(production, "hil-motor"), false);
  assert.equal(isPicoPreflightReady(hil, "hil-motor"), true);
  assert.equal(isPicoPreflightReady({ ...hil, safetyReady: false }, "hil-motor"), false);
});
