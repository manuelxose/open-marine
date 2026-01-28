import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { AlarmService, type AlarmState } from '../../services/alarm.service';

export interface AlarmViewModel {
  hasActiveAlarm: boolean;
  isAcknowledged: boolean;
  severity: 'warning' | 'critical';
  message: string;
  alarmId: string | null;
  threshold: number | null;
  severityClass: string;
}

@Injectable({
  providedIn: 'root',
})
export class AlarmsFacadeService {
  private readonly alarmService = inject(AlarmService);

  readonly vm$ = this.alarmService.state$.pipe(
    map((state: AlarmState): AlarmViewModel => ({
      hasActiveAlarm: state.active,
      isAcknowledged: state.acknowledged,
      severity: state.severity,
      message: state.message,
      alarmId: state.id ?? null,
      threshold: state.threshold ?? null,
      severityClass: state.active
        ? state.severity === 'critical'
          ? 'alarm-critical'
          : 'alarm-warning'
        : 'alarm-clear',
    }))
  );

  acknowledge(): void {
    this.alarmService.acknowledge();
  }
}
