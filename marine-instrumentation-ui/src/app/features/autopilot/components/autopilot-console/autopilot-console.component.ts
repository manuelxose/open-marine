import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { DegreesPipe } from '../../../../shared/pipes/degrees.pipe';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';

@Component({
  selector: 'app-autopilot-console',
  standalone: true,
  imports: [CommonModule, DegreesPipe],
  template: `
    <div class="ap-console-wrapper">
      <div class="disconnected-overlay" *ngIf="!(facade.isConnected$ | async)">
          <span class="icon">⚠️</span>
          <span class="text">AUTOPILOT DISCONNECTED</span>
      </div>
      
      <div class="ap-console" *ngIf="facade.state$ | async as state" [class.disabled]="!(facade.isConnected$ | async)">

      <!-- Status Badge + Engage Button -->
      <div class="ap-header">
        <div class="ap-status" [class.engaged]="state !== 'standby'">
          <div class="status-indicator"></div>
          <div class="status-text">
            <span class="label">STATUS</span>
            <span class="value">{{ state | uppercase }}</span>
          </div>
        </div>
        <button
          class="engage-btn"
          [class.engage-btn--engaged]="state !== 'standby'"
          (click)="state !== 'standby' ? facade.standby() : facade.engageAuto()"
          [attr.aria-label]="state !== 'standby' ? 'Disengage autopilot' : 'Engage autopilot'"
        >
          {{ state !== 'standby' ? 'DISENGAGE' : 'ENGAGE' }}
        </button>
      </div>

      <!-- Target Display -->
      <div class="ap-display">
        <span class="ap-display__label">TARGET</span>
        <div class="ap-display__value-row">
          <ng-container [ngSwitch]="state">
            <span *ngSwitchCase="'wind'" class="ap-display__value gb-display-value--xl">
              {{ (facade.targetWindAngle$ | async) | degrees }}
            </span>
            <span *ngSwitchDefault class="ap-display__value gb-display-value--xl">
              {{ (facade.targetHeadingTrue$ | async) | degrees }}
            </span>
          </ng-container>
          <span class="ap-display__unit gb-display-unit">{{ state === 'wind' ? '°AWA' : '°T' }}</span>
        </div>
      </div>

      <!-- Dodge Buttons (±1° / ±10°) -->
      <div class="ap-dodge" *ngIf="state === 'auto' || state === 'wind'">
        <button class="dodge-btn dodge-btn--port-big" (click)="facade.adjustTarget(-10)" aria-label="-10°">
          ◀◀ 10°
        </button>
        <button class="dodge-btn dodge-btn--port-small" (click)="facade.adjustTarget(-1)" aria-label="-1°">
          ◀ 1°
        </button>
        <button class="dodge-btn dodge-btn--stbd-small" (click)="facade.adjustTarget(1)" aria-label="+1°">
          1° ▶
        </button>
        <button class="dodge-btn dodge-btn--stbd-big" (click)="facade.adjustTarget(10)" aria-label="+10°">
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
        >Auto</button>
        <button
          role="tab"
          class="mode-btn"
          [class.active]="state === 'wind'"
          [attr.aria-selected]="state === 'wind'"
          (click)="facade.engageWind()"
        >Wind</button>
        <button
          role="tab"
          class="mode-btn"
          [class.active]="state === 'route'"
          [attr.aria-selected]="state === 'route'"
          (click)="facade.engageRoute()"
        >Route</button>
      </div>

      <!-- Rudder Indicator -->
      <div class="ap-rudder">
        <span class="rudder-label">RUDDER</span>
        <div class="rudder-track">
          <div class="rudder-center"></div>
          <div
            class="rudder-indicator"
            [style.transform]="'translateX(' + (rudderAngle * 2) + 'px)'"
          ></div>
        </div>
        <span class="rudder-value gb-display-value--sm">{{ rudderAngle | number:'1.0-1' }}°</span>
      </div>

      <!-- Off-Course Warning -->
      <div class="ap-warning" *ngIf="isOffCourse">
        ⚠️ OFF COURSE
      </div>

      </div> <!-- Close ap-console -->
    </div> <!-- Close ap-console-wrapper -->
  `,
  styles: [`
    .ap-console-wrapper {
        position: relative;
        height: 100%;
        overflow: hidden;
        border-radius: 12px; 
    }
    .disconnected-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.75);
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
        border-left-color: var(--success, #2ec25c);
        background: rgba(46, 194, 92, 0.08);
    }
    .status-text { display: flex; flex-direction: column; }
    .status-text .label { font-size: 0.65rem; color: var(--gb-text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .status-text .value { font-weight: bold; font-size: 1.1rem; color: var(--gb-text-value); }

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
    .engage-btn:hover { border-color: var(--gb-needle-secondary); color: var(--gb-needle-secondary); }
    .engage-btn--engaged {
        border-color: var(--status-offline, #f06352);
        color: var(--status-offline, #f06352);
        background: rgba(240, 99, 82, 0.1);
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
        border: 1px solid var(--border);
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
        background: var(--accent, #5ba4cf);
        color: #fff;
        transform: scale(0.95);
    }
    .dodge-btn--port-big, .dodge-btn--port-small { color: #f06352; }
    .dodge-btn--stbd-small, .dodge-btn--stbd-big { color: #2ec25c; }

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
        background: rgba(255, 255, 255, 0.05);
        color: var(--gb-text-value);
    }
    .mode-btn.active {
        background: var(--accent, #5ba4cf);
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
        background: var(--surface-3, var(--border));
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
        background: var(--accent, #5ba4cf);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .rudder-value {
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        min-width: 3ch;
        text-align: right;
    }

    /* Off course warning */
    .ap-warning {
        padding: 0.65rem 1rem;
        background: rgba(240, 99, 82, 0.15);
        border: 1px solid rgba(240, 99, 82, 0.5);
        border-radius: 8px;
        color: var(--status-offline, #f06352);
        font-weight: 700;
        text-align: center;
        animation: pulse-alert 2s infinite;
    }

    @keyframes pulse-alert {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `]
})
export class AutopilotConsoleComponent implements OnInit, OnDestroy {
  public facade = inject(AutopilotFacadeService);
  private readonly store = inject(DatapointStoreService);

  rudderAngle = 0;
  isOffCourse = false;

  private subs: Subscription[] = [];
  private readonly OFF_COURSE_THRESHOLD = 10; // degrees

  ngOnInit(): void {
    // Observe rudder angle
    this.subs.push(
      this.store.observe<number>(PATHS.steering.rudderAngle).subscribe({
        next: (dp) => {
          if (dp?.value != null && typeof dp.value === 'number') {
            // Signal K rudder angle is in radians
            this.rudderAngle = dp.value * (180 / Math.PI);
            this.isOffCourse = Math.abs(this.rudderAngle) > this.OFF_COURSE_THRESHOLD;
          }
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
