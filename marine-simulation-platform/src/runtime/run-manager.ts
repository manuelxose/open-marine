import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type {
  SimulationEvent,
  SimulationInjectionRequest,
  SimulationLeaseResponse,
  SimulationRun,
  SimulationRunOrigin,
  SimulationRunStatus,
  SimulationRunSummary,
  SimulationBenchResetRequest,
} from "@omi/marine-data-contract";
import { SignalGenerator, buildGeneratorOptions } from "../core/signal-generator.js";
import type { Publisher, SimulationStore } from "../core/types.js";
import { samplesToDataPoints } from "../publishers/utils.js";
import type { ClosedLoopClient } from "./closed-loop-client.js";

type EventListener = (event: SimulationEvent) => void;

interface ActiveExecution {
  run: SimulationRun;
  startedPerf: number;
  timer: ReturnType<typeof setInterval>;
  leaseExpiry: number;
  generator: SignalGenerator;
  tick: number;
  publisher?: Publisher | undefined;
  closedLoop?: ClosedLoopClient | undefined;
}

export class RunManager {
  private readonly armTokens = new Map<string, number>();
  private readonly active = new Map<string, ActiveExecution>();
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(
    private readonly store: SimulationStore,
    private readonly options: { closedLoop?: ClosedLoopClient | undefined } = {},
  ) {}

  cleanupStaleRuns(): void {
    for (const summary of this.store.listRuns()) {
      if (summary.status !== "running" && summary.status !== "queued") continue;
      const run = this.store.getRun(summary.id);
      if (run) this.abortStaleRun(run, "Run process was not active after service startup; returned to safe state");
    }
  }

  arm(): { token: string; expiresAtUtc: string } {
    const token = randomUUID();
    const expires = Date.now() + 60_000;
    this.armTokens.set(token, expires);
    return { token, expiresAtUtc: new Date(expires).toISOString() };
  }

  async start(
    scenarioId: string,
    token: string,
    parameters: Record<string, number | boolean | string>,
    mode: "data" | "closed-loop" = "data",
    speed = 1,
    seed = 42,
    publisher?: Publisher,
    origin?: SimulationRunOrigin | undefined,
  ): Promise<SimulationRun> {
    this.consumeArmToken(token);
    const scenario = this.store.getScenario(scenarioId);
    if (!scenario) throw new Error("scenario-not-found");
    if (this.active.size > 0) throw new Error("run-busy");

    if (publisher) await publisher.connect();
    const startedAtUtc = new Date().toISOString();
    const run: SimulationRun = {
      id: randomUUID(),
      scenarioId,
      scenarioVersion: scenario.version,
      status: "running",
      mode,
      speed,
      seed,
      parameters,
      ...(origin ? { origin } : {}),
      startedAtUtc,
      simulatedTimeMs: 0,
      steps: [
        { id: "preflight", label: "Preflight safe state", status: "passed", startedAtUtc, completedAtUtc: startedAtUtc, monotonicStartMs: 0, monotonicEndMs: 0 },
        { id: "stimulus", label: "Scenario stimulus", status: "running", startedAtUtc, monotonicStartMs: 0 },
        { id: "verification", label: "Assertions", status: "pending" },
        { id: "safe-state", label: "Return to safe state", status: "pending" },
      ],
      assertions: [],
      lastSequence: 0,
    };

    const closedLoop = mode === "closed-loop" ? this.options.closedLoop : undefined;
    if (mode === "closed-loop") {
      if (!closedLoop) throw new Error("closed-loop-unavailable");
      await closedLoop.reset(buildResetRequest(scenario, parameters, origin));
      await closedLoop.configureAndEngage(scenario, parameters);
    }
    this.store.saveRun(run);

    const generator = new SignalGenerator(
      seed,
      scenario,
      buildGeneratorOptions(parameters, origin ? { latitude: origin.latitude, longitude: origin.longitude } : undefined),
    );
    const execution: ActiveExecution = {
      run,
      startedPerf: performance.now(),
      timer: setInterval(() => undefined, 60_000),
      leaseExpiry: Date.now() + 30_000,
      generator,
      tick: 0,
      publisher,
      closedLoop,
    };
    clearInterval(execution.timer);
    this.active.set(run.id, execution);
    this.emit(execution, "run", `Started ${scenario.name}`);
    await this.tick(execution);
    execution.timer = setInterval(() => void this.tick(execution), 50 / Math.max(speed, 0.25));
    return structuredClone(run);
  }

  abort(runId: string, reason = "Aborted by operator"): SimulationRun {
    const execution = this.active.get(runId);
    if (!execution) {
      const run = this.getRun(runId);
      if (!run) throw new Error("run-not-found");
      if (run.status === "running" || run.status === "queued") {
        return this.abortStaleRun(run, reason);
      }
      return run;
    }
    this.finish(execution, "aborted", reason);
    return structuredClone(execution.run);
  }

