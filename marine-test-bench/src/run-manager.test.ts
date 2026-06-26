import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SimulationDatabase } from "./database.js";
import { RunManager } from "./run-manager.js";

const createManager = (): {
  manager: RunManager;
  database: SimulationDatabase;
  directory: string;
} => {
  const directory = mkdtempSync(join(tmpdir(), "omi-bench-"));
  const database = SimulationDatabase.open(join(directory, "bench.sqlite"), 90, 10_000_000);
  return { manager: new RunManager(database), database, directory };
};

test("a run requires a one-use temporary arm token", () => {
  const { manager, database, directory } = createManager();
  try {
    assert.throws(() => manager.start("safe-start", "invalid", {}), /invalid-arm-token/);
    const armed = manager.arm();
    // Need a scenario in the database first
    database.saveScenario({
      id: "safe-start",
      version: "1.0.0",
      name: "Safe Start",
      description: "Test",
      category: "system",
      mode: "data",
      defaultDurationMs: 300_000,
      defaultSpeed: 1,
      isPreset: true,
      parameters: [],
      channels: [],
      timeline: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const run = manager.start("safe-start", armed.token, {});
    assert.equal(run.status, "running");
    assert.throws(() => manager.start("safe-start", armed.token, {}), /invalid-arm-token/);
    manager.abort(run.id);
  } finally {
    manager.shutdown();
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("abort always records a safe-state event and persistent report", () => {
  const { manager, database, directory } = createManager();
  try {
    database.saveScenario({
      id: "jog-starboard",
      version: "1.0.0",
      name: "Jog Starboard",
      description: "Test",
      category: "motor",
      mode: "data",
      defaultDurationMs: 300_000,
      defaultSpeed: 1,
      isPreset: true,
      parameters: [],
      channels: [],
      timeline: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const armed = manager.arm();
    const run = manager.start("jog-starboard", armed.token, { seconds: 2 });
    const aborted = manager.abort(run.id, "test abort");
    assert.equal(aborted.status, "aborted");

    const events = manager.getEvents(run.id);
    assert.ok(events.some((event) => event.kind === "safe-state"));

    const report = manager.report(run.id, "json");
    assert.match(report.body, /"status": "aborted"/);
  } finally {
    manager.shutdown();
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
