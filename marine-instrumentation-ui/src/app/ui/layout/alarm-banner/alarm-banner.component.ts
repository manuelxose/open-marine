import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { combineLatest, interval, map, startWith } from 'rxjs';
import { AlarmsFacadeService } from '../../../features/alarms/services/alarms-facade.service';
import { AlarmSeverity, AlarmState, Alarm } from '../../../state/alarms/alarm.models';
import { AppIconComponent, IconName } from '../../../shared/components/app-icon/app-icon.component';

type BannerSeverity = 'warning' | 'critical' | 'emergency';

interface BannerAlarm {
  id: string;
  type: string;
  message: string;
  severity: BannerSeverity;
  state: AlarmState;
  timestamp: number;
}

interface AlarmBannerVm {
  empty: boolean;
  severity: BannerSeverity | null;
  topAlarm: {
    id: string;
    icon: IconName;
    message: string;
    canAcknowledge: boolean;
  } | null;
  count: number;
  ariaLive: 'polite' | 'assertive';
}

@Component({
  selector: 'app-alarm-banner',
  standalone: true,
  imports: [CommonModule, AppIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm$ | async; as vm) {
      <div
        class="alarm-banner"
        [class.alarm-banner--empty]="vm.empty"
        [class.alarm-banner--has-alarms]="!vm.empty"
        [attr.aria-live]="vm.ariaLive"
        role="alert"
      >
        @if (!vm.empty && vm.topAlarm) {
          <div
            class="alarm-banner__inner"
            [attr.data-severity]="vm.severity"
          >
            <span class="alarm-banner__icon">
              <app-icon [name]="vm.topAlarm.icon" size="16"></app-icon>
            </span>

            <span class="alarm-banner__message">
              {{ vm.topAlarm.message }}
            </span>

            @if (vm.count > 1) {
              <span class="alarm-banner__count">
                +{{ vm.count - 1 }} more
              </span>
            }

            <span class="alarm-banner__actions">
              @if (vm.topAlarm.canAcknowledge) {
                <button
                  type="button"
                  class="alarm-banner__btn alarm-banner__btn--ack"
                  (click)="acknowledge(vm.topAlarm.id)"
                  aria-label="Acknowledge alarm"
                >
                  ACK
                </button>
              }
              <a
                class="alarm-banner__btn alarm-banner__btn--view"
                routerLink="/alarms"
                aria-label="View all alarms"
              >
                VIEW
              </a>
            </span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    /* ── Container ────────────────────────────────────── */
    .alarm-banner {
      position: relative;
      z-index: var(--z-20, 20);
      overflow: hidden;
      transition: max-height 300ms cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 300ms ease;
    }

    .alarm-banner--empty {
      max-height: 0;
      opacity: 0;
      pointer-events: none;
    }

    .alarm-banner--has-alarms {
      max-height: 52px;
      opacity: 1;
    }

    /* ── Inner strip (severity-coloured) ─────────────── */
    .alarm-banner__inner {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0 var(--space-4);
      height: 44px;
    }

    .alarm-banner__inner[data-severity="emergency"] {
      background: var(--gb-alarm-emergency-bg);
      border-bottom: 2px solid var(--gb-alarm-emergency-border);
      animation: gb-alarm-beat 0.8s ease-in-out infinite;
    }

    .alarm-banner__inner[data-severity="critical"] {
      background: var(--gb-alarm-critical-bg);
      border-bottom: 2px solid var(--gb-alarm-critical-border);
      animation: gb-alarm-beat 1.2s ease-in-out infinite;
    }

    .alarm-banner__inner[data-severity="warning"] {
      background: var(--gb-alarm-warning-bg);
      border-bottom: 1px solid var(--gb-alarm-warning-border);
    }

    /* ── Icon ─────────────────────────────────────────── */
    .alarm-banner__icon {
      font-size: 1rem;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      color: var(--gb-text-value);
    }

    /* ── Message ──────────────────────────────────────── */
    .alarm-banner__message {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--gb-text-value);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Count badge ─────────────────────────────────── */
    .alarm-banner__count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      color: var(--gb-text-muted);
      flex-shrink: 0;
    }

    /* ── Actions ──────────────────────────────────────── */
    .alarm-banner__actions {
      display: flex;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    .alarm-banner__btn {
      height: 28px;
      padding: 0 var(--space-2);
      border-radius: var(--radius-sm, 4px);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      border: 1px solid;
      transition: all 150ms ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .alarm-banner__btn--ack {
      background: transparent;
      border-color: var(--gb-text-muted);
      color: var(--gb-text-muted);
    }

    .alarm-banner__btn--ack:hover {
      border-color: var(--gb-text-value);
      color: var(--gb-text-value);
    }

    .alarm-banner__btn--view {
      background: transparent;
      border-color: #4a90d9;
      color: #4a90d9;
      text-decoration: none;
    }

    .alarm-banner__btn--view:hover {
      background: rgba(74, 144, 217, 0.12);
    }

    /* ── Animation ────────────────────────────────────── */
    @keyframes gb-alarm-beat {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.72; }
    }

    /* ── Responsive ───────────────────────────────────── */
    @media (max-width: 600px) {
      .alarm-banner__inner {
        padding: 0 var(--space-3);
        gap: var(--space-2);
      }

      .alarm-banner__count {
        display: none;
      }
    }
  `],
})
export class AlarmBannerComponent {
  private readonly facade = inject(AlarmsFacadeService);
  private readonly now$ = interval(1000).pipe(
    startWith(0),
    map(() => Date.now()),
  );

  readonly vm$ = combineLatest([
    this.facade.activeAlarms$,
    this.now$,
  ]).pipe(
    map(([alarms, _now]) => {
      const bannerAlarms = alarms.map((a) => this.toBannerAlarm(a));
      const severityRank: Record<BannerSeverity, number> = {
        warning: 1,
        critical: 2,
        emergency: 3,
      };

      const sorted = [...bannerAlarms].sort((a, b) => {
        const rank = severityRank[b.severity] - severityRank[a.severity];
        return rank !== 0 ? rank : b.timestamp - a.timestamp;
      });

      const count = sorted.length;
      const first = sorted[0] ?? null;
      const severity = first ? first.severity : null;
      const ariaLive: 'polite' | 'assertive' =
        severity === 'critical' || severity === 'emergency' ? 'assertive' : 'polite';

      const topAlarm = first
        ? {
            id: first.id,
            icon: this.iconFor(first),
            message: first.message,
            canAcknowledge: first.state === AlarmState.Active,
          }
        : null;

      return { empty: count === 0, severity, topAlarm, count, ariaLive } satisfies AlarmBannerVm;
    }),
  );

  acknowledge(alarmId: string): void {
    this.facade.acknowledgeAlarm(alarmId);
  }

  private toBannerAlarm(alarm: Alarm): BannerAlarm {
    const severity: BannerSeverity =
      alarm.severity === AlarmSeverity.Emergency
        ? 'emergency'
        : alarm.severity === AlarmSeverity.Critical
          ? 'critical'
          : 'warning';

    return {
      id: alarm.id,
      type: alarm.type,
      message: alarm.message,
      severity,
      state: alarm.state,
      timestamp: alarm.timestamp,
    };
  }

  private iconFor(alarm: BannerAlarm): IconName {
    if (alarm.type === 'mob') return 'mob';
    if (alarm.severity === 'emergency') return 'alarm';
    if (alarm.severity === 'critical') return 'error';
    return 'alert-triangle';
  }
}
