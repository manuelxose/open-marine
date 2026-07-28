import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { DegreesPipe } from '../../../../shared/pipes/degrees.pipe';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';

@Component({
  selector: 'app-autopilot-console',
  standalone: true,
  imports: [CommonModule, DegreesPipe, TranslatePipe],
  template: `
    <div class="ap-console-wrapper">
      <div class="disconnected-overlay" *ngIf="!(facade.isConnected$ | async)">
        <span class="icon">⚠️</span>
        <span class="text">{{ 'autopilot.disconnected' | translate }}</span>
      </div>

      <div
        class="ap-console"
        *ngIf="facade.state$ | async as state"
        [class.disabled]="!(facade.isConnected$ | async)"
      >
        <!-- Status Badge + Engage Button -->
        <div class="ap-header">
          <div class="ap-status" [class.engaged]="state !== 'standby'">
            <div class="status-indicator"></div>
            <div class="status-text">
              <span class="label">{{ 'autopilot.console.status' | translate }}</span>
              <span class="value">{{ stateLabelKey(state) | translate }}</span>
            </div>
          </div>
          <button
            class="engage-btn"
            [class.engage-btn--engaged]="state !== 'standby' && state !== 'fault'"
            [class.engage-btn--fault]="state === 'fault'"
            (click)="onEngageToggle(state)"
            [attr.aria-label]="engageLabelKey(state) | translate"
          >
            {{ engageLabelKey(state) | translate }}
          </button>
        </div>

        <!-- Panel-level ALERTS band (fault/hazard/no-go/off-course) lives on the
             autopilot page; the console keeps only control-local command feedback. -->
        <div class="ap-command-error" *ngIf="facade.commandError$ | async as commandError">
          {{ 'autopilot.command_rejected' | translate }} · {{ commandError }}
        </div>

        <!-- Target Display -->
        <div class="ap-display">
          <span class="ap-display__label">{{ 'autopilot.console.target' | translate }}</span>
          <div class="ap-display__value-row">
            <ng-container [ngSwitch]="state">
              <span *ngSwitchCase="'wind'" class="ap-display__value gb-display-value--xl">
                {{ facade.targetWindAngle$ | async | degrees }}
              </span>
              <span *ngSwitchDefault class="ap-display__value gb-display-value--xl">
                {{ facade.targetHeadingTrue$ | async | degrees }}
              </span>
            </ng-container>
            <span class="ap-display__unit gb-display-unit">{{
              state === 'wind' ? '°AWA' : '°T'
            }}</span>
          </div>
        </div>

        <!-- Dodge Buttons (±1° / ±10°) -->
        <div class="ap-dodge" *ngIf="state === 'auto' || state === 'wind'">
          <button
            class="dodge-btn dodge-btn--port-big"
            (click)="facade.adjustTarget(-10)"
            aria-label="-10°"
          >
            ◀◀ 10°
          </button>
          <button
            class="dodge-btn dodge-btn--port-small"
            (click)="facade.adjustTarget(-1)"
            aria-label="-1°"
          >
            ◀ 1°
          </button>
          <button
            class="dodge-btn dodge-btn--stbd-small"
            (click)="facade.adjustTarget(1)"
            aria-label="+1°"
          >
            1° ▶
          </button>
          <button
            class="dodge-btn dodge-btn--stbd-big"
            (click)="facade.adjustTarget(10)"
            aria-label="+10°"
          >
            10° ▶▶
          </button>
        </div>

        <!-- Mode Selector -->
        <div class="ap-modes" role="tablist">
          <button
            role="tab"
            class="mode-btn"
            [class.active]="state === 'auto'"
            [attr.aria-selected]="state === 'auto'"
            (click)="facade.engageAuto()"
          >
            {{ 'autopilot.console.modes.auto' | translate }}
          </button>
          <button
            role="tab"
            class="mode-btn"
            [class.active]="state === 'wind'"
            [attr.aria-selected]="state === 'wind'"
            (click)="facade.engageWind()"
          >
            {{ 'autopilot.console.modes.wind' | translate }}
          </button>
          <button
            role="tab"
            class="mode-btn"
            [class.active]="state === 'route'"
            [attr.aria-selected]="state === 'route'"
            (click)="facade.engageRoute()"
          >
            {{ 'autopilot.console.modes.route' | translate }}
          </button>
        </div>

        <!-- Rudder Indicator -->
        <div class="ap-rudder">
          <span class="rudder-label">{{ 'autopilot.console.rudder' | translate }}</span>
          <div class="rudder-track">
            <div class="rudder-center"></div>
            <div
              class="rudder-indicator"
              [style.transform]="'translateX(' + rudderAngle * 2 + 'px)'"
            ></div>
          </div>
          <span class="rudder-value gb-display-value--sm"
            >{{ rudderAngle | number: '1.0-1' }}°</span
          >
        </div>

        <!-- Route leg indicator (TRACK mode) -->
        <div
          class="ap-route-leg"
          *ngIf="state === 'route' && (facade.routeLength$ | async) as rLen"
        >
          <ng-container *ngIf="facade.routeComplete$ | async; else legProgress">
            <span class="ap-route-leg__complete">{{ 'autopilot.console.route_complete' | translate }}</span>
          </ng-container>
          <ng-template #legProgress>
            <span class="ap-route-leg__label">{{ 'autopilot.console.leg' | translate }}</span>
            <span class="ap-route-leg__value">{{ facade.routeActiveLeg$ | async }}/{{ rLen }}</span>
          </ng-template>
        </div>
      </div>
      <!-- Close ap-console -->
    </div>
    <!-- Close ap-console-wrapper -->
  `,
  styles: [
    `
      .ap-console-wrapper {
        position: relative;
        height: 100%;
        overflow: hidden;
        border-radius: 12px;
      }
      .disconnected-overlay {
        position: absolute;
        inset: 0;
        background: var(--overlay-backdrop);
        backdrop-filter: blur(4px);
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--warn);
        font-weight: bold;
        gap: 1rem;
        text-align: center;
      }
      .disconnected-overlay .icon {
        font-size: 3rem;
      }
      .ap-console {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.25rem;
        background: var(--gb-bg-bezel);
        border-radius: 12px;
        height: 100%;
        transition: filter 0.3s;
      }
      .ap-console.disabled {
        pointer-events: none;
        filter: grayscale(0.8) opacity(0.5);
      }
      .ap-command-error {
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--gb-alarm-warning-border);
        border-radius: var(--radius-md);
        background: var(--gb-alarm-warning-bg);
        color: var(--gb-data-warn);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      /* Header */
      .ap-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .ap-status {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 1rem;
        background: var(--gb-bg-panel);
        border-radius: 8px;
        border-left: 4px solid var(--gb-text-muted);
        flex: 1;
      }
      .ap-status.engaged {
        border-left-color: var(--gb-data-good);
        background: var(--gb-arc-normal);
      }
      .status-text {
        display: flex;
        flex-direction: column;
      }
      .status-text .label {
        font-size: 0.65rem;
        color: var(--gb-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .status-text .value {
        font-weight: bold;
        font-size: 1.1rem;
        color: var(--gb-text-value);
      }

      .engage-btn {
        padding: 0.6rem 1.25rem;
        border: 2px solid var(--gb-text-muted);
        border-radius: 8px;
        background: transparent;
        color: var(--gb-text-value);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .engage-btn:hover {
        border-color: var(--gb-needle-secondary);
        color: var(--gb-needle-secondary);
      }
      .engage-btn--engaged {
        border-color: var(--gb-data-stale);
        color: var(--gb-data-stale);
        background: var(--gb-alarm-emergency-bg);
      }
      .engage-btn--fault {
        border-color: var(--gb-data-warn);
        color: var(--gb-bg-canvas);
        background: var(--gb-data-warn);
      }

      /* Target display */
      .ap-display {
        text-align: center;
        padding: 0.75rem 0;
      }
      .ap-display__label {
        font-size: 0.65rem;
        color: var(--gb-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        display: block;
        margin-bottom: 0.25rem;
      }
      .ap-display__value-row {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 0.35rem;
      }
      .ap-display__value {
        font-size: 3rem;
        font-family: var(--font-mono, monospace);
        font-weight: bold;
        line-height: 1;
      }
      .ap-display__unit {
        font-size: 0.85rem;
        color: var(--gb-text-muted);
      }

      /* Dodge buttons */
      .ap-dodge {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.35rem;
      }
      .dodge-btn {
        background: var(--gb-bg-panel);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-value);
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        font-size: 0.8rem;
        padding: 0.7rem 0.25rem;
        border-radius: 8px;
        cursor: pointer;
        touch-action: manipulation;
        min-height: 44px;
        transition: all 0.15s;
      }
      .dodge-btn:active {
        background: var(--gb-tick-reference);
        color: var(--gb-bg-canvas);
        transform: scale(0.95);
      }
      .dodge-btn--port-big,
      .dodge-btn--port-small {
        color: var(--gb-data-stale);
      }
      .dodge-btn--stbd-small,
      .dodge-btn--stbd-big {
        color: var(--gb-data-good);
      }

      /* Mode selector */
      .ap-modes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.35rem;
        background: var(--gb-bg-panel);
        padding: 0.25rem;
        border-radius: 8px;
      }
      .mode-btn {
        background: transparent;
        border: none;
        color: var(--gb-text-muted);
        padding: 0.65rem 0.5rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 44px;
      }
      .mode-btn:hover {
        background: var(--gb-bg-glass-active);
        color: var(--gb-text-value);
      }
      .mode-btn.active {
        background: var(--gb-tick-reference);
        color: var(--gb-bg-canvas);
        box-shadow: 0 2px 4px color-mix(in srgb, var(--gb-bg-canvas) 25%, transparent);
      }

      /* Rudder indicator */
      .ap-rudder {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 1rem;
        background: var(--gb-bg-panel);
        border-radius: 8px;
      }
      .rudder-label {
        font-size: 0.65rem;
        color: var(--gb-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        flex-shrink: 0;
      }
      .rudder-track {
        flex: 1;
        height: 4px;
        background: var(--gb-bg-glass);
        border-radius: 2px;
        position: relative;
      }
      .rudder-center {
        position: absolute;
        left: 50%;
        top: -3px;
        width: 2px;
        height: 10px;
        background: var(--gb-text-muted);
        transform: translateX(-50%);
      }
      .rudder-indicator {
        position: absolute;
        left: calc(50% - 5px);
        top: -3px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--gb-tick-reference);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .rudder-value {
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        min-width: 3ch;
        text-align: right;
      }

      /* Route leg progress */
      .ap-route-leg {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--gb-bg-panel);
        border-radius: 8px;
        border-left: 3px solid var(--gb-data-good);
      }
      .ap-route-leg__label {
        font-size: 0.65rem;
        color: var(--gb-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .ap-route-leg__value {
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        font-size: 1rem;
        color: var(--gb-text-value);
      }
      .ap-route-leg__complete {
        font-weight: 800;
        font-size: 0.8rem;
        color: var(--gb-data-good);
        letter-spacing: 0.04em;
      }

      /* ── Responsive ────────────────────────────────────────────────────── */
      /* Mobile < 400px: even more compact */
      @media (max-width: 399px) {
        .ap-console {
          gap: 0.65rem;
          padding: 0.75rem;
        }
        .ap-header {
          flex-direction: column;
          gap: 0.5rem;
        }
        .engage-btn {
          width: 100%;
          min-height: 48px;
          font-size: 0.9rem;
        }
        .ap-display__value {
          font-size: 2.2rem;
        }
        .ap-display__label {
          font-size: 0.6rem;
        }
        .dodge-btn {
          font-size: 0.72rem;
          padding: 0.55rem 0.15rem;
          min-height: 40px;
        }
        .mode-btn {
          font-size: 0.72rem;
          padding: 0.55rem 0.3rem;
        }
        .ap-rudder {
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
        }
        .ap-command-error {
          font-size: 0.65rem;
          padding: var(--space-2);
        }
      }

      /* Tablet 640px+: restore comfortable spacing */
      @media (min-width: 640px) {
        .ap-console {
          gap: 1rem;
          padding: 1.25rem;
        }
        .ap-display__value {
          font-size: 3rem;
        }
        .dodge-btn {
          font-size: 0.8rem;
          padding: 0.7rem 0.25rem;
        }
      }

      /* Desktop 1024px+: full size */
      @media (min-width: 1024px) {
        .ap-console {
          gap: 1rem;
          padding: 1.25rem;
        }
      }
    `,
  ],
})
export class AutopilotConsoleComponent implements OnInit, OnDestroy {
  public facade = inject(AutopilotFacadeService);
  private readonly store = inject(DatapointStoreService);

