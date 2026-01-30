import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmStoreService } from '../../../state/alarms/alarm-store.service';
import { AlarmSeverity, AlarmState } from '../../../state/alarms/alarm.models';
import { combineLatest, map } from 'rxjs';
import { AlarmsFacadeService } from '../../../features/alarms/services/alarms-facade.service';

type BannerSeverity = 'warning' | 'critical';

interface BannerAlarm {
  id: string;
  message: string;
  severity: BannerSeverity;
  acknowledged: boolean;
  source: 'store';
}

@Component({
  selector: 'app-alarm-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (vm$ | async; as vm) {
      <div
        class="alarm-banner"
        [class.alarm-active]="vm.active"
        [class.alarm-warning]="vm.severity === 'warning'"
        [class.alarm-critical]="vm.severity === 'critical'"
        [class.alarm-ack]="vm.acknowledged">
        @if (vm.active) {
          <div class="alarm-icon" aria-hidden="true">!</div>
          <div class="alarm-body">
            <div class="alarm-label">ALARMAS ACTIVAS · {{ vm.count }}</div>
            <div class="alarm-message">{{ vm.message }}</div>
          </div>
          <div class="alarm-actions">
            @if (!vm.acknowledged) {
              <button class="alarm-button" type="button" (click)="acknowledge(vm)">
                Acknowledge
              </button>
            }
          </div>
        } @else {
          <span class="alarm-empty text-muted">No active alarms</span>
        }
      </div>
    }
  `,
  styles: [`
    .alarm-banner {
      min-height: 44px;
      background: var(--panel-bg, var(--card-bg));
      border: 1px solid var(--panel-border, var(--card-border));
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 12px;
      box-shadow: var(--shadow);
    }

    .alarm-banner.alarm-warning {
      border-color: color-mix(in srgb, var(--warn) 60%, var(--panel-border));
      background: color-mix(in srgb, var(--warn) 12%, var(--panel-bg));
    }

    .alarm-banner.alarm-critical {
      border-color: color-mix(in srgb, var(--danger) 60%, var(--panel-border));
      background: color-mix(in srgb, var(--danger) 14%, var(--panel-bg));
    }

    .alarm-icon {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--text-2) 18%, transparent);
      color: var(--text-1);
      font-weight: 800;
      font-size: 0.95rem;
      line-height: 1;
    }

    .alarm-warning .alarm-icon {
      background: color-mix(in srgb, var(--warn) 25%, transparent);
      color: var(--warn);
    }

    .alarm-critical .alarm-icon {
      background: color-mix(in srgb, var(--danger) 25%, transparent);
      color: var(--danger);
    }

    .alarm-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .alarm-label {
      font-size: 0.65rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--text-2);
    }

    .alarm-message {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60vw;
    }

    .alarm-actions {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .alarm-button {
      border: 1px solid color-mix(in srgb, var(--text-2) 40%, transparent);
      background: color-mix(in srgb, var(--surface-2) 70%, transparent);
      color: var(--text-1);
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .alarm-button:hover {
      background: color-mix(in srgb, var(--surface-3) 70%, transparent);
    }

    .alarm-warning .alarm-button {
      border-color: color-mix(in srgb, var(--warn) 55%, var(--panel-border));
      color: var(--warn);
    }

    .alarm-critical .alarm-button {
      border-color: color-mix(in srgb, var(--danger) 55%, var(--panel-border));
      color: var(--danger);
    }

    .alarm-empty {
      font-size: 0.75rem;
      font-weight: 600;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlarmBannerComponent {
  private readonly alarmsFacade = inject(AlarmsFacadeService);
  private readonly alarmStore = inject(AlarmStoreService);

  private readonly storeAlarms$ = this.alarmStore.activeAlarms$.pipe(
    map(alarms => alarms
      .filter(a => a.severity !== AlarmSeverity.Emergency)
      .filter(a => a.state === AlarmState.Active || a.state === AlarmState.Acknowledged || a.state === AlarmState.Silenced)
      .map((a): BannerAlarm => ({
        id: a.id,
        message: a.message,
        severity: a.severity === AlarmSeverity.Critical ? 'critical' : 'warning',
        acknowledged: a.state !== AlarmState.Active,
        source: 'store',
      }))
    )
  );

  readonly vm$ = combineLatest([this.storeAlarms$]).pipe(
    map(([store]) => {
      const alarms: BannerAlarm[] = [...store];
      if (alarms.length === 0) {
        return { active: false, count: 0, severity: 'warning' as const, acknowledged: false, message: '' };
      }

      const severityRank: Record<BannerSeverity, number> = { warning: 1, critical: 2 };
      const sorted = [...alarms].sort((a, b) => {
        const sev = severityRank[b.severity] - severityRank[a.severity];
        if (sev !== 0) return sev;
        if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
        return 0;
      });

      const top = sorted[0];
      const countSuffix = alarms.length > 1 ? ` (+${alarms.length - 1})` : '';

      return {
        active: true,
        count: alarms.length,
        severity: top.severity,
        acknowledged: top.acknowledged,
        message: `${top.message}${countSuffix}`,
        source: top.source,
        id: top.id,
      };
    })
  );

  acknowledge(vm: { source?: 'store'; id?: string }): void {
    if (!vm.id) {
      return;
    }
    this.alarmStore.acknowledgeAlarm(vm.id);
  }
}
