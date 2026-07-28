import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { AutopilotConsoleComponent } from './components/autopilot-console/autopilot-console.component';
import { AutopilotCompassComponent } from './components/autopilot-compass/autopilot-compass.component';
import { AutopilotCalibrationComponent } from './components/autopilot-calibration/autopilot-calibration.component';
import { AutopilotManualComponent } from './components/autopilot-manual/autopilot-manual.component';
import { AutopilotDecisionLogComponent } from './components/autopilot-decision-log/autopilot-decision-log.component';
import { AutopilotFacadeService } from './autopilot.facade';
import { AutopilotDecisionLogService } from './autopilot-decision-log.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { DegreesPipe } from '../../shared/pipes/degrees.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

/** A panel-level alert surfaced in the ALERTS band. */
interface PanelAlert {
  severity: 'warn' | 'critical';
  icon: string;
  labelKey: string;
  reason?: string;
  action?: 'clearFault';
}

/**
 * Enterprise MFD autopilot control panel (Garmin / Raymarine / B&G glass-bridge
 * language): a status bar with E-STOP, a panel-level ALERTS band, a helm-control
 * cluster (heading dial + console), an instrument-tile telemetry cluster, a live
 * EVENT LOG and a collapsible reference legend. All copy is i18n (en/es). On
 * desktop it lays out as a cockpit that fits the viewport (only the event log
 * scrolls); it degrades to a scrolling page on short screens.
 */
