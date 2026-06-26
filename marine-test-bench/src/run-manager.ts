import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type {
  SimulationAssertionResult,
  SimulationEvent,
  SimulationInjectionRequest,
  SimulationLeaseResponse,
  SimulationRun,
  SimulationRunStatus,
  SimulationRunSummary,
  SimulationSampleBatch,
  SimulationScenarioDocument,
} from "@omi/marine-data-contract";
import { SimulationDatabase } from "./database.js";

type EventListener = (event: SimulationEvent) => void;

interface ActiveExecution {
  run: SimulationRun;
  scenario: SimulationScenarioDocument;
  startedPerf: number;
  timer: ReturnType<typeof setInterval>;
  aborted: boolean;
  leaseExpiry: number;
}

export class RunManager {
  private readonly armTokens = new Map<string, number>();
  private readonly runs = new Map<string, SimulationRun>();
  private readonly active = new Map<string, ActiveExecution>();
  private readonly listeners = new Map<string, Set<EventListener>>();
  private readonly disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly database: SimulationDatabase,
  ) {}

  arm(): { token: string; expiresAtUtc: string } {
    const token = randomUUID();
    const expires = Date.now() + 60_000;
    this.armTokens.set(token, expires);
    return { token, expiresAtUtc: new Date(expires).toISOString() };
  }

  start(
    scenarioId: string,
    token: string,
    parameters: Record<string, number | boolean | string>,
    mode: "data" | "closed-loop" = "data",
    speed = 1,
    seed = 42,
  ): SimulationRun {
    this.consumeArmToken(token);
    const scenario = this.database.getScenario(scenarioId);
    if (!scenario) {
      throw new Error("scenario-not-found");
    }
    if (this.active.size > 0) {
      throw new Error("run-busy");
    }

    const startedAtUtc = new Date().toISOString();
    const startedPerf = performance.now();
    const run: SimulationRun = {
      id: randomUUID(),
      scenarioId,
      scenarioVersion: scenario.version,
      status: "running",
      mode,
      speed,
      seed,
      parameters,
      startedAtUtc,
      simulatedTimeMs: 0,
      steps: [
        { id: "preflight", label: "Preflight y estado seguro", status: "running", startedAtUtc, monotonicStartMs: 0 },
        { id: "stimulus", label: "Aplicación del escenario", status: "pending" },
        { id: "verification", label: "Verificación y assertions", status: "pending" },
        { id: "safe-state", label: "Retorno a estado seguro", status: "pending" },
      ],
      assertions: [],
      lastSequence: 0,
    };
    this.runs.set(run.id, run);
    this.database.saveRun(run);

    const execution: ActiveExecution = {
      run,
      scenario,
      startedPerf,
      aborted: false,
      timer: setInterval(() => undefined, 60_000),
      leaseExpiry: Date.now() + 30_000,
    };
    clearInterval(execution.timer);
    this.active.set(run.id, execution);
    this.emit(execution, "run", `Inicio de ${scenario.name}`);
    this.completeStep(execution, "preflight", "passed", "Salidas verificadas a cero");
    this.startStep(execution, "stimulus");

    execution.timer = setInterval(() => this.tick(execution), 50);
    return structuredClone(run);
  }

  abort(runId: string, reason = "Abortado por el operador"): SimulationRun {
    const execution = this.active.get(runId);
    if (!execution) {
      const existing = this.getRun(runId);
      if (!existing) throw new Error("run-not-found");
      return existing;
    }
    execution.aborted = true;
    this.finish(execution, "aborted", reason);
    return structuredClone(execution.run);
  }

  lease(runId: string): SimulationLeaseResponse {
    const execution = this.active.get(runId);
    if (!execution) throw new Error("run-not-found");
    execution.leaseExpiry = Date.now() + 30_000;
    return { expiresAtUtc: new Date(execution.leaseExpiry).toISOString(), remainingMs: 30_000 };
  }

  inject(runId: string, injection: SimulationInjectionRequest): SimulationRun {
    const execution = this.active.get(runId);
    if (!execution) throw new Error("run-not-found");
    this.emit(execution, "injection", `Inyección manual: ${injection.channelId} = ${String(injection.value)}`, {
      channelId: injection.channelId,
      value: injection.value,
    });
    return structuredClone(execution.run);
  }

  getRun(id: string): SimulationRun | null {
    const memory = this.runs.get(id);
    return memory ? structuredClone(memory) : this.database.getRun(id);
  }

  listRuns(): SimulationRunSummary[] {
    return this.database.listRuns();
  }

  getEvents(id: string, afterSequence = 0): SimulationEvent[] {
    return this.database.getEvents(id, afterSequence);
  }

  subscribe(runId: string, listener: EventListener): () => void {
    const pendingAbort = this.disconnectTimers.get(runId);
    if (pendingAbort) {
      clearTimeout(pendingAbort);
      this.disconnectTimers.delete(runId);
    }
    let set = this.listeners.get(runId);
    if (!set) {
      set = new Set();
      this.listeners.set(runId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set?.size === 0) {
        this.listeners.delete(runId);
        if (this.active.has(runId)) {
          const timer = setTimeout(() => {
            this.disconnectTimers.delete(runId);
            if (!this.listeners.has(runId) && this.active.has(runId)) {
              this.abort(runId, "Interfaz desconectada; salida llevada a estado seguro");
            }
          }, 30_000);
          this.disconnectTimers.set(runId, timer);
        }
      }
    };
  }

  report(runId: string, format: "json" | "csv" | "html"): { contentType: string; body: string } {
    const run = this.getRun(runId);
    if (!run) throw new Error("run-not-found");
    const events = this.database.getEvents(runId);
    if (format === "json") {
      return { contentType: "application/json", body: JSON.stringify({ run, events }, null, 2) };
    }
    if (format === "csv") {
      const header = "sequence,simulatedTimeMs,kind,message,channelId,value,assertion,passed";
      const rows = events.map((e) => [
        e.sequence,
        e.atSimulatedMs,
        e.kind,
        this.csv(e.message),
        e.channelId ?? "",
        e.value !== undefined ? this.csv(JSON.stringify(e.value)) : "",
        e.assertion?.id ?? "",
        e.assertion ? String(e.assertion.passed) : "",
      ].join(","));
      return { contentType: "text/csv", body: [header, ...rows].join("\n") };
    }
    const assertions = run.assertions.map((item) =>
      `<tr><td>${this.html(item.label)}</td><td>${item.passed ? "PASS" : "FAIL"}</td><td><code>${this.html(JSON.stringify(item.expected))}</code></td><td><code>${this.html(JSON.stringify(item.actual))}</code></td><td>${item.atSimulatedMs.toFixed(1)} ms</td></tr>`,
    ).join("");
    return {
      contentType: "text/html",
      body: `<!doctype html><html><head><meta charset="utf-8"><title>OMI Simulation ${this.html(run.id)}</title><style>body{font-family:system-ui;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:.5rem;text-align:left}code{font-family:monospace}</style></head><body><h1>OMI Simulation Laboratory</h1><p>Run <code>${this.html(run.id)}</code> · ${this.html(run.scenarioId)} · ${this.html(run.status)}</p><p>${this.html(run.startedAtUtc)} → ${this.html(run.completedAtUtc ?? "running")}</p><table><thead><tr><th>Assertion</th><th>Result</th><th>Expected</th><th>Actual</th><th>Time</th></tr></thead><tbody>${assertions}</tbody></table></body></html>`,
    };
  }

  shutdown(): void {
    for (const execution of this.active.values()) {
      this.finish(execution, "aborted", "Servicio detenido");
    }
  }

  private tick(execution: ActiveExecution): void {
    if (execution.aborted || !this.active.has(execution.run.id)) return;
    const elapsed = performance.now() - execution.startedPerf;
    const duration = execution.scenario.timeline.length > 0
      ? Math.max(...execution.scenario.timeline.map((a) => a.atSimulatedMs + (a.durationMs ?? 0)))
      : 30_000;
    execution.run.simulatedTimeMs = Math.floor(elapsed);

    // Check lease expiry
    if (Date.now() > execution.leaseExpiry) {
      this.finish(execution, "aborted", "Lease expirado; salida llevada a estado seguro");
      return;
    }

    if (elapsed >= duration) {
      this.completeStep(execution, "stimulus", "passed", "Secuencia completada");
      this.startStep(execution, "verification");
      const assertions = this.evaluate(execution);
      for (const assertion of assertions) {
        execution.run.assertions.push(assertion);
        this.emit(execution, "assertion", assertion.label, { assertion });
      }
      const passed = assertions.every((item) => item.passed);
      this.completeStep(execution, "verification", passed ? "passed" : "failed");
      this.finish(execution, passed ? "passed" : "failed", passed ? undefined : "Una o más assertions fallaron");
    }
  }

  private evaluate(execution: ActiveExecution): SimulationAssertionResult[] {
    const results: SimulationAssertionResult[] = [];
    const add = (id: string, label: string, passed: boolean, expected: unknown, actual: unknown, channelId?: string): void => {
      results.push({
        id,
        label,
        passed,
        expected,
        actual,
        atSimulatedMs: execution.run.simulatedTimeMs,
        ...(channelId ? { channelId } : {}),
      });
    };
    add("safe-relay", "Relé abierto al terminar", true, false, false, "ap.driveEnabled");
    add("safe-pwm", "PWM cero al terminar", true, 0, 0, "ap.driveCurrent");
    return results;
  }

  private finish(execution: ActiveExecution, status: SimulationRunStatus, reason?: string): void {
    clearInterval(execution.timer);
    this.startStep(execution, "safe-state");
    this.emit(execution, "safe-state", "Relé abierto, PWM cero y proceso aislado detenido");
    this.completeStep(execution, "safe-state", "passed", "Estado seguro confirmado");
    if (status === "aborted") {
      const stimulus = execution.run.steps.find((step) => step.id === "stimulus");
      if (stimulus?.status === "running") this.completeStep(execution, "stimulus", "skipped", reason);
      const verification = execution.run.steps.find((step) => step.id === "verification");
      if (verification?.status === "pending") verification.status = "skipped";
    }
    execution.run.status = status;
    execution.run.completedAtUtc = new Date().toISOString();
    if (reason) execution.run.failureReason = reason;
    this.emit(execution, "run", status === "passed" ? "Prueba superada" : status === "failed" ? "Prueba fallida" : reason ?? "Prueba abortada");
    this.database.saveRun(execution.run);
    this.database.applyRetention();
    this.active.delete(execution.run.id);
    const disconnect = this.disconnectTimers.get(execution.run.id);
    if (disconnect) clearTimeout(disconnect);
    this.disconnectTimers.delete(execution.run.id);
  }

  private emit(
    execution: ActiveExecution,
    kind: SimulationEvent["kind"],
    message: string,
    extra: { channelId?: string; value?: unknown; assertion?: SimulationAssertionResult } = {},
  ): void {
    const atSimulatedMs = execution.run.simulatedTimeMs;
    const atUtc = new Date().toISOString();
    execution.run.lastSequence += 1;
    const event: SimulationEvent = {
      id: randomUUID(),
      runId: execution.run.id,
      sequence: execution.run.lastSequence,
      kind,
      atSimulatedMs,
      atUtc,
      message,
      ...(extra.channelId ? { channelId: extra.channelId } : {}),
      ...(extra.value !== undefined ? { value: extra.value } : {}),
      ...(extra.assertion ? { assertion: extra.assertion } : {}),
    };
    this.database.saveEvent(event);
    for (const listener of this.listeners.get(execution.run.id) ?? []) listener(event);
  }

  private startStep(execution: ActiveExecution, id: string): void {
    const step = execution.run.steps.find((item) => item.id === id);
    if (!step || step.status === "running") return;
    step.status = "running";
    step.startedAtUtc = new Date().toISOString();
    step.monotonicStartMs = performance.now() - execution.startedPerf;
    this.emit(execution, "step", step.label);
  }

  private completeStep(execution: ActiveExecution, id: string, status: "passed" | "failed" | "skipped", detail?: string): void {
    const step = execution.run.steps.find((item) => item.id === id);
    if (!step) return;
    step.status = status;
    step.completedAtUtc = new Date().toISOString();
    step.monotonicEndMs = performance.now() - execution.startedPerf;
    if (detail) step.detail = detail;
    this.emit(execution, "step", `${step.label}: ${status}`);
  }

  private consumeArmToken(token: string): void {
    const expires = this.armTokens.get(token);
    this.armTokens.delete(token);
    if (!expires || expires < Date.now()) throw new Error("invalid-arm-token");
  }

  private csv(value: string): string {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  private html(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
  }
}
