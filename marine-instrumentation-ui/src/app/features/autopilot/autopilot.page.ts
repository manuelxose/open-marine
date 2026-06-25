import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { AutopilotConsoleComponent } from './components/autopilot-console/autopilot-console.component';
import { AutopilotCompassComponent } from './components/autopilot-compass/autopilot-compass.component';
import { AutopilotFacadeService } from './autopilot.facade';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { DegreesPipe } from '../../shared/pipes/degrees.pipe';

/**
 * Enterprise autopilot console: the interactive control (engage/mode/dodge/
 * rudder) alongside a live telemetry grid (heading actual vs target, rudder
 * demand, drive current, battery, apparent wind) and a prominent fault strip.
 */
@Component({
  selector: 'app-autopilot-page',
  standalone: true,
  imports: [CommonModule, AutopilotConsoleComponent, AutopilotCompassComponent, DegreesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ap-page">
      <header class="ap-page__header">
        <div class="ap-page__title">
          <h1>Autopilot</h1>
          <span class="ap-page__subtitle">Sailing pilot · heading · wind · track</span>
        </div>
        <div class="ap-page__status">
          <span class="conn-chip" [class.conn-chip--ok]="facade.isConnected$ | async">
            <span class="conn-dot"></span>
            {{ (facade.isConnected$ | async) ? 'ENGINE ONLINE' : 'ENGINE OFFLINE' }}
          </span>
          <span class="state-chip"
                [attr.data-state]="(facade.state$ | async)">
            {{ stateLabel(facade.state$ | async) }}
          </span>
        </div>
      </header>

      <!-- Fault strip -->
      <div class="ap-page__fault" *ngIf="(facade.state$ | async) === 'fault'">
        <span class="ap-page__fault-icon">⛔</span>
        <div class="ap-page__fault-text">
          <strong>AUTOPILOT FAULT · MOTOR OFF</strong>
          <span>{{ (facade.fault$ | async) | uppercase }}</span>
        </div>
        <button class="ap-page__fault-btn" (click)="facade.clearFault()">CLEAR FAULT</button>
      </div>

      <div class="ap-page__grid">
        <!-- Control console -->
        <section class="ap-page__console">
          <app-autopilot-console></app-autopilot-console>
        </section>

        <!-- Heading dial + telemetry -->
        <section class="ap-page__side">
        <div class="ap-page__dial">
          <app-autopilot-compass></app-autopilot-compass>
        </div>

        <div class="ap-page__tele">
          <div class="tile tile--wide">
            <span class="tile__k">HEADING</span>
            <div class="tile__row">
              <div class="tile__pair">
                <span class="tile__sub">ACTUAL</span>
                <span class="tile__v">{{ (headingTrue$ | async) | degrees }}<i>°T</i></span>
              </div>
              <div class="tile__pair">
                <span class="tile__sub">TARGET</span>
                <span class="tile__v tile__v--accent">{{ (facade.targetHeadingTrue$ | async) | degrees }}<i>°T</i></span>
              </div>
            </div>
          </div>

          <div class="tile">
            <span class="tile__k">RUDDER CMD</span>
            <span class="tile__v">{{ (facade.targetRudderAngle$ | async) | degrees:1 }}<i>°</i></span>
          </div>

          <div class="tile">
            <span class="tile__k">APP. WIND</span>
            <span class="tile__v">{{ (awa$ | async) | degrees }}<i>°A</i></span>
          </div>

          <div class="tile">
            <span class="tile__k">MOTOR</span>
            <span class="tile__v">{{ current(facade.motorCurrent$ | async) }}<i>A</i></span>
          </div>

          <div class="tile">
            <span class="tile__k">BATTERY</span>
            <span class="tile__v" [class.tile__v--warn]="isLowBattery(facade.batteryVoltage$ | async)">
              {{ voltage(facade.batteryVoltage$ | async) }}<i>V</i>
            </span>
          </div>

          <!-- Cross-track / waypoint (TRACK mode) -->
          <div class="tile tile--wide" *ngIf="(facade.state$ | async) === 'route'">
            <span class="tile__k">TRACK</span>
            <div class="tile__row">
              <div class="tile__pair">
                <span class="tile__sub">XTE</span>
                <span class="tile__v">{{ xte(xte$ | async) }}<i>m</i></span>
              </div>
              <div class="tile__pair">
                <span class="tile__sub">WAYPOINT BRG</span>
                <span class="tile__v">{{ (bearing$ | async) | degrees }}<i>°T</i></span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .ap-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-4);
      overflow: auto;
    }

    /* Header */
    .ap-page__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .ap-page__title h1 { margin: 0; font-size: 1.5rem; color: var(--gb-text-value); }
    .ap-page__subtitle { font-size: 0.75rem; color: var(--gb-text-muted); letter-spacing: 0.04em; }
    .ap-page__status { display: flex; align-items: center; gap: var(--space-2); }

    .conn-chip {
      display: inline-flex; align-items: center; gap: var(--space-2);
      padding: var(--space-1) var(--space-3); border-radius: var(--radius-full);
      background: var(--gb-bg-panel); border: 1px solid var(--gb-border-panel);
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
      color: var(--gb-text-muted);
    }
    .conn-dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--gb-connection-lost); }
    .conn-chip--ok { color: var(--gb-text-value); }
    .conn-chip--ok .conn-dot { background: var(--gb-connection-active); box-shadow: 0 0 8px var(--gb-connection-active); }

    .state-chip {
      padding: var(--space-1) var(--space-4); border-radius: var(--radius-full);
      font-weight: 800; letter-spacing: 0.08em; font-size: 0.72rem;
      background: var(--gb-bg-panel); border: 1px solid var(--gb-border-panel); color: var(--gb-text-muted);
    }
    .state-chip[data-state="auto"], .state-chip[data-state="wind"], .state-chip[data-state="route"] {
      background: var(--gb-arc-normal); border-color: var(--gb-data-good); color: var(--gb-data-good);
    }
    .state-chip[data-state="fault"] {
      background: var(--gb-alarm-emergency-bg); border-color: var(--gb-alarm-emergency-border); color: var(--gb-data-stale);
    }

    /* Fault strip */
    .ap-page__fault {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg);
      background: var(--gb-alarm-emergency-bg); border: 1px solid var(--gb-alarm-emergency-border);
      animation: ap-pulse 1.5s infinite;
    }
    .ap-page__fault-icon { font-size: 1.8rem; }
    .ap-page__fault-text { display: flex; flex-direction: column; }
    .ap-page__fault-text strong { color: var(--gb-data-stale); letter-spacing: 0.04em; }
    .ap-page__fault-text span { font-family: var(--font-mono, monospace); font-size: 0.8rem; color: var(--gb-text-value); text-transform: uppercase; }
    .ap-page__fault-btn {
      margin-left: auto; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor: pointer;
      border: none; background: var(--gb-data-warn); color: var(--gb-bg-canvas); font-weight: 800; letter-spacing: 0.04em;
    }
    @keyframes ap-pulse { 50% { opacity: 0.75; } }

    /* Grid */
    .ap-page__grid {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(320px, 460px) 1fr;
      gap: var(--space-4);
      align-items: start;
    }
    .ap-page__console { aspect-ratio: 4/5; min-height: 0; }

    .ap-page__tele {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
      align-content: start;
    }

    .tile {
      display: flex; flex-direction: column; gap: var(--space-1);
      padding: var(--space-4); border-radius: var(--radius-lg);
      background: var(--gb-bg-panel); border: 1px solid var(--gb-border-panel);
    }
    .tile--wide { grid-column: 1 / -1; }
    .tile__k { font-size: 0.66rem; color: var(--gb-text-muted); letter-spacing: 0.1em; }
    .tile__row { display: flex; gap: var(--space-4); }
    .tile__pair { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; }
    .tile__sub { font-size: 0.6rem; color: var(--gb-text-muted); letter-spacing: 0.08em; }
    .tile__v {
      font-family: var(--font-mono, monospace); font-weight: 800;
      font-size: 1.9rem; line-height: 1; color: var(--gb-text-value);
    }
    .tile__v i { font-size: 0.75rem; color: var(--gb-text-unit); font-style: normal; margin-left: 2px; }
    .tile__v--accent { color: var(--gb-data-good); }
    .tile__v--warn { color: var(--gb-data-stale); }

    @media (max-width: 880px) {
      .ap-page__grid { grid-template-columns: 1fr; }
      .ap-page__console { aspect-ratio: auto; max-width: 460px; }
    }
  `],
})
export class AutopilotPage {
  public facade = inject(AutopilotFacadeService);
  private readonly store = inject(DatapointStoreService);

  // Resolve paths defensively (optional-chaining + string fallback) so a stale
  // contract build at runtime cannot crash construction — matches the pattern in
  // AutopilotStoreService.
  private readonly paths = {
    headingTrue: PATHS.navigation?.headingTrue ?? 'navigation.headingTrue',
    awa: PATHS.environment?.wind?.angleApparent ?? 'environment.wind.angleApparent',
    xte:
      PATHS.navigation?.courseGreatCircle?.crossTrackError ??
      'navigation.courseGreatCircle.crossTrackError',
    waypointBearing:
      PATHS.navigation?.courseGreatCircle?.nextPoint?.bearingTrue ??
      'navigation.courseGreatCircle.nextPoint.bearingTrue',
  } as const;

  readonly headingTrue$ = this.store
    .observe<number>(this.paths.headingTrue)
    .pipe(map((dp) => dp?.value));
  readonly awa$ = this.store.observe<number>(this.paths.awa).pipe(map((dp) => dp?.value));
  readonly xte$ = this.store.observe<number>(this.paths.xte).pipe(map((dp) => dp?.value));
  readonly bearing$ = this.store
    .observe<number>(this.paths.waypointBearing)
    .pipe(map((dp) => dp?.value));

  stateLabel(state: string | null): string {
    const map: Record<string, string> = {
      standby: 'STANDBY', auto: 'AUTO', wind: 'WIND', route: 'TRACK', fault: 'FAULT',
    };
    return state ? map[state] ?? state.toUpperCase() : 'STANDBY';
  }

  current(value: number | null | undefined): string {
    return value === null || value === undefined ? '--' : value.toFixed(1);
  }

  voltage(value: number | null | undefined): string {
    return value === null || value === undefined ? '--' : value.toFixed(1);
  }

  xte(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '--';
    }
    // Sign convention: positive = boat starboard of track → steer to port (P/S label).
    const side = value > 0 ? 'S' : value < 0 ? 'P' : '';
    return `${side}${Math.abs(value).toFixed(0)}`;
  }

  isLowBattery(value: number | null | undefined): boolean {
    return value !== null && value !== undefined && value < 11.8;
  }
}
