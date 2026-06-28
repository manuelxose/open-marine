import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore } from "../../src/persistence/memory-store.js";
import { RunManager } from "../../src/runtime/run-manager.js";
import { SimulationApiServer } from "../../src/api/server.js";
import { getPresetScenario } from "../../src/scenarios/presets.js";

test("SimulationApiServer exposes compatible API v2 scenario and run endpoints", async () => {
  const store = new MemoryStore();
  const scenario = getPresetScenario("basic-cruise");
  assert.ok(scenario);
  store.saveScenario(scenario);
  const runManager = new RunManager(store);
  const server = new SimulationApiServer({ port: 0, host: "127.0.0.1", store, runManager });
  const { port } = await server.start();
  try {
    const base = `http://127.0.0.1:${port}`;
    const scenarios = await getJson<unknown[]>(`${base}/api/v2/scenarios`);
    assert.equal(scenarios.length, 1);
    const arm = await postJson<{ token: string }>(`${base}/api/v2/arm`, {});
    assert.ok(arm.token);
    const run = await postJson<{ id: string; status: string }>(`${base}/api/v2/runs`, {
      scenarioId: "basic-cruise",
      armToken: arm.token,
      parameters: {},
      speed: 1,
      seed: 42,
    });
    assert.equal(run.status, "running");
    const samples = await getJson<unknown[]>(`${base}/api/v2/runs/${run.id}/samples?maxPoints=5`);
    assert.ok(Array.isArray(samples));
    const report = await fetch(`${base}/api/v2/runs/${run.id}/report?format=json`);
    assert.equal(report.ok, true);
    await postJson(`${base}/api/v2/runs/${run.id}/abort`, {});
  } finally {
    runManager.shutdown();
    await server.stop();
  }
});

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  const body = await response.text();
  assert.equal(response.ok, true, body);
  return JSON.parse(body) as T;
};

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.ok, true, text);
  return JSON.parse(text) as T;
};
