import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { AlarmsFacadeService } from '../../../alarms/services/alarms-facade.service';
import { Alarm, AlarmSeverity, AlarmState } from '../../../../state/alarms/alarm.models';
import { AppBadgeComponent, BadgeVariant } from '../../../../shared/components/app-badge/app-badge.component';

interface AlarmListItemVm {
  id: string;
  message: string;
  severity: AlarmSeverity;
  state: AlarmState;
}

interface AlarmWidgetVm {
  alarms: AlarmListItemVm[];
  count: number;
  countLabel: string;
  highestSeverity: AlarmSeverity | null;
  unacknowledgedCount: number;
  pulse: boolean;
  variant: BadgeVariant;
  ariaLabel: string;
}

const ALARM_SEVERITY_RANK: Record<AlarmSeverity, number> = {
  [AlarmSeverity.Info]: 0,
  [AlarmSeverity.Warning]: 1,
  [AlarmSeverity.Critical]: 2,
  [AlarmSeverity.Emergency]: 3,
};

@Component({
  selector: 'app-alarm-status-widget',
  standalone: true,
  imports: [CommonModule, AppBadgeComponent],
  template: `
    <div class="alarm-widget" [class.alarm-widget--open]="panelOpen()">
      <button
        type="button"
        class="alarm-widget__trigger"
        [attr.aria-label]="vm().ariaLabel"
        [title]="vm().ariaLabel"
        (click)="togglePanel($event)"
      >
        <app-badge
          icon="alarm"
          size="md"
          [variant]="vm().variant"
          [dot]="vm().count > 0"
          [pulse]="vm().pulse"
        >
          {{ vm().countLabel }}
        </app-badge>
      </button>

      <section
        class="alarm-widget__panel"
        *ngIf="panelOpen()"
        role="dialog"
        aria-label="Alarm center"
        (click)="$event.stopPropagation()"
      >
        <header class="alarm-widget__header">
          <div class="alarm-widget__title-wrap">
            <h3>Alerts</h3>
            <span class="alarm-widget__count">{{ vm().countLabel }}</span>
          </div>
          <div class="alarm-widget__header-actions">
            <button
              type="button"
              class="alarm-widget__header-btn"
              *ngIf="vm().unacknowledgedCount > 0"
              (click)="acknowledgeAll($event)"
            >
              ACK ALL
            </button>
            <button
              type="button"
              class="alarm-widget__header-btn alarm-widget__header-btn--link"
              (click)="openAlarmsPage($event)"
            >
              VIEW
            </button>
          </div>
        </header>

        <div class="alarm-widget__empty" *ngIf="vm().count === 0">
          No active alerts
        </div>

        <ul class="alarm-widget__list" *ngIf="vm().count > 0">
          <li class="alarm-item" *ngFor="let alarm of vm().alarms">
            <div class="alarm-item__main">
              <span class="alarm-item__severity" [attr.data-severity]="alarm.severity"></span>
              <div class="alarm-item__text">
                <div class="alarm-item__message">{{ alarm.message }}</div>
                <div class="alarm-item__meta">
                  {{ severityLabel(alarm.severity) }} · {{ stateLabel(alarm.state) }}
                </div>
              </div>
            </div>

            <div class="alarm-item__actions">
              <button
                type="button"
                class="alarm-item__btn"
                *ngIf="alarm.state === alarmState.Active"
                (click)="acknowledge(alarm.id, $event)"
              >
                ACK
              </button>
              <button
                type="button"
                class="alarm-item__btn alarm-item__btn--clear"
                (click)="clear(alarm.id, $event)"
              >
                CLEAR
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      pointer-events: auto;
    }

    .alarm-widget {
      position: relative;
      display: inline-flex;
      align-items: flex-start;
      justify-content: flex-end;
    }

    .alarm-widget__trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      border: 0;
      border-radius: var(--radius-full);
      background: transparent;
      cursor: pointer;
      transform: scale(1.16);
      transform-origin: top right;
      transition: transform var(--duration-fast) var(--ease-out);
    }

    .alarm-widget__trigger:hover {
      transform: scale(1.16) translateY(-1px);
    }

    .alarm-widget__trigger:active {
      transform: scale(1.08);
    }

    .alarm-widget__trigger:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--danger) 70%, white);
      outline-offset: 2px;
    }

    .alarm-widget__panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: min(340px, 84vw);
      max-height: min(58vh, 420px);
      display: flex;
      flex-direction: column;
      border-radius: 14px;
      border: 1px solid var(--chart-overlay-border);
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
      animation: alarm-widget-enter 0.18s var(--ease-out) both;
    }

    .alarm-widget__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid color-mix(in srgb, var(--border-default) 50%, transparent);
      background: color-mix(in srgb, var(--bg-surface-secondary) 40%, transparent);
    }

    .alarm-widget__title-wrap {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .alarm-widget__title-wrap h3 {
      margin: 0;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gb-text-value);
    }

    .alarm-widget__count {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--gb-needle-secondary) 18%, transparent);
      color: var(--gb-needle-secondary);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .alarm-widget__header-actions {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }

    .alarm-widget__header-btn {
      height: 24px;
      padding: 0 8px;
      border-radius: var(--radius-sm, 6px);
      border: 1px solid color-mix(in srgb, var(--border-default) 65%, transparent);
      background: transparent;
      color: var(--gb-text-muted);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .alarm-widget__header-btn:hover {
      color: var(--gb-text-value);
      border-color: color-mix(in srgb, var(--gb-text-value) 45%, transparent);
      background: color-mix(in srgb, var(--bg-surface-secondary) 50%, transparent);
    }

    .alarm-widget__header-btn--link {
      color: var(--gb-needle-secondary);
      border-color: color-mix(in srgb, var(--gb-needle-secondary) 40%, transparent);
    }

    .alarm-widget__empty {
      padding: var(--space-4);
      font-size: 0.78rem;
      color: var(--gb-text-muted);
      text-align: center;
    }

    .alarm-widget__list {
      margin: 0;
      padding: var(--space-2);
      list-style: none;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .alarm-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--border-default) 35%, transparent);
      background: color-mix(in srgb, var(--bg-surface-secondary) 35%, transparent);
    }

    .alarm-item__main {
      min-width: 0;
      display: inline-flex;
      align-items: flex-start;
      gap: 8px;
      flex: 1;
    }

    .alarm-item__severity {
      width: 8px;
      height: 8px;
      margin-top: 4px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--gb-data-stale);
    }

    .alarm-item__severity[data-severity="warning"] {
      background: var(--gb-data-warn);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--gb-data-warn) 22%, transparent);
    }

    .alarm-item__severity[data-severity="critical"],
    .alarm-item__severity[data-severity="emergency"] {
      background: var(--danger);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 20%, transparent);
    }

    .alarm-item__text {
      min-width: 0;
    }

    .alarm-item__message {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--gb-text-value);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .alarm-item__meta {
      margin-top: 2px;
      font-size: 0.62rem;
      color: var(--gb-text-muted);
      letter-spacing: 0.02em;
    }

    .alarm-item__actions {
      display: inline-flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .alarm-item__btn {
      height: 24px;
      padding: 0 8px;
      border-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--gb-needle-secondary) 35%, transparent);
      background: color-mix(in srgb, var(--gb-needle-secondary) 12%, transparent);
      color: var(--gb-needle-secondary);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .alarm-item__btn:hover {
      background: color-mix(in srgb, var(--gb-needle-secondary) 22%, transparent);
    }

    .alarm-item__btn--clear {
      border-color: color-mix(in srgb, var(--danger) 40%, transparent);
      background: color-mix(in srgb, var(--danger) 10%, transparent);
      color: var(--danger);
    }

    .alarm-item__btn--clear:hover {
      background: color-mix(in srgb, var(--danger) 18%, transparent);
    }

    @keyframes alarm-widget-enter {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class AlarmStatusWidgetComponent {
  private readonly facade = inject(AlarmsFacadeService);
  private readonly router = inject(Router);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly alarmState = AlarmState;
  readonly panelOpen = signal(false);

  readonly vm = toSignal(
    this.facade.activeAlarms$.pipe(
      map((alarms) => this.toVm(alarms)),
    ),
    { initialValue: this.toVm([]) },
  );

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    this.panelOpen.set(!this.panelOpen());
  }

  acknowledge(alarmId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.facade.acknowledgeAlarm(alarmId);
  }

  clear(alarmId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.facade.clearAlarm(alarmId);
  }

  acknowledgeAll(event: MouseEvent): void {
    event.stopPropagation();
    for (const alarm of this.vm().alarms) {
      if (alarm.state === AlarmState.Active) {
        this.facade.acknowledgeAlarm(alarm.id);
      }
    }
  }

  openAlarmsPage(event: MouseEvent): void {
    event.stopPropagation();
    this.panelOpen.set(false);
    this.router.navigate(['/alarms']);
  }

  severityLabel(severity: AlarmSeverity): string {
    switch (severity) {
      case AlarmSeverity.Emergency:
        return 'Emergency';
      case AlarmSeverity.Critical:
        return 'Critical';
      case AlarmSeverity.Warning:
        return 'Warning';
      case AlarmSeverity.Info:
      default:
        return 'Info';
    }
  }

  stateLabel(state: AlarmState): string {
    switch (state) {
      case AlarmState.Active:
        return 'Active';
      case AlarmState.Acknowledged:
        return 'Acknowledged';
      case AlarmState.Silenced:
        return 'Silenced';
      case AlarmState.Resolved:
        return 'Resolved';
      case AlarmState.Inhibited:
        return 'Inhibited';
      case AlarmState.Cleared:
        return 'Cleared';
      case AlarmState.Inactive:
      default:
        return 'Inactive';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.panelOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.hostRef.nativeElement.contains(target)) {
      return;
    }

    this.panelOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.panelOpen.set(false);
  }

  private toVm(alarms: Alarm[]): AlarmWidgetVm {
    const sorted = [...alarms].sort((a, b) => {
      const severityDiff = ALARM_SEVERITY_RANK[b.severity] - ALARM_SEVERITY_RANK[a.severity];
      return severityDiff !== 0 ? severityDiff : b.timestamp - a.timestamp;
    });

    const highestSeverity = sorted.length > 0 ? sorted[0]?.severity ?? null : null;
    const count = sorted.length;
    const unacknowledgedCount = sorted.filter((alarm) => alarm.state === AlarmState.Active).length;

    return {
      alarms: sorted.map((alarm) => ({
        id: alarm.id,
        message: alarm.message,
        severity: alarm.severity,
        state: alarm.state,
      })),
      count,
      countLabel: count > 99 ? '99+' : String(count),
      highestSeverity,
      unacknowledgedCount,
      pulse: unacknowledgedCount > 0 && (highestSeverity === AlarmSeverity.Critical || highestSeverity === AlarmSeverity.Emergency),
      variant: this.toBadgeVariant(highestSeverity),
      ariaLabel: count === 0
        ? 'No active alarms'
        : `${count} active ${count === 1 ? 'alarm' : 'alarms'}`,
    };
  }

  private toBadgeVariant(severity: AlarmSeverity | null): BadgeVariant {
    switch (severity) {
      case AlarmSeverity.Critical:
      case AlarmSeverity.Emergency:
        return 'danger';
      case AlarmSeverity.Warning:
        return 'warning';
      case AlarmSeverity.Info:
        return 'info';
      default:
        return 'neutral';
    }
  }
}