  lease(runId: string): SimulationLeaseResponse {
    const execution = this.active.get(runId);
    if (!execution) {
      const run = this.getRun(runId);
      if (run?.status === "running" || run?.status === "queued") {
        this.abortStaleRun(run, "Run process is no longer active; returned to safe state");
      }
      throw new Error("run-not-active");
    }
    execution.leaseExpiry = Date.now() + 30_000;
    return { expiresAtUtc: new Date(execution.leaseExpiry).toISOString(), remainingMs: 30_000 };
  }

  inject(runId: string, injection: SimulationInjectionRequest): SimulationRun {
    const execution = this.active.get(runId);
    if (!execution) throw new Error("run-not-found");
    this.emit(execution, "injection", `Manual injection: ${injection.channelId}`, {
      channelId: injection.channelId,
      value: injection.value,
    });
    return structuredClone(execution.run);
  }

  getRun(id: string): SimulationRun | null {
    return this.store.getRun(id);
  }

  listRuns(): SimulationRunSummary[] {
    return this.store.listRuns();
  }

  clearRunHistory(): { deletedRuns: number } {
    if (this.active.size > 0) throw new Error("run-busy");
    return { deletedRuns: this.store.clearRuns() };
  }

  getEvents(id: string, afterSequence = 0): SimulationEvent[] {
    return this.store.getEvents(id, afterSequence);
  }

  report(runId: string, format: "json" | "csv" | "html"): { contentType: string; body: string } {
    const run = this.getRun(runId);
    if (!run) throw new Error("run-not-found");
    const events = this.store.getEvents(runId);
    const samples = this.store.getSamples(runId, { maxPoints: 20_000 });
    if (format === "json") {
      return { contentType: "application/json", body: JSON.stringify({ run, events, samples }, null, 2) };
    }
    if (format === "csv") {
      const header = "sequence,simulatedTimeMs,kind,message,channelId,value,assertion,passed";
      const rows = events.map((event) => [
        event.sequence,
        event.atSimulatedMs,
        event.kind,
        csv(event.message),
        event.channelId ?? "",
        event.value !== undefined ? csv(JSON.stringify(event.value)) : "",
        event.assertion?.id ?? "",
        event.assertion ? String(event.assertion.passed) : "",
      ].join(","));
      return { contentType: "text/csv", body: [header, ...rows].join("\n") };
    }
    const assertions = run.assertions.map((item) =>
      `<tr><td>${html(item.label)}</td><td>${item.passed ? "PASS" : "FAIL"}</td><td><code>${html(JSON.stringify(item.expected))}</code></td><td><code>${html(JSON.stringify(item.actual))}</code></td><td>${item.atSimulatedMs.toFixed(1)} ms</td></tr>`,
    ).join("");
    return {
      contentType: "text/html",
      body: `<!doctype html><html><head><meta charset="utf-8"><title>OMI Simulation ${html(run.id)}</title><style>body{font-family:system-ui;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:.5rem;text-align:left}code{font-family:monospace}</style></head><body><h1>OMI Simulation Platform</h1><p>Run <code>${html(run.id)}</code> - ${html(run.scenarioId)} - ${html(run.status)}</p><p>${html(run.startedAtUtc)} to ${html(run.completedAtUtc ?? "running")}</p><table><thead><tr><th>Assertion</th><th>Result</th><th>Expected</th><th>Actual</th><th>Time</th></tr></thead><tbody>${assertions}</tbody></table></body></html>`,
    };
  }

  subscribe(runId: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(runId) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(runId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(runId);
    };
  }

  shutdown(): void {
    for (const execution of this.active.values()) this.finish(execution, "aborted", "Service stopped");
  }

  private async tick(execution: ActiveExecution): Promise<void> {
    if (!this.active.has(execution.run.id)) return;
    execution.run.simulatedTimeMs = Math.floor((performance.now() - execution.startedPerf) * execution.run.speed);
    execution.tick += 1;

    const scenario = this.store.getScenario(execution.run.scenarioId);
    if (!scenario) {
      this.finish(execution, "failed", "Scenario disappeared");
      return;
    }

    const { samples, snapshots } = execution.generator.generate(execution.run.simulatedTimeMs);
    this.store.saveSampleBatch({ runId: execution.run.id, tick: execution.tick, simulatedTimeMs: execution.run.simulatedTimeMs, samples });
    execution.run.channelSnapshot = Array.from(snapshots.entries()).map(([channelId, snapshot]) => ({
      channelId,
      value: snapshot.value,
      unit: snapshot.unit,
      quality: snapshot.quality,
      simulatedTimeMs: execution.run.simulatedTimeMs,
    }));
    this.store.saveRun(execution.run);

    if (execution.publisher) {
      try {
        await execution.publisher.publish(samplesToDataPoints(samples, scenario.channels, new Date().toISOString(), {
          excludeOwnPosition: execution.run.mode === "closed-loop",
        }));
      } catch (error) {
        this.emit(execution, "log", error instanceof Error ? error.message : String(error));
      }
    }

    const durationMs = asNumber(execution.run.parameters["durationMs"], scenario.defaultDurationMs);
    if (execution.run.simulatedTimeMs >= durationMs) {
      this.finish(execution, "passed", "Scenario duration completed");
      return;
    }

    if (Date.now() > execution.leaseExpiry) {
      this.finish(execution, "aborted", "Lease expired; returned to safe state");
    }
  }

