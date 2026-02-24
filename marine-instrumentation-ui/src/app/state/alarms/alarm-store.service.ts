import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Alarm, AlarmCategory, AlarmSeverity, AlarmState, AlarmType, ALARM_TYPE_CATEGORY } from './alarm.models';

@Injectable({
  providedIn: 'root',
})
export class AlarmStoreService {
  // Map for O(1) access by ID
  private readonly _alarms = new BehaviorSubject<Map<string, Alarm>>(new Map());
  
  public readonly alarms$ = this._alarms.asObservable().pipe(
    map(alarmsMap => Array.from(alarmsMap.values()).sort((a, b) => b.timestamp - a.timestamp))
  );

  public readonly activeAlarms$ = this.alarms$.pipe(
    map(alarms => alarms.filter(a => 
      a.state === AlarmState.Active || 
      a.state === AlarmState.Acknowledged || 
      a.state === AlarmState.Silenced
    ))
  );

  public readonly highestSeverity$ = this.activeAlarms$.pipe(
    map(alarms => {
      if (alarms.some(a => a.severity === AlarmSeverity.Emergency)) return AlarmSeverity.Emergency;
      if (alarms.some(a => a.severity === AlarmSeverity.Critical)) return AlarmSeverity.Critical;
      if (alarms.some(a => a.severity === AlarmSeverity.Warning)) return AlarmSeverity.Warning;
      return null;
    })
  );

  constructor() {}

  /**
   * Trigger (create or update) an alarm.
   * If alarm exists and is inactive/cleared, it reactivates it.
   * If alarm exists and is already active/ack/silenced, it updates metadata if needed.
   */
  triggerAlarm(
    id: string, 
    type: AlarmType, 
    severity: AlarmSeverity, 
    message: string, 
    data?: Record<string, unknown>
  ): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);

    // If inhibited by user, skip
    if (existing?.state === AlarmState.Inhibited) return;
    
    if (existing && (existing.state === AlarmState.Active || existing.state === AlarmState.Acknowledged || existing.state === AlarmState.Silenced)) {
      if (this.isSeverityHigher(severity, existing.severity)) {
         this.updateAlarmState(existing, AlarmState.Active, { severity, message, timestamp: Date.now(), ...(data !== undefined ? { data } : {}) });
         return;
      }
      
      if (existing.message !== message || JSON.stringify(existing.data) !== JSON.stringify(data)) {
        const updated: Alarm = { ...existing, message, ...(data !== undefined ? { data } : {}) };
        const nextMap = new Map(currentMap);
        nextMap.set(id, updated);
        this._alarms.next(nextMap);
      }
      return;
    }

    const category: AlarmCategory = ALARM_TYPE_CATEGORY[type] ?? 'system';

    const newAlarm: Alarm = {
      id,
      type,
      category,
      severity,
      state: AlarmState.Active,
      message,
      ...(data !== undefined ? { data } : {}),
      timestamp: Date.now()
    };

    const nextMap = new Map(currentMap);
    nextMap.set(id, newAlarm);
    this._alarms.next(nextMap);
  }

  acknowledgeAlarm(id: string): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);
    if (!existing) return;

    if (existing.state === AlarmState.Active) {
      this.updateAlarmState(existing, AlarmState.Acknowledged);
    }
  }

  silenceAlarm(id: string): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);
    if (!existing) return;

    if (existing.state === AlarmState.Active || existing.state === AlarmState.Acknowledged) {
      this.updateAlarmState(existing, AlarmState.Silenced);
    }
  }

  clearAlarm(id: string): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);
    if (!existing) return;

    if (existing.state !== AlarmState.Cleared && existing.state !== AlarmState.Inactive) {
      this.updateAlarmState(existing, AlarmState.Cleared);
    }
  }

  resolveAlarm(id: string): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);
    if (!existing) return;

    if (existing.state === AlarmState.Active || existing.state === AlarmState.Acknowledged || existing.state === AlarmState.Silenced) {
      this.updateAlarmState(existing, AlarmState.Resolved, { resolvedAt: Date.now() });
    }
  }

  inhibitAlarm(id: string): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);
    if (!existing) return;
    this.updateAlarmState(existing, AlarmState.Inhibited);
  }

  acknowledgeAll(): void {
    const currentMap = this._alarms.value;
    const nextMap = new Map(currentMap);
    let changed = false;

    for (const [key, alarm] of nextMap) {
      if (alarm.state === AlarmState.Active) {
        nextMap.set(key, { ...alarm, state: AlarmState.Acknowledged, acknowledgedAt: Date.now() });
        changed = true;
      }
    }

    if (changed) this._alarms.next(nextMap);
  }

  silenceAll(): void {
    const currentMap = this._alarms.value;
    const nextMap = new Map(currentMap);
    let changed = false;

    for (const [key, alarm] of nextMap) {
      if (alarm.state === AlarmState.Active || alarm.state === AlarmState.Acknowledged) {
        nextMap.set(key, { ...alarm, state: AlarmState.Silenced });
        changed = true;
      }
    }

    if (changed) this._alarms.next(nextMap);
  }
  
  clearAll(): void {
     this._alarms.next(new Map());
  }

  private updateAlarmState(alarm: Alarm, newState: AlarmState, updates: Partial<Alarm> = {}): void {
    const currentMap = this._alarms.value;
    const updated: Alarm = {
      ...alarm,
      state: newState,
      ...updates
    };
    const nextMap = new Map(currentMap);
    nextMap.set(alarm.id, updated);
    this._alarms.next(nextMap);
  }

  private isSeverityHigher(newSev: AlarmSeverity, oldSev: AlarmSeverity): boolean {
    const severityScore: Record<AlarmSeverity, number> = {
      [AlarmSeverity.Info]: 0,
      [AlarmSeverity.Warning]: 1,
      [AlarmSeverity.Critical]: 2,
      [AlarmSeverity.Emergency]: 3,
    };
    return severityScore[newSev] > severityScore[oldSev];
  }
}