  rudderAngle = 0;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    // Observe rudder angle (radians → degrees) for the rudder indicator.
    this.subs.push(
      this.store.observe<number>(PATHS.steering.rudderAngle).subscribe({
        next: (dp) => {
          if (dp?.value != null && typeof dp.value === 'number') {
            this.rudderAngle = dp.value * (180 / Math.PI);
          }
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /** i18n key for the engage/disengage/clear-fault button label. */
  engageLabelKey(state: string): string {
    if (state === 'fault') {
      return 'autopilot.fault.clear';
    }
    return state !== 'standby' ? 'autopilot.console.disengage' : 'autopilot.console.engage';
  }

  /** i18n key for the status chip reflecting the engine state. */
  stateLabelKey(state: string): string {
    const map: Record<string, string> = {
      standby: 'autopilot.state.standby',
      auto: 'autopilot.state.auto',
      wind: 'autopilot.state.wind',
      route: 'autopilot.state.track',
      fault: 'autopilot.state.fault',
    };
    return map[state] ?? 'autopilot.state.standby';
  }

  onEngageToggle(state: string): void {
    if (state === 'fault') {
      this.facade.clearFault();
    } else if (state !== 'standby') {
      this.facade.standby();
    } else {
      this.facade.engageAuto();
    }
  }
}
