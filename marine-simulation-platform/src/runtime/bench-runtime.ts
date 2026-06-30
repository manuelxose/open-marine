import { RunManager } from "./run-manager.js";
import type { SimulationStore } from "../core/types.js";
import { listPresetScenarios } from "../scenarios/presets.js";

export class BenchRuntime {
  readonly runManager: RunManager;

  constructor(readonly store: SimulationStore) {
    this.runManager = new RunManager(store);
  }

  start(): void {
    this.store.open();
    const presets = listPresetScenarios();
    const presetIds = new Set(presets.map((scenario) => scenario.id));
    // Drop stale presets persisted by earlier versions so the catalog only shows the current set.
    // User-created custom scenarios (isPreset === false) are preserved.
    for (const existing of this.store.listScenarios()) {
      if (existing.isPreset && !presetIds.has(existing.id)) this.store.deleteScenario(existing.id);
    }
    for (const scenario of presets) this.store.saveScenario(scenario);
    this.runManager.cleanupStaleRuns();
  }

  stop(): void {
    this.runManager.shutdown();
    this.store.close();
  }
}
