import { Injectable } from "@angular/core";
import { BehaviorSubject, filter } from "rxjs";
import { PATHS } from "@omi/marine-data-contract";
import { DatapointStoreService } from "../state/datapoints/datapoint-store.service";

export type AlarmSeverity = "warning" | "critical";

type AlarmId = "depth" | "voltage";

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
};

const severityRank: Record<AlarmSeverity, number> = {
  warning: 1,
  critical: 2,
};

const buildMessage = (id: AlarmId, value: number, acknowledged: boolean): string => {
  const base =
    id === "depth" ? `LOW DEPTH ${value.toFixed(1)} m` : `LOW VOLTAGE ${value.toFixed(2)} V`;
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
  ]);

  private readonly stateSubject = new BehaviorSubject<AlarmState>({
    active: false,
    acknowledged: false,
    severity: "warning",
    message: "No active alarms",
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(store: DatapointStoreService) {
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
  }

  acknowledge(): void {
    const current = this.stateSubject.value;
    if (!current.active || current.acknowledged || !current.id) {
      return;
    }
    const status = this.alarmStatus.get(current.id);
    if (!status) {
      return;
    }
    const acknowledged = true;
    const updated: AlarmStatus = {
      ...status,
      acknowledged,
      message:
        status.value !== undefined ? buildMessage(status.id, status.value, acknowledged) : status.message,
    };
    this.alarmStatus.set(current.id, updated);
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
    if (active.length === 0) {
      this.stateSubject.next({
        active: false,
        acknowledged: false,
        severity: "warning",
        message: "No active alarms",
      });
      return;
    }

    const top = active.sort((a, b) => {
      const severityDiff = severityRank[b.severity] - severityRank[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return b.priority - a.priority;
    })[0];

    this.stateSubject.next({
      active: true,
      acknowledged: top.acknowledged,
      severity: top.severity,
      message: top.message,
      threshold: top.threshold,
      id: top.id,
    });
  }
}
