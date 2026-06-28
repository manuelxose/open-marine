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
    for (const scenario of listPresetScenarios()) this.store.saveScenario(scenario);
  }

  stop(): void {
    this.runManager.shutdown();
    this.store.close();
  }
}

