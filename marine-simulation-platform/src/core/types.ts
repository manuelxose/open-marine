import type {
  SimulationEvent,
  SimulationRun,
  SimulationRunSummary,
  SimulationSample,
  SimulationScenarioDocument,
  SignalKPath,
} from "@omi/marine-data-contract";

export type ExecutionMode = "live" | "bench" | "closed-loop";

export interface ExecutionConfig {
  mode: ExecutionMode;
  scenarioId: string;
  parameters: Record<string, number | boolean | string>;
  seed: number;
  speed: number;
  rateHz: number;
  durationMs?: number;
  signalKHost?: string;
  signalKToken?: string;
  apiPort?: number;
  storePath?: string;
}

export interface SimulationDataPoint {
  path: SignalKPath;
  value: unknown;
  timestamp: string;
  context?: string;
  source?: { label: string; type?: string; priority?: number };
  quality?: "good" | "warn" | "bad" | "unknown";
}

export interface Publisher {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(points: SimulationDataPoint[]): Promise<void>;
}

export interface SimulationStore {
  readonly name: string;
  open(): void;
  close(): void;
  saveScenario(scenario: SimulationScenarioDocument): void;
  getScenario(id: string): SimulationScenarioDocument | null;
  listScenarios(): SimulationScenarioDocument[];
  deleteScenario(id: string): void;
  saveRun(run: SimulationRun): void;
  getRun(id: string): SimulationRun | null;
  listRuns(): SimulationRunSummary[];
  clearRuns(): number;
  saveEvent(event: SimulationEvent): void;
  getEvents(runId: string, afterSequence?: number): SimulationEvent[];
  saveSampleBatch(batch: {
    runId: string;
    tick: number;
    simulatedTimeMs: number;
    samples: SimulationSample[];
  }): void;
  getSamples(
    runId: string,
    options?: {
      channels?: string[];
      fromSimulatedMs?: number;
      toSimulatedMs?: number;
      maxPoints?: number;
      afterTick?: number;
    },
  ): Array<{ runId: string; tick: number; simulatedTimeMs: number; samples: SimulationSample[] }>;
  applyRetention(): void;
}

export type InternalEventKind =
  | "run-started"
  | "run-stopped"
  | "tick"
  | "sample"
  | "timeline-action"
  | "publisher-error"
  | "assertion-failed"
  | "step-transition";

export interface InternalEvent {
  kind: InternalEventKind;
  atSimulatedMs: number;
  atUtc: string;
  payload: Record<string, unknown>;
}

export type EventListener = (event: InternalEvent) => void;
