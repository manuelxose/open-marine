import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Alarm, AlarmSeverity, AlarmState, AlarmType } from './alarm.models';

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
    data?: any
  ): void {
    const currentMap = this._alarms.value;
    const existing = currentMap.get(id);

    // If already active/ack/silenced, just update timestamp/message if changed?
    // Usually we don't want to re-trigger audio if it's already acknowledged, unless severity escalates.
    
    if (existing && (existing.state === AlarmState.Active || existing.state === AlarmState.Acknowledged || existing.state === AlarmState.Silenced)) {
      // Alarm is effectively active.
      
      // If severity increases (e.g. Warning -> Critical), reset to Active to re-notify user
      if (this.isSeverityHigher(severity, existing.severity)) {
         this.updateAlarmState(existing, AlarmState.Active, { severity, message, timestamp: Date.now(), data });
         return;
      }
      
      // Otherwise just update data without changing state
      // We do NOT update timestamp usually to keep original trigger time, unless requested.
      // Let's just update data/message for now.
      if (existing.message !== message || JSON.stringify(existing.data) !== JSON.stringify(data)) {
        const updated = { ...existing, message, data };
        const nextMap = new Map(currentMap);
        nextMap.set(id, updated);
        this._alarms.next(nextMap);
      }
      return;
    }

    // New or previously cleared alarm -> Set to Active
    const newAlarm: Alarm = {
      id,
      type,
      severity,
      state: AlarmState.Active,
      message,
      data,
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
      
      // Optional: Remove cleared alarms after some time or keep them in history?
      // For now we keep them as 'Cleared' in the map.
    }
  }
  
  clearAll(): void {
     // Provide way to reset store (e.g. at startup)
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
    const severityScore = {
      [AlarmSeverity.Warning]: 1,
      [AlarmSeverity.Critical]: 2,
      [AlarmSeverity.Emergency]: 3,
    };
    return severityScore[newSev] > severityScore[oldSev];
  }
}
