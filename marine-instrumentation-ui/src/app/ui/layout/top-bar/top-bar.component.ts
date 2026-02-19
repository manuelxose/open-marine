import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { AppBadgeComponent } from '../../../shared/components/app-badge/app-badge.component';
import { AppStatusComponent, StatusVariant } from '../../../shared/components/app-status/app-status.component';
import { BehaviorSubject, combineLatest, interval, map, startWith } from 'rxjs';

type ConnectionStatus = 'online' | 'degraded' | 'offline';

interface TopBarVm {
  brand: {
    name: string;
    subtitle: string;
  };
  connection: {
    status: ConnectionStatus;
    latency?: number;
    variant: StatusVariant;
  };
  clock: {
    time: string;
    timezone: string;
    date?: string;
  };
  alarms: {
    total: number;
    critical: number;
    warning: number;
    hasUnacknowledged: boolean;
  };
  theme: 'day' | 'night';
}

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, AppIconComponent, AppBadgeComponent, AppStatusComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm$ | async; as vm) {
      <header
        class="top-bar"
        [class.top-bar--alarm]="vm.alarms.total > 0"
        [class.top-bar--alarm-critical]="vm.alarms.critical > 0"
        [class.top-bar--offline]="vm.connection.status === 'offline'"
        [class.top-bar--degraded]="vm.connection.status === 'degraded'"
      >
        <div class="top-bar__left">
          <div class="brand">
            <span class="brand__name">{{ vm.brand.name }}</span>
            <span class="brand__divider"></span>
            <span class="brand__subtitle">{{ vm.brand.subtitle }}</span>
          </div>
          <app-status 
            [variant]="vm.connection.variant" 
            [pulse]="vm.connection.status === 'online'"
          >
            {{ statusLabel(vm.connection.status) }}
            @if (vm.connection.latency !== undefined) {
              <span class="status__latency"> · {{ vm.connection.latency }}ms</span>
            }
          </app-status>
        </div>

        <div class="top-bar__right">
          <div class="clock">
            <span class="clock__time">{{ vm.clock.time }}</span>
            <span class="clock__zone">{{ vm.clock.timezone }}</span>
            @if (vm.clock.date) {
              <span class="clock__date">{{ vm.clock.date }}</span>
            }
          </div>

          <div class="actions">
            <button
              type="button"
              class="action-btn action-btn--alarm"
              [class.has-alarms]="vm.alarms.total > 0"
              [class.is-critical]="vm.alarms.critical > 0"
              [class.is-attention]="vm.alarms.hasUnacknowledged"
              [attr.aria-label]="alarmAriaLabel(vm.alarms)"
              [attr.title]="alarmAriaLabel(vm.alarms)"
              (click)="openAlarms.emit()"
            >
              <app-icon name="alarm" size="20"></app-icon>
              @if (vm.alarms.total > 0) {
                <app-badge
                  class="alarm-badge"
                  size="sm"
                  [variant]="vm.alarms.critical > 0 ? 'danger' : 'warning'"
                  [pulse]="vm.alarms.critical > 0 || vm.alarms.hasUnacknowledged"
                >
                  {{ vm.alarms.total }}
                </app-badge>
              }
            </button>

            <button
              type="button"
              class="action-btn"
              [attr.aria-label]="themeLabel(vm.theme)"
              [attr.title]="themeLabel(vm.theme)"
              (click)="toggleTheme.emit()"
            >
              <app-icon [name]="vm.theme === 'night' ? 'moon' : 'sun'" size="20"></app-icon>
            </button>

            <a
              routerLink="/settings"
              class="action-btn"
              aria-label="Settings"
              title="Settings"
            >
              <app-icon name="settings" size="20"></app-icon>
            </a>
          </div>
        </div>
      </header>
    }
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: var(--z-20);
    }

    .top-bar {
      height: 56px;
      padding: 0 var(--space-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-default);
      box-shadow: var(--shadow-sm);
      position: relative;
    }

    .top-bar--alarm {
      border-bottom-color: color-mix(in srgb, var(--warn) 55%, var(--border-default));
    }

    .top-bar--alarm-critical::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: var(--danger);
      animation: alarm-pulse 2.2s infinite;
    }

    .top-bar--offline {
      background: color-mix(in srgb, var(--danger) 6%, var(--bg-surface));
    }

    .top-bar__left,
    .top-bar__right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .top-bar__right {
      margin-left: auto;
      gap: var(--space-4);
    }

    .brand {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      font-family: var(--font-heading);
      color: var(--text-primary);
    }

    .brand__name {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .brand__divider {
      width: 1px;
      height: 18px;
      background: var(--border-default);
    }

    .brand__subtitle {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .status__latency {
      font-family: var(--font-mono);
      font-weight: 600;
      letter-spacing: 0.02em;
      opacity: 0.8;
      font-size: 0.9em;
    }

    .clock {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--bg-surface-secondary);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .clock__time {
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .clock__zone {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .clock__date {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
      font-family: var(--font-technical);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .action-btn {
      width: 44px;
      height: 44px;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      position: relative;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .action-btn:hover,
    .action-btn:focus-visible {
      background: var(--bg-surface-secondary);
      color: var(--text-primary);
    }

    .action-btn:active {
      transform: translateY(1px);
    }

    .action-btn--alarm.has-alarms {
      color: var(--warn);
    }

    .action-btn--alarm.is-critical {
      color: var(--danger);
    }

    .action-btn--alarm.is-attention {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger) 30%, transparent);
    }

    .alarm-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      font-size: 0.6rem;
    }

    @media (max-width: 1024px) {
      .top-bar {
        padding: 0 var(--space-3);
      }

      .clock {
        padding: var(--space-1) var(--space-2);
      }
    }

    @media (max-width: 768px) {
      .clock {
        display: none;
      }

      .brand__divider,
      .brand__subtitle {
        display: none;
      }

      .brand__name {
        font-size: 1rem;
      }

      .status__latency {
        display: none;
      }
    }

    @keyframes alarm-pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }
  `]
})
export class TopBarComponent {
  private readonly connected$ = new BehaviorSubject<boolean>(false);
  private readonly latency$ = new BehaviorSubject<number | undefined>(undefined);
  private readonly isNight$ = new BehaviorSubject<boolean>(false);
  private readonly alarmCount$ = new BehaviorSubject<number>(0);
  private readonly criticalCount$ = new BehaviorSubject<number>(0);
  private readonly hasUnacknowledged$ = new BehaviorSubject<boolean>(false);

  @Input() set connected(value: boolean) {
    this.connected$.next(Boolean(value));
  }

  @Input() set latency(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      this.latency$.next(undefined);
      return;
    }
    this.latency$.next(Math.max(0, Math.round(value)));
  }

  @Input() set isNight(value: boolean | null) {
    this.isNight$.next(Boolean(value));
  }

  @Input() set alarmCount(value: number | null | undefined) {
    this.alarmCount$.next(this.sanitizeCount(value));
  }

  @Input() set criticalCount(value: number | null | undefined) {
    this.criticalCount$.next(this.sanitizeCount(value));
  }

  @Input() set hasUnacknowledged(value: boolean | null | undefined) {
    this.hasUnacknowledged$.next(Boolean(value));
  }

  @Output() toggleTheme = new EventEmitter<void>();
  @Output() openAlarms = new EventEmitter<void>();

  readonly clock$ = interval(1000).pipe(
    startWith(0),
    map(() => this.buildClock())
  );

  readonly vm$ = combineLatest([
    this.connected$,
    this.latency$,
    this.isNight$,
    this.alarmCount$,
    this.criticalCount$,
    this.hasUnacknowledged$,
    this.clock$,
  ]).pipe(
    map(([connected, latency, isNight, alarmCount, criticalCount, hasUnacknowledged, clock]) => {
      const status = this.computeStatus(connected, latency);
      const total = Math.max(0, alarmCount);
      const critical = Math.max(0, criticalCount);
      const warning = Math.max(0, total - critical);

      const variant: StatusVariant = 
        status === 'online' ? 'success' : 
        status === 'degraded' ? 'warning' : 'danger';

      const connection: TopBarVm['connection'] = {
        status,
        variant,
      };
      if (latency !== undefined) {
        connection.latency = latency;
      }

      return {
        brand: {
          name: 'OMI',
          subtitle: 'MFD',
        },
        connection,
        clock,
        alarms: {
          total,
          critical,
          warning,
          hasUnacknowledged,
        },
        theme: isNight ? 'night' : 'day',
      } satisfies TopBarVm;
    })
  );

  statusLabel(status: ConnectionStatus): string {
    switch (status) {
      case 'online':
        return 'ONLINE';
      case 'degraded':
        return 'DEGRADED';
      default:
        return 'OFFLINE';
    }
  }

  alarmAriaLabel(alarms: TopBarVm['alarms']): string {
    if (alarms.total === 0) {
      return 'No active alarms';
    }
    return `${alarms.total} active alarms`;
  }

  themeLabel(theme: TopBarVm['theme']): string {
    return theme === 'night' ? 'Switch to day theme' : 'Switch to night theme';
  }

  private computeStatus(connected: boolean, latency?: number): ConnectionStatus {
    if (!connected) {
      return 'offline';
    }
    if (latency !== undefined && latency >= 2000) {
      return 'degraded';
    }
    return 'online';
  }

  private buildClock(): TopBarVm['clock'] {
    const iso = new Date().toISOString();
    return {
      time: iso.substring(11, 19),
      timezone: 'UTC',
      date: iso.substring(0, 10),
    };
  }

  private sanitizeCount(value: number | null | undefined): number {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }
}
