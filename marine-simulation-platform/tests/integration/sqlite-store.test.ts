import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SqliteStore } from "../../src/persistence/sqlite-store.js";
import { getPresetScenario } from "../../src/scenarios/presets.js";

test("SqliteStore persists scenarios, runs, events and sample batches", () => {
  const dir = mkdtempSync(join(tmpdir(), "omi-sim-"));
  const store = new SqliteStore(join(dir, "sim.sqlite"));
  try {
    store.open();
    const scenario = getPresetScenario("ap-sail");
    assert.ok(scenario);
    store.saveScenario(scenario);
    assert.equal(store.getScenario("ap-sail")?.id, "ap-sail");
    store.saveRun({
      id: "run-1",
      scenarioId: "ap-sail",
      scenarioVersion: "1.0.0",
      status: "running",
      mode: "data",
      speed: 1,
      seed: 42,
      parameters: {},
      startedAtUtc: "2026-01-01T00:00:00.000Z",
      simulatedTimeMs: 100,
      steps: [],
      assertions: [],
      lastSequence: 0,
    });
    store.saveEvent({
      id: "event-1",
      runId: "run-1",
      sequence: 1,
      kind: "run",
      atSimulatedMs: 100,
      atUtc: "2026-01-01T00:00:00.000Z",
      message: "started",
    });
    store.saveSampleBatch({
      runId: "run-1",
      tick: 1,
      simulatedTimeMs: 100,
      samples: [{ channelId: "nav.sog", value: 3.2, quality: "good" }],
    });
    assert.equal(store.getRun("run-1")?.id, "run-1");
    assert.equal(store.getEvents("run-1").length, 1);
    assert.equal(store.getSamples("run-1")[0]?.samples[0]?.channelId, "nav.sog");
    assert.equal(store.clearRuns(), 1);
    assert.equal(store.listRuns().length, 0);
    assert.equal(store.getEvents("run-1").length, 0);
    assert.equal(store.getSamples("run-1").length, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
