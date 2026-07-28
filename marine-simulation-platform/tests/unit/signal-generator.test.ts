import assert from "node:assert/strict";
import { test } from "node:test";
import { SignalGenerator, buildGeneratorOptions } from "../../src/core/signal-generator.js";
import { samplesToDataPoints } from "../../src/publishers/utils.js";
import { getPresetScenario, listPresetScenarios } from "../../src/scenarios/presets.js";

const valueFor = <T>(samples: Array<{ channelId: string; value: unknown }>, channelId: string): T => {
  const sample = samples.find((entry) => entry.channelId === channelId);
  assert.ok(sample, `missing sample ${channelId}`);
  return sample.value as T;
};

test("SignalGenerator is deterministic for the same seed and scenario", () => {
  const scenario = getPresetScenario("env-wind");
  assert.ok(scenario);

  const left = new SignalGenerator(42, scenario).generate(10_000).samples;
  const right = new SignalGenerator(42, scenario).generate(10_000).samples;

  assert.deepEqual(left, right);
});

test("samplesToDataPoints exports only channels with Signal K paths", () => {
  const scenario = getPresetScenario("env-speed");
  assert.ok(scenario);
  const { samples } = new SignalGenerator(42, scenario).generate(1000);
  const points = samplesToDataPoints(samples, scenario.channels, "2026-01-01T00:00:00.000Z");

  assert.ok(points.length > 0);
  assert.ok(points.some((point) => point.context === "vessels.self"));
  assert.ok(points.every((point) => point.timestamp === "2026-01-01T00:00:00.000Z"));
});

test("all preset scenarios generate Signal K datapoints and vessel movement", () => {
  const presets = listPresetScenarios();
  assert.equal(presets.length, 3, "speed, wind and current environments");
  for (const scenario of presets) {
    const generator = new SignalGenerator(42, scenario);
    const first = generator.generate(0).samples;
    const later = generator.generate(Math.min(60_000, scenario.defaultDurationMs)).samples;
    const points = samplesToDataPoints(first, scenario.channels, "2026-01-01T00:00:00.000Z");

    assert.ok(first.length > 0, `${scenario.id}: no samples`);
    assert.ok(scenario.description.trim().length > 0, `${scenario.id}: no description`);
    assert.ok(scenario.expectation, `${scenario.id}: no expectation legend`);
    assert.ok(points.some((point) => point.context === "vessels.self"), `${scenario.id}: no own vessel data`);
    assert.ok(points.some((point) => point.path === "navigation.position"), `${scenario.id}: no position datapoint`);
    assert.ok(points.some((point) => point.path === "navigation.speedOverGround"), `${scenario.id}: no SOG datapoint`);

    const startPosition = first.find((sample) => sample.channelId === "nav.position")?.value;
    const laterPosition = later.find((sample) => sample.channelId === "nav.position")?.value;
    assert.notDeepEqual(laterPosition, startPosition, `${scenario.id}: position does not change`);
  }
});

test("closed-loop publishing can exclude own-vessel position", () => {
  const scenario = getPresetScenario("env-current");
  assert.ok(scenario);
  const { samples } = new SignalGenerator(42, scenario).generate(1000);
  const points = samplesToDataPoints(samples, scenario.channels, "2026-01-01T00:00:00.000Z", { excludeOwnPosition: true });
  assert.ok(points.some((point) => point.path === "navigation.speedOverGround"), "SOG still published");
  assert.ok(!points.some((point) => point.path === "navigation.position"), "own position must be owned by AP sim");
});

test("SignalGenerator starts from the provided live origin", () => {
  const scenario = getPresetScenario("env-speed");
  assert.ok(scenario);
  const origin = { latitude: 41.5, longitude: -8.1 };
  const samples = new SignalGenerator(42, scenario, buildGeneratorOptions({}, origin)).generate(0).samples;
  assert.deepEqual(valueFor(samples, "nav.position"), origin);
});

test("ordinary environments contain no autopilot or physical motor channels", () => {
  for (const scenario of listPresetScenarios()) {
    assert.equal(scenario.mode, "closed-loop");
    assert.ok(!scenario.channels.some((channel) => channel.id.startsWith("ap.")));
    assert.ok(!scenario.channels.some((channel) => channel.id.startsWith("motor.")));
  }
});

test("apparent wind is derived from true wind plus boat motion (not a copy of TWS)", () => {
  const scenario = getPresetScenario("env-wind");
  assert.ok(scenario);
  const generator = new SignalGenerator(42, scenario, buildGeneratorOptions({ windSpeedKt: 14, windDirDeg: 30, boatSpeedKt: 8 }));

  let diverged = false;
  for (let ms = 0; ms <= 60_000; ms += 5_000) {
    const samples = generator.generate(ms).samples;
    const tws = valueFor<number>(samples, "wind.tws");
    const aws = valueFor<number>(samples, "wind.aws");
    const awa = valueFor<number>(samples, "wind.awa");
    assert.ok(tws > 0 && aws > 0, "wind speeds must be positive");
    assert.ok(awa >= -Math.PI && awa <= Math.PI, "AWA must be within +/- pi");
    if (Math.abs(aws - tws) > 0.2) diverged = true;
  }
  assert.ok(diverged, "apparent wind speed should differ from true wind speed while moving");
});

test("scenario parameters drive the generated signal", () => {
  const scenario = getPresetScenario("env-speed");
  assert.ok(scenario);
  const light = new SignalGenerator(42, scenario, buildGeneratorOptions({ windSpeedKt: 6 })).generate(20_000).samples;
  const strong = new SignalGenerator(42, scenario, buildGeneratorOptions({ windSpeedKt: 30 })).generate(20_000).samples;
  assert.ok(valueFor<number>(strong, "wind.tws") > valueFor<number>(light, "wind.tws"), "higher windSpeedKt must raise TWS");

  const lowBattery = new SignalGenerator(42, scenario, buildGeneratorOptions({ batteryV: 11 })).generate(5_000).samples;
  const fullBattery = new SignalGenerator(42, scenario, buildGeneratorOptions({ batteryV: 13.5 })).generate(5_000).samples;
  assert.ok(valueFor<number>(fullBattery, "elec.voltage") > valueFor<number>(lowBattery, "elec.voltage"), "batteryV must drive voltage");
});

test("boat speed changes apparent wind without publishing engine telemetry", () => {
  const scenario = getPresetScenario("env-wind");
  assert.ok(scenario);

  const stopped = new SignalGenerator(42, scenario, buildGeneratorOptions({ boatSpeedKt: 0, windSpeedKt: 14, windDirDeg: 30 })).generate(20_000).samples;
  const moving = new SignalGenerator(42, scenario, buildGeneratorOptions({ boatSpeedKt: 10, windSpeedKt: 14, windDirDeg: 30 })).generate(20_000).samples;

  assert.ok(Number.isFinite(valueFor<number>(moving, "wind.aws")), "AWS must be published");
  assert.ok(Number.isFinite(valueFor<number>(moving, "wind.awa")), "AWA must be published");
  assert.notEqual(valueFor<number>(moving, "wind.aws"), valueFor<number>(stopped, "wind.aws"), "AWS must change with boat speed");
  assert.notEqual(valueFor<number>(moving, "wind.awa"), valueFor<number>(stopped, "wind.awa"), "AWA must change with boat speed");
  assert.ok(!moving.some((sample) => sample.channelId.startsWith("motor.")));
});
