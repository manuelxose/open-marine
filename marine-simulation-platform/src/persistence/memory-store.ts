import type {
  SimulationEvent,
  SimulationRun,
  SimulationRunSummary,
  SimulationSample,
  SimulationScenarioDocument,
} from "@omi/marine-data-contract";
import type { SimulationStore } from "../core/types.js";

interface StoredSample {
  runId: string;
  tick: number;
  simulatedTimeMs: number;
  sample: SimulationSample;
}

export class MemoryStore implements SimulationStore {
  readonly name = "memory";
  private readonly scenarios = new Map<string, SimulationScenarioDocument>();
  private readonly runs = new Map<string, SimulationRun>();
  private readonly events: SimulationEvent[] = [];
  private readonly samples: StoredSample[] = [];

  open(): void {}
  close(): void {}

  saveScenario(scenario: SimulationScenarioDocument): void {
    this.scenarios.set(scenario.id, structuredClone(scenario));
  }

  getScenario(id: string): SimulationScenarioDocument | null {
    const scenario = this.scenarios.get(id);
    return scenario ? structuredClone(scenario) : null;
  }

  listScenarios(): SimulationScenarioDocument[] {
    return Array.from(this.scenarios.values()).map((scenario) => structuredClone(scenario));
  }

  deleteScenario(id: string): void {
    this.scenarios.delete(id);
  }

  saveRun(run: SimulationRun): void {
    this.runs.set(run.id, structuredClone(run));
  }

  getRun(id: string): SimulationRun | null {
    const run = this.runs.get(id);
    return run ? structuredClone(run) : null;
  }

  listRuns(): SimulationRunSummary[] {
    return Array.from(this.runs.values()).map((run) => ({
      id: run.id,
      scenarioId: run.scenarioId,
      status: run.status,
      startedAtUtc: run.startedAtUtc,
      completedAtUtc: run.completedAtUtc,
      simulatedTimeMs: run.simulatedTimeMs,
      mode: run.mode,
      failureReason: run.failureReason,
    }));
  }

  clearRuns(): number {
    const count = this.runs.size;
    this.runs.clear();
    this.events.length = 0;
    this.samples.length = 0;
    return count;
  }

  saveEvent(event: SimulationEvent): void {
    this.events.push(structuredClone(event));
  }

  getEvents(runId: string, afterSequence = 0): SimulationEvent[] {
    return this.events
      .filter((event) => event.runId === runId && event.sequence > afterSequence)
      .map((event) => structuredClone(event));
  }

  saveSampleBatch(batch: { runId: string; tick: number; simulatedTimeMs: number; samples: SimulationSample[] }): void {
    for (const sample of batch.samples) {
      this.samples.push({
        runId: batch.runId,
        tick: batch.tick,
        simulatedTimeMs: batch.simulatedTimeMs,
        sample: structuredClone(sample),
      });
    }
  }

  getSamples(
    runId: string,
    options: {
      channels?: string[];
      fromSimulatedMs?: number;
      toSimulatedMs?: number;
      maxPoints?: number;
      afterTick?: number;
    } = {},
  ): Array<{ runId: string; tick: number; simulatedTimeMs: number; samples: SimulationSample[] }> {
    const channelSet = options.channels ? new Set(options.channels) : null;
    const rows = this.samples.filter((row) =>
      row.runId === runId &&
      (!channelSet || channelSet.has(row.sample.channelId)) &&
      (options.fromSimulatedMs === undefined || row.simulatedTimeMs >= options.fromSimulatedMs) &&
      (options.toSimulatedMs === undefined || row.simulatedTimeMs <= options.toSimulatedMs) &&
      (options.afterTick === undefined || row.tick > options.afterTick),
    );
    const batches = new Map<number, { runId: string; tick: number; simulatedTimeMs: number; samples: SimulationSample[] }>();
    for (const row of rows.slice(0, options.maxPoints ?? 5000)) {
      const batch = batches.get(row.tick) ?? {
        runId: row.runId,
        tick: row.tick,
        simulatedTimeMs: row.simulatedTimeMs,
        samples: [],
      };
      batch.samples.push(structuredClone(row.sample));
      batches.set(row.tick, batch);
    }
    return Array.from(batches.values());
  }

  applyRetention(): void {}
}
