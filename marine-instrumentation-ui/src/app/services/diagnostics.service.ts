import { Injectable } from "@angular/core";
import { BehaviorSubject, interval } from "rxjs";
import { PATHS, type SignalKPath } from "@omi/marine-data-contract";
import { DatapointStoreService } from "../state/datapoints/datapoint-store.service";
import type { DataPoint } from "../state/datapoints/datapoint.models";

const DIAGNOSTIC_PATHS: SignalKPath[] = [
  PATHS.navigation.position,
  PATHS.navigation.speedOverGround,
  PATHS.navigation.courseOverGroundTrue,
  PATHS.navigation.headingTrue,
  PATHS.environment.depth.belowTransducer,
  PATHS.environment.wind.angleApparent,
  PATHS.environment.wind.speedApparent,
  PATHS.electrical.batteries.house.voltage,
  PATHS.electrical.batteries.house.current,
];

export type Freshness = "fresh" | "stale" | "dead" | "unknown";

export interface DiagnosticEntry {
  path: SignalKPath;
  lastTimestampMs?: number;
  latencyMs: number | null;
  freshness: Freshness;
  sourceLabel: string;
  previousSourceLabel?: string;
  sourceSwitchCount: number;
  lastSwitchTimestampMs?: number;
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

  constructor(store: DatapointStoreService) {
    DIAGNOSTIC_PATHS.forEach((path) => {
      this.entries.set(path, createEntry(path));
      store.observe(path).subscribe((point) => {
        this.updateFromPoint(path, point ?? null);
      });
    });

    interval(1000).subscribe(() => {
      this.refresh();
    });
  }

  private updateFromPoint(path: SignalKPath, point: DataPoint | null): void {
    const entry = this.entries.get(path) ?? createEntry(path);
    if (!point) {
      this.entries.set(path, entry);
      return;
    }

    const sourceLabel = point.source ?? "unknown";
    let previousSourceLabel = entry.previousSourceLabel;
    let sourceSwitchCount = entry.sourceSwitchCount;
    let lastSwitchTimestampMs = entry.lastSwitchTimestampMs;

    if (entry.sourceLabel !== "unknown" && sourceLabel !== entry.sourceLabel) {
      previousSourceLabel = entry.sourceLabel;
      sourceSwitchCount += 1;
      lastSwitchTimestampMs = point.timestamp;
    }

    const updated: DiagnosticEntry = {
      ...entry,
      lastTimestampMs: point.timestamp,
      sourceLabel,
      previousSourceLabel,
      sourceSwitchCount,
      lastSwitchTimestampMs,
    };

    this.entries.set(path, updated);
    this.refresh();
  }

  private refresh(): void {
    const nowMs = Date.now();
    const entryList = Array.from(this.entries.values()).map((entry) => {
      const latencyMs = entry.lastTimestampMs !== undefined ? Math.max(0, nowMs - entry.lastTimestampMs) : null;
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
