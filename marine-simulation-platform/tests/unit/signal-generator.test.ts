import assert from "node:assert/strict";
import { test } from "node:test";
import { SignalGenerator } from "../../src/core/signal-generator.js";
import { samplesToDataPoints } from "../../src/publishers/utils.js";
import { getPresetScenario } from "../../src/scenarios/presets.js";

test("SignalGenerator is deterministic for the same seed and scenario", () => {
  const scenario = getPresetScenario("basic-cruise");
  assert.ok(scenario);

  const left = new SignalGenerator(42, scenario).generate(10_000).samples;
  const right = new SignalGenerator(42, scenario).generate(10_000).samples;

  assert.deepEqual(left, right);
});

test("samplesToDataPoints exports only channels with Signal K paths", () => {
  const scenario = getPresetScenario("basic-cruise");
  assert.ok(scenario);
  const { samples } = new SignalGenerator(42, scenario).generate(1000);
  const points = samplesToDataPoints(samples, scenario.channels, "2026-01-01T00:00:00.000Z");

  assert.ok(points.length > 0);
  assert.ok(points.every((point) => point.context === "vessels.self"));
  assert.ok(points.every((point) => point.timestamp === "2026-01-01T00:00:00.000Z"));
  assert.ok(!points.some((point) => point.path.includes("ais.intruder")));
});

