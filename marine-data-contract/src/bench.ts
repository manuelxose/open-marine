export type BenchSourceMode = "live" | "bench";
export type BenchRunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "aborted";
export type BenchStepStatus = "pending" | "running" | "passed" | "failed" | "skipped";
export type BenchSignalKind = "digital" | "analog" | "text" | "uart";
export type BenchSignalStatus = "unknown" | "inactive" | "active" | "stale" | "fault";
export type BenchEventKind =
  | "run"
  | "step"
  | "signal"
  | "assertion"
  | "uart"
  | "log"
  | "safe-state";

export interface BenchParameterDefinition {
  id: string;
  label: string;
  type: "number" | "boolean" | "select";
  defaultValue: number | boolean | string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface BenchDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  category: "motor" | "navigation" | "sensors" | "communications" | "system";
  level: "deterministic" | "integration";
  durationMs: number;
  executable: boolean;
  parameters: BenchParameterDefinition[];
  requiredSignals: string[];
  tags: string[];
}

export interface BenchStep {
  id: string;
  label: string;
  status: BenchStepStatus;
  startedAtUtc?: string;
  completedAtUtc?: string;
  monotonicStartMs?: number;
  monotonicEndMs?: number;
  detail?: string;
}

export interface AssertionResult {
  id: string;
  label: string;
  passed: boolean;
  signalId?: string;
  expected: unknown;
  actual: unknown;
  atUtc: string;
  monotonicMs: number;
  detail?: string;
}

export interface BenchSignal {
  id: string;
  label: string;
  path?: string;
  kind: BenchSignalKind;
  value: unknown;
  unit?: string;
  source: string;
  status: BenchSignalStatus;
  quality: "good" | "warn" | "bad" | "unknown";
  timestampUtc: string;
  monotonicMs: number;
}

export interface BenchEvent {
  id: string;
  runId: string;
  sequence: number;
  kind: BenchEventKind;
  atUtc: string;
  monotonicMs: number;
  message: string;
  stepId?: string;
  signal?: BenchSignal;
  assertion?: AssertionResult;
  payload?: Record<string, unknown>;
}

export interface BenchRun {
  id: string;
  benchId: string;
  definitionVersion: string;
  status: BenchRunStatus;
  parameters: Record<string, number | boolean | string>;
  startedAtUtc: string;
  completedAtUtc?: string;
  monotonicStartedMs: number;
  monotonicCompletedMs?: number;
  steps: BenchStep[];
  assertions: AssertionResult[];
  lastSequence: number;
  failureReason?: string;
}

export interface BenchTopologyPort {
  id: string;
  label: string;
  direction: "input" | "output" | "bidirectional";
  side: "left" | "right" | "top" | "bottom";
  signalIds: string[];
}

export interface BenchTopologyNode {
  id: string;
  label: string;
  subtitle: string;
  kind:
    | "simulator"
    | "server"
    | "controller"
    | "transport"
    | "device"
    | "power"
    | "sensor"
    | "service";
  phase: 1 | 2 | 3 | 4 | 5;
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: BenchTopologyPort[];
  signalIds: string[];
  executable: boolean;
}

export interface BenchTopologyConnection {
  id: string;
  label: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  signalIds: string[];
  transport: "internal" | "http" | "websocket" | "uart" | "gpio" | "can";
}

export interface BenchTopologySheet {
  id: string;
  label: string;
  phase: 1 | 2 | 3 | 4 | 5;
  executable: boolean;
}

export interface BenchTopology {
  version: string;
  generatedAtUtc: string;
  sheets: BenchTopologySheet[];
  nodes: BenchTopologyNode[];
  connections: BenchTopologyConnection[];
}
