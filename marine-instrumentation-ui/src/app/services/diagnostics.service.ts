import { Injectable } from "@angular/core";
import { BehaviorSubject, interval } from "rxjs";
import type { SignalKPath } from "@omi/marine-data-contract";
import { DataStoreService } from "./data-store.service";
import { TELEMETRY_PATHS, type TelemetryPoint } from "./telemetry";

export type Freshness = "fresh" | "stale" | "dead" | "unknown";

export interface DiagnosticEntry {
  path: SignalKPath;
  lastTimestamp?: string;
  latencyMs: number | null;
  freshness: Freshness;
  sourceLabel: string;
  previousSourceLabel?: string;
  sourceSwitchCount: number;
  lastSwitchTimestamp?: string;
}

export interface DiagnosticsState {
  entries: DiagnosticEntry[];
  avgLatencyMs: number | null;
  maxLatencyMs: number | null;
  staleCount: number;
  deadCount: number;
  updatedAt: string;
}

const FRESHNESS_OK_MS = 2_000;
const FRESHNESS_STALE_MS = 10_000;

const computeFreshness = (latencyMs: number | null): Freshness => {
  if (latencyMs === null) {
    return "unknown";
  }
  if (latencyMs <= FRESHNESS_OK_MS) {
    return "fresh";
  }
  if (latencyMs <= FRESHNESS_STALE_MS) {
    return "stale";
  }
  return "dead";
};

const parseTimestampMs = (timestamp?: string): number | null => {
  if (!timestamp) {
    return null;
  }
  const ms = Date.parse(timestamp);
  return Number.isFinite(ms) ? ms : null;
};

const createEntry = (path: SignalKPath): DiagnosticEntry => ({
  path,
  latencyMs: null,
  freshness: "unknown",
  sourceLabel: "unknown",
  sourceSwitchCount: 0,
});

@Injectable({
  providedIn: "root",
})
export class DiagnosticsService {
  private readonly entries = new Map<SignalKPath, DiagnosticEntry>();
  private readonly stateSubject = new BehaviorSubject<DiagnosticsState>({
    entries: [],
    avgLatencyMs: null,
    maxLatencyMs: null,
    staleCount: 0,
    deadCount: 0,
    updatedAt: new Date().toISOString(),
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(store: DataStoreService) {
    TELEMETRY_PATHS.forEach((path) => {
      this.entries.set(path, createEntry(path));
      store.point$(path).subscribe((point) => {
        this.updateFromPoint(path, point ?? null);
      });
    });

    interval(1000).subscribe(() => {
      this.refresh();
    });
  }

  private updateFromPoint(path: SignalKPath, point: TelemetryPoint | null): void {
    const entry = this.entries.get(path) ?? createEntry(path);
    if (!point) {
      this.entries.set(path, entry);
      return;
    }

    const sourceLabel = point.source?.label ?? "unknown";
    let previousSourceLabel = entry.previousSourceLabel;
    let sourceSwitchCount = entry.sourceSwitchCount;
    let lastSwitchTimestamp = entry.lastSwitchTimestamp;

    if (entry.sourceLabel !== "unknown" && sourceLabel !== entry.sourceLabel) {
      previousSourceLabel = entry.sourceLabel;
      sourceSwitchCount += 1;
      lastSwitchTimestamp = point.timestamp;
    }

    const updated: DiagnosticEntry = {
      ...entry,
      lastTimestamp: point.timestamp,
      sourceLabel,
      previousSourceLabel,
      sourceSwitchCount,
      lastSwitchTimestamp,
    };

    this.entries.set(path, updated);
    this.refresh();
  }

  private refresh(): void {
    const nowMs = Date.now();
    const entryList = Array.from(this.entries.values()).map((entry) => {
      const timestampMs = parseTimestampMs(entry.lastTimestamp);
      const latencyMs = timestampMs !== null ? Math.max(0, nowMs - timestampMs) : null;
      return {
        ...entry,
        latencyMs,
        freshness: computeFreshness(latencyMs),
      };
    });

    const validLatencies = entryList
      .map((entry) => entry.latencyMs)
      .filter((value): value is number => value !== null);

    const avgLatencyMs =
      validLatencies.length > 0
        ? validLatencies.reduce((sum, value) => sum + value, 0) / validLatencies.length
        : null;
    const maxLatencyMs = validLatencies.length > 0 ? Math.max(...validLatencies) : null;
    const staleCount = entryList.filter((entry) => entry.freshness === "stale").length;
    const deadCount = entryList.filter((entry) => entry.freshness === "dead").length;

    this.stateSubject.next({
      entries: entryList,
      avgLatencyMs,
      maxLatencyMs,
      staleCount,
      deadCount,
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
}