  private finish(execution: ActiveExecution, status: SimulationRunStatus, reason?: string): void {
    clearInterval(execution.timer);
    void execution.closedLoop?.disengage();
    void execution.publisher?.disconnect();
    const safeStep = execution.run.steps.find((step) => step.id === "safe-state");
    if (safeStep) {
      safeStep.status = "passed";
      safeStep.startedAtUtc = new Date().toISOString();
      safeStep.completedAtUtc = safeStep.startedAtUtc;
    }
    const stimulus = execution.run.steps.find((step) => step.id === "stimulus");
    if (stimulus?.status === "running") stimulus.status = status === "passed" ? "passed" : "skipped";
    execution.run.status = status;
    execution.run.completedAtUtc = new Date().toISOString();
    if (reason) execution.run.failureReason = reason;
    this.emit(execution, "safe-state", reason ?? "Safe state confirmed");
    this.store.saveRun(execution.run);
    this.store.applyRetention();
    this.active.delete(execution.run.id);
  }

  private abortStaleRun(run: SimulationRun, reason: string): SimulationRun {
    const completedAtUtc = new Date().toISOString();
    const safeStep = run.steps.find((step) => step.id === "safe-state");
    if (safeStep) {
      safeStep.status = "passed";
      safeStep.startedAtUtc = completedAtUtc;
      safeStep.completedAtUtc = completedAtUtc;
    }
    const stimulus = run.steps.find((step) => step.id === "stimulus");
    if (stimulus?.status === "running") stimulus.status = "skipped";
    run.status = "aborted";
    run.completedAtUtc = completedAtUtc;
    run.failureReason = reason;
    run.lastSequence += 1;
    this.store.saveEvent({
      id: randomUUID(),
      runId: run.id,
      sequence: run.lastSequence,
      kind: "safe-state",
      atSimulatedMs: run.simulatedTimeMs,
      atUtc: completedAtUtc,
      message: reason,
    });
    this.store.saveRun(run);
    return structuredClone(run);
  }

  private emit(
    execution: ActiveExecution,
    kind: SimulationEvent["kind"],
    message: string,
    extra: { channelId?: string; value?: unknown } = {},
  ): void {
    execution.run.lastSequence += 1;
    const event: SimulationEvent = {
      id: randomUUID(),
      runId: execution.run.id,
      sequence: execution.run.lastSequence,
      kind,
      atSimulatedMs: execution.run.simulatedTimeMs,
      atUtc: new Date().toISOString(),
      message,
      ...(extra.channelId ? { channelId: extra.channelId } : {}),
      ...(extra.value !== undefined ? { value: extra.value } : {}),
    };
    this.store.saveEvent(event);
    this.store.saveRun(execution.run);
    for (const listener of this.listeners.get(execution.run.id) ?? []) listener(event);
  }

  private consumeArmToken(token: string): void {
    const expires = this.armTokens.get(token);
    this.armTokens.delete(token);
    if (!expires || expires < Date.now()) throw new Error("invalid-arm-token");
  }
}

const asNumber = (value: unknown, fallback: number): number => typeof value === "number" ? value : fallback;
const asOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const csv = (value: string): string => `"${value.replaceAll("\"", "\"\"")}"`;
const html = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

const buildResetRequest = (
  scenario: { expectation?: { objective: string } | undefined },
  parameters: Record<string, number | boolean | string>,
  origin?: SimulationRunOrigin | undefined,
): SimulationBenchResetRequest => {
  const request: SimulationBenchResetRequest = {
    origin: {
      latitude: origin?.latitude ?? 42.2406,
      longitude: origin?.longitude ?? -8.7207,
    },
    cruiseSpeedKt: asNumber(parameters["boatSpeedKt"], 5),
    trueWindDirDeg: asNumber(parameters["windDirDeg"], 45),
    trueWindSpeedKt: asNumber(parameters["windSpeedKt"], 12),
  };
  const currentSetDeg = asOptionalNumber(parameters["currentSetDeg"]);
  const currentDriftKt = asOptionalNumber(parameters["currentDriftKt"]);
  if (currentSetDeg !== undefined) request.currentSetDeg = currentSetDeg;
  if (currentDriftKt !== undefined) request.currentDriftKt = currentDriftKt;

  if (scenario.expectation?.objective === "route") {
    request.routeLegs = [
      { bearingDeg: 0, distanceNm: 0.08 },
      { bearingDeg: 90, distanceNm: 0.08 },
      { bearingDeg: 180, distanceNm: 0.08 },
    ];
  } else if (scenario.expectation?.objective === "waypoint") {
    request.waypoint = {
      bearingDeg: asNumber(parameters["waypointBearingDeg"], asNumber(parameters["targetHeadingDeg"], 0)),
      distanceNm: asNumber(parameters["waypointDistanceNm"], 0.12),
    };
  }
  return request;
};
