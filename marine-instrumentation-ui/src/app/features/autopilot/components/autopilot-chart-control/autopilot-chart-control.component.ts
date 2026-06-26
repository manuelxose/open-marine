import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { AutopilotState } from '../../../../state/autopilot/autopilot-store.service';
import { DegreesPipe } from '../../../../shared/pipes/degrees.pipe';

/**
 * Compact, collapsible autopilot control for the chart overlay. Collapsed it is
 * a status pill (state + target); expanded it exposes engage/disengage, mode,
 * dodge, a rudder bar and quick telemetry. Reuses AutopilotFacadeService so it
 * stays in sync with the full autopilot page.
 */
@Component({
  selector: 'app-autopilot-chart-control',
  standalone: true,
  imports: [CommonModule, DegreesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="apc" [class.apc--engaged]="isEngaged()" [class.apc--fault]="isFault()"
         [class.apc--expanded]="expanded()">

      <!-- Collapsed pill / header -->
      <button class="apc__pill" (click)="expanded.set(!expanded())"
              [attr.aria-expanded]="expanded()" aria-label="Toggle autopilot control">
        <span class="apc__dot"></span>
        <span class="apc__state">{{ stateLabel() }}</span>
        <span class="apc__target" *ngIf="isEngaged()">
          {{ targetValue() | degrees }}<span class="apc__unit">{{ targetUnit() }}</span>
        </span>
        <span class="apc__chev">{{ expanded() ? '▾' : '▸' }}</span>
      </button>

      <div class="apc__body" *ngIf="expanded()">

        <div class="apc__fault" *ngIf="isFault()">
          ⛔ {{ fault() | uppercase }}
        </div>

        <!-- Primary action -->
        <button class="apc__engage"
                [class.apc__engage--on]="isEngaged()"
                [class.apc__engage--fault]="isFault()"
                (click)="onPrimary()">
          {{ primaryLabel() }}
        </button>

        <!-- Mode tabs -->
        <div class="apc__modes" role="tablist" *ngIf="!isFault()">
          <button role="tab" [class.active]="state() === 'auto'" (click)="facade.engageAuto()">AUTO</button>
          <button role="tab" [class.active]="state() === 'wind'" (click)="facade.engageWind()">WIND</button>
          <button role="tab" [class.active]="state() === 'route'" (click)="facade.engageTrack()">TRACK</button>
        </div>

        <!-- Dodge -->
        <div class="apc__dodge" *ngIf="state() === 'auto' || state() === 'wind'">
          <button (click)="facade.adjustTarget(-10)">⟲ 10</button>
          <button (click)="facade.adjustTarget(-1)">⟲ 1</button>
          <button (click)="facade.adjustTarget(1)">1 ⟳</button>
          <button (click)="facade.adjustTarget(10)">10 ⟳</button>
        </div>

        <!-- Rudder bar -->
        <div class="apc__rudder" *ngIf="isEngaged()">
          <span class="apc__rlabel">RUD</span>
          <div class="apc__rtrack">
            <div class="apc__rcenter"></div>
            <div class="apc__rfill" [style.left.%]="rudderFillLeft()" [style.width.%]="rudderFillWidth()"></div>
          </div>
          <span class="apc__rval">{{ rudderActualDeg() !== null ? (rudderActualDeg() | number:'1.0-0') : '--' }}°</span>
        </div>

        <!-- Route leg (TRACK) -->
        <div class="apc__leg" *ngIf="state() === 'route' && routeLen()">
          <ng-container *ngIf="routeComplete(); else legChip">
            <span class="apc__leg-done">ROUTE COMPLETE</span>
          </ng-container>
          <ng-template #legChip>
            <span class="apc__leg-k">LEG</span>
            <span class="apc__leg-v">{{ routeLeg() }}/{{ routeLen() }}</span>
          </ng-template>
        </div>

        <!-- Telemetry -->
        <div class="apc__tele">
          <div class="apc__cell">
            <span class="k">AMP</span>
            <span class="v">{{ current() !== undefined ? (current() | number:'1.1-1') : '--' }}</span>
          </div>
          <div class="apc__cell">
            <span class="k">VOLT</span>
            <span class="v" [class.warn]="lowBattery()">{{ voltage() !== undefined ? (voltage() | number:'1.1-1') : '--' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .apc {
      width: 230px;
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
      font-family: var(--font-mono, monospace);
    }
    .apc--engaged { border-color: var(--gb-border-active); }
    .apc--fault { border-color: var(--gb-data-stale); }

    .apc__pill {
      display: flex; align-items: center; gap: var(--space-2);
      width: 100%; padding: var(--space-2) var(--space-3);
      background: transparent; border: none; cursor: pointer;
      color: var(--gb-text-value);
    }
    .apc__dot {
      width: 9px; height: 9px; border-radius: var(--radius-full);
      background: var(--gb-text-muted); flex-shrink: 0;
    }
    .apc--engaged .apc__dot { background: var(--gb-data-good); box-shadow: 0 0 8px var(--gb-data-good); }
    .apc--fault .apc__dot { background: var(--gb-data-stale); animation: apc-blink 1s infinite; }
    @keyframes apc-blink { 50% { opacity: 0.3; } }

    .apc__state { font-weight: 800; letter-spacing: 0.06em; font-size: 0.8rem; }
    .apc__target { margin-left: auto; font-weight: 700; font-size: 1rem; }
    .apc__unit { font-size: 0.65rem; color: var(--gb-text-unit); margin-left: 1px; }
    .apc__chev { margin-left: auto; color: var(--gb-text-muted); font-size: 0.7rem; }
    .apc__target + .apc__chev { margin-left: var(--space-2); }

    .apc__body { padding: 0 var(--space-3) var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }

    .apc__fault {
      background: var(--gb-alarm-emergency-bg); border: 1px solid var(--gb-alarm-emergency-border);
      color: var(--gb-data-stale); border-radius: var(--radius-md);
      padding: var(--space-2); font-weight: 800; font-size: 0.72rem; text-align: center;
    }

    .apc__engage {
      padding: var(--space-2); border-radius: var(--radius-md); cursor: pointer; min-height: 40px;
      border: var(--border-width-2) solid var(--gb-border-active); background: transparent;
      color: var(--gb-text-value); font-weight: 800; letter-spacing: 0.05em; font-size: 0.8rem;
      transition: all var(--duration-fast, 0.15s);
    }
    .apc__engage--on { border-color: var(--gb-data-stale); color: var(--gb-data-stale); background: var(--gb-alarm-emergency-bg); }
    .apc__engage--fault { border-color: var(--gb-data-warn); background: var(--gb-data-warn); color: var(--gb-bg-canvas); }

    .apc__modes { display: grid; grid-template-columns: repeat(3,1fr); gap: var(--space-1); }
    .apc__modes button {
      padding: var(--space-2) var(--space-1); border-radius: var(--radius-sm); border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-glass); color: var(--gb-text-muted); font-weight: 700;
      font-size: 0.72rem; cursor: pointer; min-height: 38px;
    }
    .apc__modes button.active { background: var(--gb-tick-reference); color: var(--gb-bg-canvas); border-color: transparent; }

    .apc__dodge { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--space-1); }
    .apc__dodge button {
      padding: var(--space-2) 0; border-radius: var(--radius-sm); border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-glass); color: var(--gb-text-value); font-weight: 700;
      font-size: 0.72rem; cursor: pointer; min-height: 38px; touch-action: manipulation;
    }
    .apc__dodge button:active { background: var(--gb-tick-reference); color: var(--gb-bg-canvas); }

    .apc__rudder { display: flex; align-items: center; gap: var(--space-2); }
    .apc__rlabel, .apc__rval { font-size: 0.65rem; color: var(--gb-text-muted); }
    .apc__rval { margin-left: auto; color: var(--gb-text-value); font-weight: 700; min-width: 3ch; text-align: right; }
    .apc__rtrack { position: relative; flex: 1; height: 6px; background: var(--gb-bg-glass); border-radius: var(--radius-full); }
    .apc__rcenter { position: absolute; left: 50%; top: -2px; width: 1px; height: 10px; background: var(--gb-text-muted); }
    .apc__rfill { position: absolute; top: 0; height: 6px; border-radius: var(--radius-full); background: var(--gb-needle-secondary); transition: all 0.3s; }

    .apc__tele { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1); }
    .apc__cell {
      display: flex; flex-direction: column; align-items: center; gap: 1px;
      padding: var(--space-2); background: var(--gb-bg-glass); border-radius: var(--radius-sm);
    }
    .apc__cell .k { font-size: 0.6rem; color: var(--gb-text-muted); letter-spacing: 0.08em; }
    .apc__cell .v { font-size: 0.95rem; font-weight: 700; color: var(--gb-text-value); }
    .apc__cell .v.warn { color: var(--gb-data-stale); }

    .apc__leg {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-1) var(--space-2);
      background: var(--gb-bg-glass); border-radius: var(--radius-sm);
      border-left: 2px solid var(--gb-data-good);
    }
    .apc__leg-k { font-size: 0.6rem; color: var(--gb-text-muted); letter-spacing: 0.08em; }
    .apc__leg-v { font-weight: 800; font-size: 0.85rem; color: var(--gb-text-value); }
    .apc__leg-done { font-weight: 800; font-size: 0.72rem; color: var(--gb-data-good); letter-spacing: 0.04em; }
  `],
})
export class AutopilotChartControlComponent {
  public facade = inject(AutopilotFacadeService);

  readonly expanded = signal(false);

  readonly state = toSignal(this.facade.state$, { initialValue: 'standby' as AutopilotState });
  readonly fault = toSignal(this.facade.fault$, { initialValue: 'none' });
  private readonly targetHeading = toSignal(this.facade.targetHeadingTrue$, { initialValue: undefined });
  private readonly targetWind = toSignal(this.facade.targetWindAngle$, { initialValue: undefined });
  private readonly rudderActual = toSignal(this.facade.rudderAngle$, { initialValue: undefined });
  readonly current = toSignal(this.facade.motorCurrent$, { initialValue: undefined });
  readonly voltage = toSignal(this.facade.batteryVoltage$, { initialValue: undefined });
  readonly routeLeg = toSignal(this.facade.routeActiveLeg$, { initialValue: 0 });
  readonly routeLen = toSignal(this.facade.routeLength$, { initialValue: 0 });
  readonly routeComplete = toSignal(this.facade.routeComplete$, { initialValue: false });

  readonly isEngaged = computed(() => {
    const s = this.state();
    return s === 'auto' || s === 'wind' || s === 'route';
  });
  readonly isFault = computed(() => this.state() === 'fault');

  readonly stateLabel = computed(() => {
    const map: Record<AutopilotState, string> = {
      standby: 'STANDBY', auto: 'AUTO', wind: 'WIND', route: 'TRACK', fault: 'FAULT',
    };
    return map[this.state()];
  });

  readonly targetValue = computed(() => (this.state() === 'wind' ? this.targetWind() : this.targetHeading()));
  readonly targetUnit = computed(() => (this.state() === 'wind' ? '°A' : '°T'));

  readonly rudderActualDeg = computed(() => {
    const rad = this.rudderActual();
    return rad === undefined ? null : rad * (180 / Math.PI);
  });

  // Rudder bar: map [-45..45]° to [0..100]% with a centre origin.
  private readonly RUDDER_RANGE = 45;
  readonly rudderFillLeft = computed(() => {
    const deg = this.rudderActualDeg() ?? 0;
    const pct = (Math.max(-this.RUDDER_RANGE, Math.min(this.RUDDER_RANGE, deg)) / this.RUDDER_RANGE) * 50;
    return 50 + Math.min(0, pct);
  });
  readonly rudderFillWidth = computed(() => {
    const deg = this.rudderActualDeg() ?? 0;
    return Math.abs((Math.max(-this.RUDDER_RANGE, Math.min(this.RUDDER_RANGE, deg)) / this.RUDDER_RANGE) * 50);
  });

  readonly lowBattery = computed(() => {
    const v = this.voltage();
    return v !== undefined && v < 11.8;
  });

  readonly primaryLabel = computed(() => {
    if (this.isFault()) return 'CLEAR FAULT';
    return this.isEngaged() ? 'DISENGAGE' : 'ENGAGE';
  });

  onPrimary(): void {
    if (this.isFault()) {
      this.facade.clearFault();
    } else if (this.isEngaged()) {
      this.facade.standby();
    } else {
      this.facade.engageAuto();
    }
  }
}
