import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, distinctUntilChanged } from 'rxjs';
import { Alarm, AlarmRuleInput, AlarmState } from './types';
import { AlarmEngine } from './alarm-engine';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { PreferencesService } from '../../core/preferences/preferences.service';
import { selectDepth, selectPosition, selectBatteryVoltage } from '../datapoints/datapoint.selectors';

@Injectable({
  providedIn: 'root',
})
export class AlarmStoreService {
  private readonly datapoints = inject(DatapointStoreService);
  private readonly preferences = inject(PreferencesService);

  private readonly state$ = new BehaviorSubject<AlarmState>({ activeAlarms: [] });
  private readonly acknowledgedIds = new Set<string>();

  readonly alarms$ = this.state$.asObservable().pipe(map((s) => s.activeAlarms));
  readonly activeUnacknowledgedAlarms$ = this.alarms$.pipe(
    map((alarms) => alarms.filter((a) => !a.acknowledged))
  );

  constructor() {
    this.initEngine();
  }

  private initEngine() {
    combineLatest({
      depth: selectDepth(this.datapoints),
      position: selectPosition(this.datapoints),
      voltage: selectBatteryVoltage(this.datapoints),
      prefs: this.preferences.preferences$,
    })
      .pipe(
        map(({ depth, position, voltage, prefs }) => {
          const now = Date.now();
          const positionAgeS = position?.timestamp ? (now - position.timestamp) / 1000 : null;

          const input: AlarmRuleInput = {
            depthM: depth?.value ?? null,
            voltageV: voltage?.value ?? null,
            positionAgeS,
            shallowThresholdM: prefs.shallowThreshold,
            lowVoltageThresholdV: 11.5, // Default for now
            gpsStaleThresholdS: 5,     // Default for now
          };

          return AlarmEngine.evaluate(input);
        }),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((calculatedAlarms) => {
        const currentActive = this.state$.value.activeAlarms;
        
        // Merge calculated alarms with acknowledgment state
        const nextAlarms: Alarm[] = calculatedAlarms.map((partial) => {
          const existing = currentActive.find((a) => a.id === partial.id);
          return {
            ...partial,
            timestamp: existing?.timestamp ?? Date.now(),
            acknowledged: this.acknowledgedIds.has(partial.id!),
          } as Alarm;
        });

        // Cleanup acknowledged IDs for alarms no longer active
        const activeIds = new Set(nextAlarms.map((a) => a.id));
        for (const id of this.acknowledgedIds) {
          if (!activeIds.has(id)) {
            this.acknowledgedIds.delete(id);
          }
        }

        this.state$.next({ activeAlarms: nextAlarms });
      });
  }

  acknowledge(alarmId: string) {
    this.acknowledgedIds.add(alarmId);
    const alarms = this.state$.value.activeAlarms.map((a) =>
      a.id === alarmId ? { ...a, acknowledged: true } : a
    );
    this.state$.next({ ...this.state$.value, activeAlarms: alarms });
  }

  acknowledgeAll() {
    this.state$.value.activeAlarms.forEach(a => this.acknowledgedIds.add(a.id));
    const alarms = this.state$.value.activeAlarms.map((a) => ({ ...a, acknowledged: true }));
    this.state$.next({ ...this.state$.value, activeAlarms: alarms });
  }
}
