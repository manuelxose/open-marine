import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { BehaviorSubject, combineLatest, interval, map, startWith } from 'rxjs';
import { AlarmsFacadeService } from '../../../features/alarms/services/alarms-facade.service';
import { AlarmSeverity, AlarmState, Alarm } from '../../../state/alarms/alarm.models';
import { AppIconComponent, IconName } from '../../../shared/components/app-icon/app-icon.component';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';

type BannerSeverity = 'warning' | 'critical' | 'emergency';

interface BannerAlarm {
  id: string;
  type: string;
  message: string;
  severity: BannerSeverity;
  state: AlarmState;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface BannerAlarmView extends BannerAlarm {
  title: string;
  metaLabel: string;
  icon: IconName;
  canAcknowledge: boolean;
  canSilence: boolean;
  canDismiss: boolean;
}

interface AlarmBannerVm {
  empty: boolean;
  expanded: boolean;
  canExpand: boolean;
  showSummary: boolean;
  severity: BannerSeverity | null;
  alarms: BannerAlarmView[];
  summary: {
    total: number;
    warning: number;
    critical: number;
    emergency: number;
  };
  ariaLive: 'polite' | 'assertive';
}

@Component({
  selector: 'app-alarm-banner',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-12px)', opacity: 0 }),
        animate('250ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-12px)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    @if (vm$ | async; as vm) {
      <section
        class="alarm-banner"
        role="alert"
        [attr.aria-live]="vm.ariaLive"
        [class.alarm-banner--empty]="vm.empty"
        [class.alarm-banner--warning]="vm.severity === 'warning'"
        [class.alarm-banner--critical]="vm.severity === 'critical'"
        [class.alarm-banner--emergency]="vm.severity === 'emergency'"
      >
        @if (vm.empty) {
          <div class="alarm-empty">
            <app-icon name="info" size="16"></app-icon>
            <span>No active alarms</span>
          </div>
        } @else if (vm.showSummary) {
          <div class="alarm-summary" @slideDown>
            <div class="summary-main">
              <div class="summary-icon" [class.pulse]="vm.severity !== 'warning'">
                <app-icon [name]="summaryIcon(vm.severity)" size="18"></app-icon>
              </div>
              <div class="summary-content">
                <div class="summary-title">{{ vm.summary.total }} ACTIVE ALARMS</div>
                <div class="summary-meta">
                  @if (vm.summary.emergency > 0) {
                    <span>{{ vm.summary.emergency }} Emergency</span>
                  }
                  @if (vm.summary.critical > 0) {
                    <span>{{ vm.summary.critical }} Critical</span>
                  }
                  @if (vm.summary.warning > 0) {
                    <span>{{ vm.summary.warning }} Warning</span>
                  }
                </div>
              </div>
            </div>
            <button
              type="button"
              class="summary-action"
              (click)="toggleExpanded()"
              aria-label="View all alarms"
            >
              View all
            </button>
          </div>
        } @else {
          <div class="alarm-stack">
            @for (alarm of vm.alarms; track alarm.id; let i = $index) {
              <div
                class="alarm-card"
                [class.severity-warning]="alarm.severity === 'warning'"
                [class.severity-critical]="alarm.severity === 'critical'"
                [class.severity-emergency]="alarm.severity === 'emergency'"
                [style.--stack]="i"
                @slideDown
              >
                <div class="alarm-icon" [class.pulse]="alarm.severity !== 'warning'">
                  <app-icon [name]="alarm.icon" size="18"></app-icon>
                </div>
                <div class="alarm-body">
                  <div class="alarm-primary">
                    <span class="alarm-title">{{ alarm.title }}</span>
                    <span class="alarm-message">{{ alarm.message }}</span>
                  </div>
                  <div class="alarm-meta">{{ alarm.metaLabel }}</div>
                </div>
                <div class="alarm-actions">
                  @if (alarm.canAcknowledge) {
                    <app-button
                      size="sm"
                      [variant]="alarm.severity === 'warning' ? 'warning' : 'danger'"
                      label="Ack"
                      (action)="acknowledge(alarm.id)"
                    ></app-button>
                  }
                  @if (alarm.canSilence) {
                    <app-button
                      size="sm"
                      variant="ghost"
                      label="Silence"
                      (action)="silence(alarm.id)"
                    ></app-button>
                  }
                  @if (alarm.canDismiss) {
                    <button
                      type="button"
                      class="alarm-dismiss"
                      (click)="dismiss(alarm.id)"
                      aria-label="Dismiss alarm"
                    >
                      <app-icon name="x" size="14"></app-icon>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
          @if (vm.canExpand) {
            <div class="alarm-footer">
              <button
                type="button"
                class="footer-action"
                (click)="toggleExpanded()"
                [attr.aria-label]="vm.expanded ? 'Collapse alarms' : 'View all alarms'"
              >
                {{ vm.expanded ? 'Collapse' : 'View all' }}
              </button>
            </div>
          }
        }
      </section>
    }
  `,
  styles: [`
    :host {
      display: block;
      padding: var(--space-3) var(--space-4) 0;
    }

    .alarm-banner {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      box-shadow: var(--shadow-sm);
      color: var(--text-primary);
    }

    .alarm-banner--warning {
      border-color: color-mix(in srgb, var(--warn) 55%, var(--border-default));
      background: color-mix(in srgb, var(--warn) 8%, var(--bg-surface));
    }

    .alarm-banner--critical {
      border-color: color-mix(in srgb, var(--danger) 60%, var(--border-default));
      background: color-mix(in srgb, var(--danger) 10%, var(--bg-surface));
    }

    .alarm-banner--emergency {
      border-color: var(--danger);
      background: color-mix(in srgb, var(--danger) 14%, var(--bg-surface));
      box-shadow: var(--shadow-md);
      animation: banner-pulse 2.4s infinite;
    }

    .alarm-empty {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-secondary);
      font-size: var(--text-sm);
      font-weight: 600;
    }

    .alarm-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .summary-main {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    .summary-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--text-secondary) 20%, transparent);
      color: var(--text-primary);
      position: relative;
    }

