import { Injectable } from "@angular/core";
import { BehaviorSubject, filter } from "rxjs";
import { PATHS } from "@omi/marine-data-contract";
import { DatapointStoreService } from "../state/datapoints/datapoint-store.service";
import { AisStoreService } from "../state/ais/ais-store.service";
import { toObservable } from "@angular/core/rxjs-interop";

export type AlarmSeverity = "warning" | "critical";

type AlarmId = "depth" | "voltage" | "cpa";

interface AlarmDefinition {
  id: AlarmId;
  label: string;
  severity: AlarmSeverity;
  threshold: number;
  hysteresis: number;
  priority: number;
}

interface AlarmStatus {
  id: AlarmId;
  active: boolean;
  acknowledged: boolean;
  severity: AlarmSeverity;
  message: string;
  threshold: number;
  value?: number;
  priority: number;
}

export interface AlarmState {
  active: boolean;
  acknowledged: boolean;
  severity: AlarmSeverity;
  message: string;
  threshold?: number;
  id?: AlarmId;
  activeAlarms: AlarmStatus[];
}

const ALARMS: Record<AlarmId, AlarmDefinition> = {
  depth: {
    id: "depth",
    label: "Depth",
    severity: "warning",
    threshold: 3.0,
    hysteresis: 0.5,
    priority: 2,
  },
  voltage: {
    id: "voltage",
    label: "Voltage",
    severity: "critical",
    threshold: 11.6,
    hysteresis: 0.3,
    priority: 1,
  },
  cpa: {
    id: "cpa",
    label: "CPA Warning",
    severity: "warning",
    threshold: 1852, // 1 NM in meters
    hysteresis: 100, // meters
    priority: 3,
  },
};

const severityRank: Record<AlarmSeverity, number> = {
  warning: 1,
  critical: 2,
};

const buildMessage = (id: AlarmId, value: number, acknowledged: boolean): string => {
  let base: string;
  switch (id) {
    case "depth":
      base = `LOW DEPTH ${value.toFixed(1)} m`;
      break;
    case "voltage":
      base = `LOW VOLTAGE ${value.toFixed(2)} V`;
      break;
    case "cpa":
      base = `COLLISION WARNING (CPA ${(value / 1852).toFixed(2)} NM)`;
      break;
    default:
      base = `ALARM ${id} ${value}`;
  }
  return acknowledged ? `${base} ACK` : base;
};

@Injectable({
  providedIn: "root",
})
export class AlarmService {
  private readonly alarmStatus = new Map<AlarmId, AlarmStatus>([
    [
      "depth",
      {
        id: "depth",
        active: false,
        acknowledged: false,
        severity: ALARMS.depth.severity,
        message: "No active alarms",
        threshold: ALARMS.depth.threshold,
        priority: ALARMS.depth.priority,
      },
    ],
    [
      "voltage",
      {
        id: "voltage",
        active: false,
        acknowledged: false,
        severity: ALARMS.voltage.severity,
        message: "No active alarms",
        threshold: ALARMS.voltage.threshold,
        priority: ALARMS.voltage.priority,
      },
    ],
    [
      "cpa",
      {
        id: "cpa",
        active: false,
        acknowledged: false,
        severity: ALARMS.cpa.severity,
        message: "No active alarms",
        threshold: ALARMS.cpa.threshold,
        priority: ALARMS.cpa.priority,
      },
    ]
  ]);

  private readonly stateSubject = new BehaviorSubject<AlarmState>({
    active: false,
    acknowledged: false,
    severity: "warning",
    message: "No active alarms",
    activeAlarms: []
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(
      store: DatapointStoreService,
      private aisStore: AisStoreService
  ) {
    store.observe<number>(PATHS.environment.depth.belowTransducer).pipe(
      filter((point): point is NonNullable<typeof point> => point !== undefined && typeof point.value === "number")
    ).subscribe((point) => {
      this.updateAlarm("depth", point.value);
    });
    store.observe<number>(PATHS.electrical.batteries.house.voltage).pipe(
      filter((point): point is NonNullable<typeof point> => point !== undefined && typeof point.value === "number")
    ).subscribe((point) => {
      this.updateAlarm("voltage", point.value);
    });
    
    // Subscribe to dangerous targets for CPA alarm
    toObservable(this.aisStore.dangerousTargets).subscribe((targets) => {
        if (targets.length === 0) {
            // Clear alarm if no dangerous targets
            // We pass a large value (infinity) to simulate "safe" distance if we want clear logic to trigger generally
            // Or better, handle specifically. reusing updateAlarm logic:
            // threshold matches if value <= threshold. So clearing means value > threshold + hysteresis.
            this.updateAlarm("cpa", 999999);
        } else {
            // Find minimum CPA among dangerous targets
            let minCpa = Infinity;
            for(const t of targets) {
                if (t.cpa !== undefined && t.cpa !== null && t.cpa < minCpa) {
                    minCpa = t.cpa;
                }
            }
            if (minCpa !== Infinity) {
                this.updateAlarm("cpa", minCpa);
            }
        }
    });
  }

  acknowledge(id?: AlarmId): void {
    const targetId = id || this.stateSubject.value.id;
    if (!targetId) return;

    const status = this.alarmStatus.get(targetId);
    if (!status || !status.active || status.acknowledged) {
      return;
    }
    const acknowledged = true;
    const updated: AlarmStatus = {
      ...status,
      acknowledged,
      message:
        status.value !== undefined ? buildMessage(status.id, status.value, acknowledged) : status.message,
    };
    this.alarmStatus.set(targetId, updated);
    this.emitBanner();
  }

  private updateAlarm(id: AlarmId, value: number): void {
    const definition = ALARMS[id];
    const current = this.alarmStatus.get(id);
    if (!current) {
      return;
    }

    const isLow = value <= definition.threshold;
    const isClear = value >= definition.threshold + definition.hysteresis;

    if (isLow) {
      const acknowledged = current.active ? current.acknowledged : false;
      this.alarmStatus.set(id, {
        id,
        active: true,
        acknowledged,
        severity: definition.severity,
        message: buildMessage(id, value, acknowledged),
        threshold: definition.threshold,
        value,
        priority: definition.priority,
      });
      this.emitBanner();
      return;
    }

    if (isClear) {
      this.alarmStatus.set(id, {
        ...current,
        active: false,
        acknowledged: false,
        message: "No active alarms",
        value,
      });
      this.emitBanner();
      return;
    }

    if (current.active) {
      this.alarmStatus.set(id, {
        ...current,
        value,
        message: buildMessage(id, value, current.acknowledged),
      });
      this.emitBanner();
    }
  }

  private emitBanner(): void {
    const active = Array.from(this.alarmStatus.values()).filter((alarm) => alarm.active);
    
    // Sort logic: Unacknowledged first, then Severity, then Priority
    const sorted = active.sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) {
        return a.acknowledged ? 1 : -1; // Unacknowledged first
      }
      const severityDiff = severityRank[b.severity] - severityRank[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return b.priority - a.priority;
    });

    if (sorted.length === 0) {
      this.stateSubject.next({
        active: false,
        acknowledged: false,
        severity: "warning",
        message: "No active alarms",
        activeAlarms: []
      });
      return;
    }

    const top = sorted[0];
    if (!top) {
      return;
    }

    this.stateSubject.next({
      active: true,
      acknowledged: top.acknowledged,
      severity: top.severity,
      message: top.message,
      threshold: top.threshold,
      id: top.id,
      activeAlarms: sorted
    });
  }
}