@Component({
  selector: 'app-autopilot-page',
  standalone: true,
  imports: [
    CommonModule,
    AutopilotConsoleComponent,
    AutopilotCompassComponent,
    AutopilotCalibrationComponent,
    AutopilotManualComponent,
    AutopilotDecisionLogComponent,
    DegreesPipe,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="ap">
    <!-- ── Status bar ───────────────────────────────────────────────────── -->
    <header class="ap-bar">
      <div class="ap-bar__id">
        <span class="ap-bar__mark">◈</span>
        <div class="ap-bar__titles">
          <h1>{{ 'autopilot.title' | translate }}</h1>
          <span class="ap-bar__subtitle">{{ 'autopilot.subtitle' | translate }}</span>
        </div>
      </div>
      <div class="ap-bar__status">
        <span class="ap-bar__mode" [attr.data-state]="facade.state$ | async">
          {{ stateLabelKey(facade.state$ | async) | translate }}
        </span>
        <span class="conn-chip" [class.conn-chip--ok]="facade.isConnected$ | async">
          <span class="conn-dot"></span>
          {{
            (facade.isConnected$ | async)
              ? ('autopilot.engine.online' | translate)
              : ('autopilot.engine.offline' | translate)
          }}
        </span>
        <button
          class="ap-bar__btn"
          (click)="showManual.set(true)"
          [attr.aria-label]="'autopilot.manual' | translate"
          [attr.title]="'autopilot.manual' | translate"
        >
          📖
        </button>
        <button
          class="ap-bar__btn"
          (click)="showCalibration.set(true)"
          [attr.aria-label]="'autopilot.calibration' | translate"
          [attr.title]="'autopilot.calibration' | translate"
        >
          ⚙
        </button>
        <button
          class="ap-bar__estop"
          (click)="onEmergencyStop()"
          [attr.aria-label]="'autopilot.estop' | translate"
        >
          ⏻ {{ 'autopilot.estop' | translate }}
        </button>
      </div>
    </header>

    <!-- ── Follow-destination banner (explicit, safety-compliant engage) ──── -->
    <div class="ap-follow" *ngIf="pendingDestination$ | async">
      <span class="ap-follow__icon">📍</span>
      <div class="ap-follow__text">
        <strong>{{ 'autopilot.log.follow.banner' | translate }}</strong>
        <span>{{ 'autopilot.log.follow.hint' | translate }}</span>
      </div>
      <button class="ap-follow__btn" (click)="onFollow()">
        {{ 'autopilot.log.follow.action' | translate }}
      </button>
    </div>

    <!-- ── Alerts band ──────────────────────────────────────────────────── -->
    <div class="ap-alerts" *ngIf="alerts$ | async as alerts">
      <div class="ap-alert" *ngFor="let a of alerts" [attr.data-sev]="a.severity">
        <span class="ap-alert__icon">{{ a.icon }}</span>
        <span class="ap-alert__msg">
          {{ a.labelKey | translate }}<em *ngIf="a.reason"> · {{ a.reason | uppercase }}</em>
        </span>
        <button class="ap-alert__btn" *ngIf="a.action === 'clearFault'" (click)="facade.clearFault()">
          {{ 'autopilot.fault.clear' | translate }}
        </button>
      </div>
    </div>

    <!-- ── Cockpit ──────────────────────────────────────────────────────── -->
    <div class="ap-cockpit">
      <!-- Helm control cluster -->
      <section class="ap-panel ap-helm">
        <div class="ap-panel__hd">
          <span class="ap-panel__bar"></span>{{ 'autopilot.panels.helm' | translate }}
        </div>
        <div class="ap-helm__dial">
          <app-autopilot-compass></app-autopilot-compass>
        </div>
        <app-autopilot-console></app-autopilot-console>
      </section>

      <!-- Telemetry tile cluster -->
      <section class="ap-panel ap-data">
        <div class="ap-panel__hd">
          <span class="ap-panel__bar"></span>{{ 'autopilot.panels.telemetry' | translate }}
        </div>
        <div class="ap-tiles">
          <div class="tile tile--wide">
            <span class="tile__k">{{ 'autopilot.tele.heading' | translate }}</span>
            <div class="tile__row">
              <div class="tile__pair">
                <span class="tile__sub">{{ 'autopilot.tele.actual' | translate }}</span>
                <span class="tile__v">{{ headingTrue$ | async | degrees }}<i>°T</i></span>
              </div>
              <div class="tile__pair">
                <span class="tile__sub">{{ 'autopilot.tele.target' | translate }}</span>
                <span class="tile__v tile__v--accent"
                  >{{ facade.targetHeadingTrue$ | async | degrees }}<i>°T</i></span
                >
              </div>
            </div>
          </div>

          <div class="tile">
            <span class="tile__k">{{ 'autopilot.tele.rudder_cmd' | translate }}</span>
            <span class="tile__v">{{ facade.targetRudderAngle$ | async | degrees: 1 }}<i>°</i></span>
          </div>

          <div class="tile">
            <span class="tile__k">{{ 'autopilot.tele.app_wind' | translate }}</span>
            <span class="tile__v">{{ awa$ | async | degrees }}<i>°A</i></span>
          </div>

          <div class="tile">
            <span class="tile__k">{{ 'autopilot.tele.motor' | translate }}</span>
            <span class="tile__v">{{ current(facade.motorCurrent$ | async) }}<i>A</i></span>
          </div>

          <div class="tile">
            <span class="tile__k">{{ 'autopilot.tele.battery' | translate }}</span>
            <span class="tile__v" [class.tile__v--warn]="isLowBattery(facade.batteryVoltage$ | async)">
              {{ voltage(facade.batteryVoltage$ | async) }}<i>V</i>
            </span>
          </div>

          <!-- Cross-track / waypoint (TRACK mode) -->
          <div class="tile tile--wide" *ngIf="(facade.state$ | async) === 'route'">
            <span class="tile__k">{{ 'autopilot.tele.track' | translate }}</span>
            <div class="tile__row">
              <div class="tile__pair">
                <span class="tile__sub">{{ 'autopilot.tele.xte' | translate }}</span>
                <span class="tile__v">{{ xte(xte$ | async) }}<i>m</i></span>
              </div>
              <div class="tile__pair">
                <span class="tile__sub">{{ 'autopilot.tele.waypoint_brg' | translate }}</span>
                <span class="tile__v">{{ bearing$ | async | degrees }}<i>°T</i></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Event log -->
      <section class="ap-events">
        <app-autopilot-decision-log></app-autopilot-decision-log>
      </section>
    </div>

    <app-autopilot-calibration *ngIf="showCalibration()" (close)="showCalibration.set(false)" />

    <!-- ── Technical manual (full-screen overlay) ───────────────────────── -->
    <app-autopilot-manual *ngIf="showManual()" (close)="showManual.set(false)" />
  </div>`,
  styles: [
    `
      /* ── Root (mobile-first, single scroll container) ─────────────────── */
      .ap {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-3);
        overflow-y: auto;
        background: var(--gb-bg-canvas);
      }

      /* ── Status bar ───────────────────────────────────────────────────── */
      .ap-bar {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--gb-bg-bezel);
        border: 1px solid var(--gb-border-panel);
      }
      .ap-bar__id {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
      }
      .ap-bar__mark {
        font-size: 1.4rem;
        color: var(--gb-tick-reference);
        line-height: 1;
        flex-shrink: 0;
      }
      .ap-bar__titles {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .ap-bar__titles h1 {
        margin: 0;
        font-size: 1.15rem;
        line-height: 1.1;
        color: var(--gb-text-value);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .ap-bar__subtitle {
        font-size: 0.66rem;
        color: var(--gb-text-muted);
        letter-spacing: 0.04em;
      }
      .ap-bar__status {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ap-bar__mode {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-md);
        font-family: var(--font-mono, monospace);
        font-weight: 800;
        letter-spacing: 0.12em;
        font-size: 0.8rem;
        background: var(--gb-bg-panel);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-muted);
        white-space: nowrap;
      }
      .ap-bar__mode[data-state='auto'] {
        background: color-mix(in srgb, var(--ap-mode-auto) 16%, transparent);
        border-color: var(--ap-mode-auto);
        color: var(--ap-mode-auto);
      }
      .ap-bar__mode[data-state='wind'] {
        background: color-mix(in srgb, var(--ap-mode-wind) 16%, transparent);
        border-color: var(--ap-mode-wind);
        color: var(--ap-mode-wind);
      }
      .ap-bar__mode[data-state='route'] {
        background: color-mix(in srgb, var(--ap-mode-route) 16%, transparent);
        border-color: var(--ap-mode-route);
        color: var(--ap-mode-route);
      }
      .ap-bar__mode[data-state='fault'] {
        background: var(--gb-alarm-emergency-bg);
        border-color: var(--gb-alarm-emergency-border);
        color: var(--gb-data-stale);
      }

      .conn-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        background: var(--gb-bg-panel);
        border: 1px solid var(--gb-border-panel);
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--gb-text-muted);
        white-space: nowrap;
      }
      .conn-dot {
        width: 7px;
        height: 7px;
        border-radius: var(--radius-full);
        background: var(--gb-connection-lost);
        flex-shrink: 0;
      }
      .conn-chip--ok {
        color: var(--gb-text-value);
      }
      .conn-chip--ok .conn-dot {
        background: var(--gb-connection-active);
        box-shadow: 0 0 6px var(--gb-connection-active);
      }

      .ap-bar__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 40px;
        padding: 0 var(--space-2);
        border-radius: var(--radius-md);
        background: var(--gb-bg-glass);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-value);
        font-size: 1rem;
        cursor: pointer;
      }
      .ap-bar__btn:active {
        border-color: var(--gb-border-active);
        background: var(--gb-border-active);
      }
      .ap-bar__estop {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        min-height: 40px;
        padding: 0 var(--space-4);
        border-radius: var(--radius-md);
        background: var(--gb-alarm-emergency-bg);
        border: 1px solid var(--gb-alarm-emergency-border);
        color: var(--gb-data-stale);
        font-weight: 800;
        letter-spacing: 0.08em;
        font-size: 0.72rem;
        cursor: pointer;
        touch-action: manipulation;
      }
      .ap-bar__estop:active {
        background: var(--gb-data-stale);
        color: var(--gb-bg-canvas);
      }

      /* ── Follow-destination banner ────────────────────────────────────── */
      .ap-follow {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--gb-alarm-info-bg);
        border: 1px solid var(--gb-alarm-info-border);
      }
      .ap-follow__icon {
        font-size: 1.4rem;
        line-height: 1;
      }
      .ap-follow__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .ap-follow__text strong {
        color: var(--gb-text-value);
        font-size: 0.82rem;
        letter-spacing: 0.02em;
      }
      .ap-follow__text span {
        color: var(--gb-text-muted);
        font-size: 0.7rem;
      }
      .ap-follow__btn {
        align-self: stretch;
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-md);
        cursor: pointer;
        border: none;
        background: var(--gb-data-good);
        color: var(--gb-bg-canvas);
        font-weight: 800;
        letter-spacing: 0.04em;
        font-size: 0.8rem;
        min-height: 44px;
        touch-action: manipulation;
      }

      /* ── Alerts band ──────────────────────────────────────────────────── */
      .ap-alerts {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .ap-alerts:empty {
        display: none;
      }
      .ap-alert {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        background: var(--gb-alarm-warning-bg);
        border: 1px solid var(--gb-alarm-warning-border);
        animation: ap-pulse 1.6s infinite;
      }
      .ap-alert[data-sev='critical'] {
        background: var(--gb-alarm-emergency-bg);
        border-color: var(--gb-alarm-emergency-border);
      }
      .ap-alert__icon {
        font-size: 1.2rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .ap-alert__msg {
        flex: 1;
        min-width: 0;
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.03em;
        color: var(--gb-data-warn);
      }
      .ap-alert[data-sev='critical'] .ap-alert__msg {
        color: var(--gb-data-stale);
      }
      .ap-alert__msg em {
        font-style: normal;
        font-weight: 600;
        font-family: var(--font-mono, monospace);
        color: var(--gb-text-value);
      }
      .ap-alert__btn {
        flex-shrink: 0;
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-md);
        border: none;
        background: var(--gb-data-warn);
        color: var(--gb-bg-canvas);
        font-weight: 800;
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        cursor: pointer;
        min-height: 36px;
        touch-action: manipulation;
      }
      @keyframes ap-pulse {
        50% {
          opacity: 0.72;
        }
      }

      /* ── Cockpit ──────────────────────────────────────────────────────── */
      .ap-cockpit {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        min-height: 0;
      }

      .ap-panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--gb-bg-bezel);
        border: 1px solid var(--gb-border-panel);
        min-width: 0;
      }
      .ap-panel__hd {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: 0.64rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--gb-text-muted);
      }
      .ap-panel__bar {
        width: 3px;
        height: 12px;
        border-radius: 2px;
        background: var(--gb-tick-reference);
        flex-shrink: 0;
      }
      .ap-helm__dial {
        display: flex;
        justify-content: center;
        padding: var(--space-2) 0;
      }

      /* Telemetry tiles */
      .ap-tiles {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-2);
        align-content: start;
      }
      .tile {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3);
        border-radius: var(--radius-md);
        background: var(--gb-bg-face);
        border: 1px solid var(--gb-border-panel);
      }
      .tile--wide {
        grid-column: 1 / -1;
      }
      .tile__k {
        font-size: 0.6rem;
        color: var(--gb-text-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .tile__row {
        display: flex;
        gap: var(--space-3);
      }
      .tile__pair {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        flex: 1;
        min-width: 0;
      }
      .tile__sub {
        font-size: 0.55rem;
        color: var(--gb-text-muted);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .tile__v {
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        font-weight: 800;
        font-size: 1.55rem;
        line-height: 1;
        color: var(--gb-text-value);
      }
      .tile__v i {
        font-size: 0.7rem;
        color: var(--gb-text-unit);
        font-style: normal;
        margin-left: 1px;
      }
      .tile__v--accent {
        color: var(--gb-data-good);
      }
      .tile__v--warn {
        color: var(--gb-data-stale);
      }

      .ap-events {
        min-height: 0;
      }

      /* ─────────────────────────────────────────────────────────────────────
       Tablet ≥ 640px
       ──────────────────────────────────────────────────────────────────── */
      @media (min-width: 640px) {
        .ap {
          padding: var(--space-4);
          gap: var(--space-4);
        }
        .ap-bar {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .ap-bar__titles h1 {
          font-size: 1.3rem;
        }
        .ap-follow {
          flex-direction: row;
          align-items: center;
        }
        .ap-follow__btn {
          align-self: auto;
          margin-left: auto;
        }
        .tile__v {
          font-size: 1.7rem;
        }
      }

      /* ─────────────────────────────────────────────────────────────────────
       Desktop ≥ 1024px — cockpit grid (content height → page scroll)
       ──────────────────────────────────────────────────────────────────── */
      @media (min-width: 1024px) {
        .ap-cockpit {
          display: grid;
          grid-template-columns: minmax(340px, 400px) 1fr;
          grid-template-rows: auto auto;
          grid-template-areas:
            'helm data'
            'helm events';
          gap: var(--space-3);
          align-items: start;
        }
        .ap-helm {
          grid-area: helm;
          align-self: start;
        }
        .ap-data {
          grid-area: data;
        }
        .ap-events {
          grid-area: events;
        }
        .ap-tiles {
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-3);
        }
        .tile {
          padding: var(--space-4);
        }
        .tile__v {
          font-size: 1.9rem;
        }
        .tile__v i {
          font-size: 0.75rem;
        }
      }

      /* Cockpit-fit: on tall enough desktops, fill the viewport and let only the
         event log scroll. Short screens keep the natural page scroll above. */
      @media (min-width: 1024px) and (min-height: 760px) {
        .ap-cockpit {
          grid-template-rows: auto 1fr;
          flex: 1;
          min-height: 0;
        }
        .ap-events {
          min-height: 0;
          overflow: hidden;
        }
      }

      /* ─────────────────────────────────────────────────────────────────────
       Wide desktop ≥ 1400px
       ──────────────────────────────────────────────────────────────────── */
      @media (min-width: 1400px) {
        .ap-cockpit {
          grid-template-columns: minmax(380px, 440px) 1fr;
        }
        .ap-tiles {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `,
  ],
})
export class AutopilotPage {
  public facade = inject(AutopilotFacadeService);
  private readonly log = inject(AutopilotDecisionLogService);
  private readonly store = inject(DatapointStoreService);

  readonly showCalibration = signal(false);
  readonly showManual = signal(false);

  /** Off-course proxy threshold on commanded/actual rudder (matches prior console logic). */
  private static readonly OFF_COURSE_DEG = 10;

  /** Show the follow banner when a destination/course is active and we're idle. */
  readonly pendingDestination$ = combineLatest([this.facade.state$, this.log.courseActive$]).pipe(
    map(([state, courseActive]) => courseActive && state === 'standby'),
  );

  /** Panel-level alerts derived from the published autopilot state. */
  readonly alerts$ = combineLatest([
    this.facade.state$,
    this.facade.fault$,
    this.facade.windHazard$,
    this.facade.noGo$,
    this.facade.rudderAngle$,
  ]).pipe(
    map(([state, fault, hazard, noGo, rudderRad]) => {
      const alerts: PanelAlert[] = [];
      if (state === 'fault') {
        const faultAlert: PanelAlert = {
          severity: 'critical',
          icon: '⛔',
          labelKey: 'autopilot.fault.title',
          action: 'clearFault',
        };
        if (fault && fault !== 'none') {
          faultAlert.reason = fault;
        }
        alerts.push(faultAlert);
      }
      if (hazard && hazard !== 'none') {
        alerts.push({
          severity: hazard === 'accidental-gybe' ? 'critical' : 'warn',
          icon: '⚠️',
          labelKey: this.hazardLabelKey(hazard),
        });
      }
      if (noGo) {
        alerts.push({ severity: 'warn', icon: '⚠️', labelKey: 'autopilot.console.no_go' });
      }
      const engaged = state === 'auto' || state === 'wind' || state === 'route';
      const rudderDeg = rudderRad == null ? 0 : Math.abs((rudderRad * 180) / Math.PI);
      if (engaged && rudderDeg > AutopilotPage.OFF_COURSE_DEG) {
        alerts.push({ severity: 'warn', icon: '⚠️', labelKey: 'autopilot.console.off_course' });
      }
      return alerts;
    }),
  );

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

  /** Maps an engine state to its i18n key so the status chip is translatable. */
  stateLabelKey(state: string | null): string {
    const map: Record<string, string> = {
      standby: 'autopilot.state.standby',
      auto: 'autopilot.state.auto',
      wind: 'autopilot.state.wind',
      route: 'autopilot.state.track',
      fault: 'autopilot.state.fault',
    };
    return state ? (map[state] ?? 'autopilot.state.standby') : 'autopilot.state.standby';
  }

  /** i18n key for a wind-hazard alert; unknown hazards fall back to the raw string. */
  hazardLabelKey(hazard: string): string {
    switch (hazard) {
      case 'accidental-gybe':
        return 'autopilot.console.hazard.gybe';
      case 'accidental-tack':
        return 'autopilot.console.hazard.tack';
      case 'gust':
        return 'autopilot.console.hazard.gust';
      default:
        return hazard.toUpperCase();
    }
  }

  /** Explicit, safety-compliant engage of TRACK toward the active destination. */
  onFollow(): void {
    this.log.record('action', 'FOLLOW_REQUESTED');
    this.facade.engageTrack();
  }

  /** Software emergency stop (latched motor cut until the fault is cleared). */
  onEmergencyStop(): void {
    this.facade.emergencyStop();
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
