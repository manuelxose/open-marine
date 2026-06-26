export type SimulationMode = "data" | "closed-loop";
export type SimulationRunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "aborted";
export type SimulationStepStatus = "pending" | "running" | "passed" | "failed" | "skipped";
export type SimulationChannelKind = "analog" | "digital" | "text" | "uart";
export type SimulationChannelQuality = "good" | "warn" | "bad" | "unknown";
export type SimulationEventKind =
  | "run"
  | "step"
  | "sample"
  | "assertion"
  | "injection"
  | "timeline"
  | "log"
  | "safe-state";
export type SimulationTimelineActionType =
  | "set"
  | "ramp"
  | "fault-enable"
  | "fault-disable"
  | "command"
  | "marker";

export interface SimulationParameterDefinition {
  id: string;
  label: string;
  type: "number" | "boolean" | "select";
  defaultValue: number | boolean | string;
  unit?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  options?: Array<{ label: string; value: string }> | undefined;
  group?: string | undefined;
}

export interface SimulationChannelDefinition {
  id: string;
  label: string;
  path?: string | undefined; // Signal K path if applicable
  kind: SimulationChannelKind;
  dimension: string;
  canonicalUnit: string;
  allowedUnits: string[];
  precision: number;
  range?: { min: number; max: number } | undefined;
  limits?: { low?: number | undefined; high?: number | undefined; criticalLow?: number | undefined; criticalHigh?: number | undefined } | undefined;
}

export interface SimulationTimelineAction {
  id: string;
  atSimulatedMs: number;
  type: SimulationTimelineActionType;
  channelId?: string | undefined;
  value?: number | boolean | string | undefined;
  durationMs?: number | undefined;
  label?: string | undefined;
}

export interface SimulationScenarioDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  category: "navigation" | "wind" | "motor" | "electricity" | "sensors" | "ais" | "system" | "safety";
  mode: SimulationMode;
  defaultDurationMs: number;
  defaultSpeed: number; // 0.25x–4x for data mode; 1x for closed-loop
  parameters: SimulationParameterDefinition[];
  channels: SimulationChannelDefinition[];
  timeline: SimulationTimelineAction[];
  tags: string[];
}

export interface SimulationScenarioDocument extends SimulationScenarioDefinition {
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationStep {
  id: string;
  label: string;
  status: SimulationStepStatus;
  startedAtUtc?: string;
  completedAtUtc?: string;
  monotonicStartMs?: number;
  monotonicEndMs?: number;
  detail?: string;
}

export interface SimulationAssertionResult {
  id: string;
  label: string;
  passed: boolean;
  channelId?: string;
  expected: unknown;
  actual: unknown;
  atSimulatedMs: number;
  detail?: string;
}

export interface SimulationChannelSnapshot {
  channelId: string;
  value: unknown;
  unit: string;
  quality: SimulationChannelQuality;
  simulatedTimeMs: number;
}

export interface SimulationRun {
  id: string;
  scenarioId: string;
  scenarioVersion: string;
  status: SimulationRunStatus;
  mode: SimulationMode;
  speed: number;
  seed: number;
  parameters: Record<string, number | boolean | string>;
  startedAtUtc: string;
  completedAtUtc?: string | undefined;
  simulatedTimeMs: number;
  steps: SimulationStep[];
  assertions: SimulationAssertionResult[];
  lastSequence: number;
  failureReason?: string | undefined;
  channelSnapshot?: SimulationChannelSnapshot[] | undefined;
}

export interface SimulationSample {
  channelId: string;
  value: unknown;
  quality: SimulationChannelQuality;
}

export interface SimulationSampleBatch {
  runId: string;
  tick: number;
  simulatedTimeMs: number;
  samples: SimulationSample[];
}

export interface SimulationEvent {
  id: string;
  runId: string;
  sequence: number;
  kind: SimulationEventKind;
  atSimulatedMs: number;
  atUtc: string;
  message: string;
  stepId?: string | undefined;
  channelId?: string | undefined;
  value?: unknown | undefined;
  assertion?: SimulationAssertionResult | undefined;
  payload?: Record<string, unknown> | undefined;
}

export interface SimulationRunSummary {
  id: string;
  scenarioId: string;
  status: SimulationRunStatus;
  startedAtUtc: string;
  completedAtUtc?: string | undefined;
  simulatedTimeMs: number;
  mode: SimulationMode;
  failureReason?: string | undefined;
}

export interface SimulationInjectionRequest {
  channelId: string;
  value: number | boolean | string;
  label?: string | undefined;
}

export interface SimulationArmResponse {
  token: string;
  expiresAtUtc: string;
  requiresPortsDisabled?: boolean | undefined;
}

export interface SimulationLeaseResponse {
  expiresAtUtc: string;
  remainingMs: number;
}

// ── Legacy aliases (deprecated) ─────────────────────────────────────────────
// These types are kept for backward compatibility during the migration.
// They will be removed in a future version.

/** @deprecated Use SimulationMode instead. */
export type BenchSourceMode = "live" | "bench";
/** @deprecated Use SimulationRunStatus instead. */
export type BenchRunStatus = SimulationRunStatus;
/** @deprecated Use SimulationStepStatus instead. */
export type BenchStepStatus = SimulationStepStatus;
/** @deprecated Use SimulationChannelKind instead. */
export type BenchSignalKind = SimulationChannelKind;
/** @deprecated Use SimulationChannelQuality instead. */
export type BenchSignalStatus = SimulationChannelQuality;
/** @deprecated Use SimulationEventKind instead. */
export type BenchEventKind = SimulationEventKind;

/** @deprecated Use SimulationParameterDefinition instead. */
export interface BenchParameterDefinition extends SimulationParameterDefinition {}

/** @deprecated Use SimulationScenarioDefinition instead. */
export interface BenchDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  category: "motor" | "navigation" | "sensors" | "communications" | "system";
  level: "deterministic" | "integration";
  durationMs: number;
  executable: boolean;
  parameters: SimulationParameterDefinition[];
  requiredSignals: string[];
  tags: string[];
}

/** @deprecated Use SimulationStep instead. */
export interface BenchStep extends SimulationStep {}

/** @deprecated Use SimulationAssertionResult instead. */
export interface AssertionResult extends SimulationAssertionResult {}

/** @deprecated Use SimulationChannelSnapshot instead. */
export interface BenchSignal {
  id: string;
  label: string;
  path?: string;
  kind: SimulationChannelKind;
  value: unknown;
  unit?: string;
  source: string;
  status: SimulationChannelQuality;
  quality: SimulationChannelQuality;
  timestampUtc: string;
  monotonicMs: number;
}

/** @deprecated Use SimulationEvent instead. */
export interface BenchEvent extends SimulationEvent {}

/** @deprecated Use SimulationRun instead. */
export interface BenchRun extends SimulationRun {
  benchId: string;
  definitionVersion: string;
}

/** @deprecated Topology is being removed. */
export interface BenchTopologyPort {
  id: string;
  label: string;
  direction: "input" | "output" | "bidirectional";
  side: "left" | "right" | "top" | "bottom";
  signalIds: string[];
}

/** @deprecated Topology is being removed. */
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

/** @deprecated Topology is being removed. */
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

/** @deprecated Topology is being removed. */
export interface BenchTopologySheet {
  id: string;
  label: string;
  phase: 1 | 2 | 3 | 4 | 5;
  executable: boolean;
}

/** @deprecated Topology is being removed. */
export interface BenchTopology {
  version: string;
  generatedAtUtc: string;
  sheets: BenchTopologySheet[];
  nodes: BenchTopologyNode[];
  connections: BenchTopologyConnection[];
}