    .summary-icon.pulse::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0;
      animation: icon-pulse 2s infinite;
    }

    .summary-title {
      font-size: var(--text-sm);
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .summary-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .summary-action {
      border: 1px solid var(--border-strong);
      background: transparent;
      color: var(--text-primary);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .summary-action:hover {
      background: var(--bg-surface-secondary);
    }

    .alarm-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .alarm-card {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--bg-surface-secondary);
      border: 1px solid var(--border-default);
      position: relative;
      transform: translateY(calc(var(--stack, 0) * 2px));
    }

    .alarm-card.severity-warning {
      border-color: color-mix(in srgb, var(--warn) 35%, var(--border-default));
    }

    .alarm-card.severity-critical {
      border-color: color-mix(in srgb, var(--danger) 45%, var(--border-default));
    }

    .alarm-card.severity-emergency {
      border-color: var(--danger);
      background: color-mix(in srgb, var(--danger) 10%, var(--bg-surface));
    }

    .alarm-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--text-secondary) 20%, transparent);
      color: var(--text-primary);
      position: relative;
    }

    .alarm-icon.pulse::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0;
      animation: icon-pulse 2s infinite;
    }

    .alarm-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .alarm-primary {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: baseline;
    }

    .alarm-title {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .alarm-message {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 50vw;
    }

    .alarm-meta {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }

    .alarm-actions {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .alarm-dismiss {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-default);
      background: transparent;
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .alarm-dismiss:hover {
      background: var(--bg-surface-secondary);
      color: var(--text-primary);
    }

    .alarm-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-2);
    }

    .footer-action {
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
      cursor: pointer;
    }

    .footer-action:hover {
      color: var(--text-primary);
    }

    @media (max-width: 768px) {
      :host {
        padding: var(--space-2) var(--space-3) 0;
      }

      .alarm-card {
        flex-direction: column;
        align-items: flex-start;
      }

      .alarm-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .alarm-message {
        max-width: 100%;
        white-space: normal;
      }
    }

    @keyframes icon-pulse {
      0% {
        transform: scale(0.6);
        opacity: 0.7;
      }
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }

    @keyframes banner-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--danger) 40%, transparent);
      }
      50% {
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--danger) 40%, transparent);
      }
    }
  `],
})
export class AlarmBannerComponent {
  private readonly facade = inject(AlarmsFacadeService);
  private readonly expanded$ = new BehaviorSubject<boolean>(false);
  private readonly now$ = interval(1000).pipe(
    startWith(0),
    map(() => Date.now())
  );

  readonly vm$ = combineLatest([
    this.facade.activeAlarms$,
    this.expanded$,
    this.now$,
  ]).pipe(
    map(([alarms, expanded, now]) => {
      const bannerAlarms = alarms.map((alarm) => this.toBannerAlarm(alarm));
      const severityRank: Record<BannerSeverity, number> = {
        warning: 1,
        critical: 2,
        emergency: 3,
      };

      const sorted = bannerAlarms.sort((a, b) => {
        const rank = severityRank[b.severity] - severityRank[a.severity];
        if (rank !== 0) {
          return rank;
        }
        return b.timestamp - a.timestamp;
      });

      const summary = {
        total: sorted.length,
        warning: sorted.filter((alarm) => alarm.severity === 'warning').length,
        critical: sorted.filter((alarm) => alarm.severity === 'critical').length,
        emergency: sorted.filter((alarm) => alarm.severity === 'emergency').length,
      };

      const canExpand = summary.total > 1;
      const expandedState = canExpand && expanded;
      const showSummary = canExpand && !expandedState;
      const visible = expandedState
        ? sorted.slice(0, 3)
        : summary.total === 1
          ? sorted.slice(0, 1)
          : [];

      const first = sorted[0];
      const severity = summary.total > 0 && first ? first.severity : null;
      const ariaLive = severity === 'critical' || severity === 'emergency' ? 'assertive' : 'polite';

      return {
        empty: summary.total === 0,
        expanded: expandedState,
        canExpand,
        showSummary,
        severity,
        alarms: visible.map((alarm) => this.toBannerView(alarm, now)),
        summary,
        ariaLive,
      } satisfies AlarmBannerVm;
    })
  );

  toggleExpanded(): void {
    this.expanded$.next(!this.expanded$.getValue());
  }

  acknowledge(alarmId: string): void {
    this.facade.acknowledgeAlarm(alarmId);
  }

  silence(alarmId: string): void {
    this.facade.silenceAlarm(alarmId);
  }

  dismiss(alarmId: string): void {
    this.facade.clearAlarm(alarmId);
  }

  summaryIcon(severity: BannerSeverity | null): IconName {
    if (severity === 'critical' || severity === 'emergency') {
      return 'error';
    }
    return 'alert-triangle';
  }

  private toBannerAlarm(alarm: Alarm): BannerAlarm {
    const metadata = typeof alarm.data === 'object' && alarm.data !== null
      ? (alarm.data as Record<string, unknown>)
      : undefined;

    const severity = alarm.severity === AlarmSeverity.Emergency
      ? 'emergency'
      : alarm.severity === AlarmSeverity.Critical
        ? 'critical'
        : 'warning';

    const banner: BannerAlarm = {
      id: alarm.id,
      type: alarm.type,
      message: alarm.message,
      severity,
      state: alarm.state,
      timestamp: alarm.timestamp,
    };
    if (metadata !== undefined) {
      banner.metadata = metadata;
    }
    return banner;
  }

  private toBannerView(alarm: BannerAlarm, now: number): BannerAlarmView {
    const ageLabel = this.formatAge(alarm.timestamp, now);
    const metaLabel = this.buildMeta(alarm, ageLabel);
    return {
      ...alarm,
      title: this.formatType(alarm.type),
      metaLabel,
      icon: this.iconFor(alarm),
      canAcknowledge: alarm.state === AlarmState.Active,
      canSilence: alarm.state !== AlarmState.Silenced && alarm.severity !== 'emergency',
      canDismiss: alarm.severity === 'warning',
    };
  }

  private formatType(type: string): string {
    return type.replace(/-/g, ' ').toUpperCase();
  }

  private buildMeta(alarm: BannerAlarm, ageLabel: string): string {
    const parts: string[] = [`Triggered ${ageLabel} ago`];
    if (alarm.state === AlarmState.Acknowledged) {
      parts.push('Acknowledged');
    }
    if (alarm.state === AlarmState.Silenced) {
      parts.push('Silenced');
    }
    return parts.join(' | ');
  }

  private formatAge(timestamp: number, now: number): string {
    const diffMs = Math.max(0, now - timestamp);
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  private iconFor(alarm: BannerAlarm): IconName {
    if (alarm.type === 'mob') {
      return 'mob';
    }
    if (alarm.severity === 'emergency') {
      return 'alarm';
    }
    if (alarm.severity === 'critical') {
      return 'error';
    }
    return 'alert-triangle';
  }
}
