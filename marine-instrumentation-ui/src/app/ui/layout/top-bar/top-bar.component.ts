import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, interval, map, startWith } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { HeadingPipe } from '../../../shared/pipes/heading.pipe';
import { LatLonPipe } from '../../../shared/pipes/lat-lon.pipe';

/** Staleness threshold in ms — data older than this is considered stale */
const STALE_THRESHOLD_MS = 10_000;

interface VesselDatum<T = number> {
  value: T;
  stale: boolean;
}

interface GlobalTopBarVm {
  sog: VesselDatum;
  cog: VesselDatum;
  hdg: VesselDatum;
  position: VesselDatum<{ lat: number; lon: number } | null>;
  utcTime: string;
  utcISO: string;
  connected: boolean;
  alarmCount: number;
  criticalCount: number;
  hasUnacknowledged: boolean;
  isDayMode: boolean;
  isChartMode: boolean;
}

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, HeadingPipe, LatLonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm$ | async; as vm) {
      <header class="global-top-bar" role="banner"
        [attr.data-chart-mode]="vm.isChartMode">

        <!-- SLOT LEFT: Menu toggle + Brand -->
        <div class="top-bar__left">
          @if (vm.isChartMode) {
            <button class="top-bar__menu-btn"
                    type="button"
                    (click)="toggleNav.emit()"
                    aria-label="Toggle navigation">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          }
          <a class="top-bar__brand" routerLink="/chart" aria-label="OMI Home">
            <svg class="top-bar__logo" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" fill="var(--gb-needle-primary)"/>
              <line x1="12" y1="7" x2="12" y2="19" stroke="var(--gb-needle-primary)" stroke-width="2"/>
              <path d="M6 10 Q12 8 18 10" stroke="var(--gb-needle-primary)" stroke-width="1.5" fill="none"/>
              <line x1="6" y1="19" x2="18" y2="19" stroke="var(--gb-needle-primary)" stroke-width="1.5"/>
            </svg>
            @if (!vm.isChartMode) {
              <span class="top-bar__brand-text">OMI</span>
            }
          </a>
        </div>

        <!-- SLOT CENTER: Critical vessel data -->
        <nav class="top-bar__vessel-data" aria-label="Vessel data">
          <div class="top-bar__datum" [class.top-bar__datum--stale]="vm.sog.stale">
            <span class="top-bar__datum-label">SOG</span>
            <span class="top-bar__datum-value">{{ vm.sog.stale ? '---' : (vm.sog.value | number:'1.1-1') }}</span>
            <span class="top-bar__datum-unit">KTS</span>
          </div>

          <div class="top-bar__separator" aria-hidden="true"></div>

          <div class="top-bar__datum" [class.top-bar__datum--stale]="vm.cog.stale">
            <span class="top-bar__datum-label">COG</span>
            <span class="top-bar__datum-value">{{ vm.cog.stale ? '---' : (vm.cog.value | heading) }}</span>
          </div>

          <div class="top-bar__separator" aria-hidden="true"></div>

          <div class="top-bar__datum" [class.top-bar__datum--stale]="vm.hdg.stale">
            <span class="top-bar__datum-label">HDG</span>
            <span class="top-bar__datum-value">{{ vm.hdg.stale ? '---' : (vm.hdg.value | heading) }}</span>
            <span class="top-bar__datum-unit">T</span>
          </div>

          <div class="top-bar__separator" aria-hidden="true"></div>

          <!-- GPS Position -->
          <div class="top-bar__position" [class.top-bar__datum--stale]="vm.position.stale">
            <span class="top-bar__datum-label">POS</span>
            <div class="top-bar__coords">
              <span>{{ vm.position.stale || !vm.position.value ? '---' : (vm.position.value | latLon:'lat') }}</span>
              <span>{{ vm.position.stale || !vm.position.value ? '---' : (vm.position.value | latLon:'lon') }}</span>
            </div>
          </div>
        </nav>

        <!-- SLOT RIGHT: UTC, connection, alarms, theme -->
        <div class="top-bar__right">
          <time class="top-bar__utc" [attr.datetime]="vm.utcISO">{{ vm.utcTime }}</time>

          <!-- Alarm badge -->
          @if (vm.alarmCount > 0) {
            <button class="top-bar__alarm-btn top-bar__alarm-btn--active"
                    routerLink="/alarms"
                    [attr.aria-label]="vm.alarmCount + ' active alarms'">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 1a5.5 5.5 0 00-5.5 5.5v2L1 10h14l-1.5-1.5v-2A5.5 5.5 0 008 1z" fill="currentColor"/>
                <path d="M6 13a2 2 0 004 0H6z" fill="currentColor"/>
              </svg>
              <span class="top-bar__alarm-badge">{{ vm.alarmCount }}</span>
            </button>
          }

          <!-- SK connection status -->
          <div class="top-bar__connection"
               [class.top-bar__connection--online]="vm.connected"
               [class.top-bar__connection--offline]="!vm.connected"
               [attr.aria-label]="vm.connected ? 'Signal K connected' : 'Signal K offline'">
            <span class="connection-dot"></span>
            <span class="top-bar__datum-label">SK</span>
          </div>

          <!-- Day/Night toggle -->
          <button class="top-bar__theme-btn"
                  (click)="toggleTheme.emit()"
                  [attr.aria-label]="vm.isDayMode ? 'Switch to Night mode' : 'Switch to Day mode'">
            <svg width="16" height="16" viewBox="0 0 16 16">
              @if (vm.isDayMode) {
                <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 3.05l-1.06 1.06M3.05 11.89l1.06-1.06"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              } @else {
                <path d="M13 8A5 5 0 116 1a6 6 0 107 7z" fill="currentColor"/>
              }
            </svg>
          </button>
        </div>
      </header>
    }
  `,
  styles: [`
    :host { display: block; position: relative; z-index: var(--z-20); }

    .global-top-bar {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      height: 48px;
      padding: 0 var(--space-3);
      background: var(--gb-bg-bezel);
      border-bottom: 1px solid var(--gb-border-panel);
      position: relative;
      z-index: var(--z-20);
      user-select: none;
      gap: var(--space-4);
    }
    [data-theme="night"] .global-top-bar {
      box-shadow: 0 1px 0 rgba(82, 102, 122, 0.3), 0 2px 12px rgba(0, 0, 0, 0.4);
    }
    .global-top-bar[data-chart-mode="true"] {
      grid-template-columns: 48px 1fr auto;
    }

    .top-bar__left {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .top-bar__brand {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .top-bar__menu-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gb-bg-glass);
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      cursor: pointer;
      color: var(--gb-text-muted);
      padding: 0;
      transition: all 150ms ease;
    }
    .top-bar__menu-btn:hover {
      background: var(--gb-bg-glass-active);
      color: var(--gb-text-value);
      border-color: var(--gb-border-active);
    }

    .top-bar__brand:hover .top-bar__brand-text { color: var(--gb-text-value); }

    .top-bar__brand-text {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gb-text-muted);
      transition: color 200ms ease;
    }

    .top-bar__vessel-data {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      overflow: hidden;
    }
    @media (max-width: 900px) {
      .top-bar__vessel-data .top-bar__position { display: none; }
    }
    @media (max-width: 640px) {
      .top-bar__vessel-data .top-bar__datum:nth-child(n+5) { display: none; }
    }

    .top-bar__datum {
      display: flex;
      align-items: baseline;
      gap: 3px;
      flex-shrink: 0;
      transition: opacity 300ms ease;
    }
    .top-bar__datum--stale { opacity: 0.45; }

    .top-bar__datum-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--gb-text-muted);
      line-height: 1;
    }

    .top-bar__datum-value {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--gb-text-value);
      line-height: 1;
    }

    .top-bar__datum-unit {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--gb-text-muted);
      line-height: 1;
    }

    .top-bar__separator {
      width: 1px;
      height: 20px;
      background: var(--gb-border-panel);
      flex-shrink: 0;
      margin: 0 var(--space-1);
    }

    .top-bar__position {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .top-bar__coords {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .top-bar__coords span {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--gb-text-value);
      line-height: 1;
    }

    .top-bar__right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .top-bar__utc {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--gb-text-muted);
      letter-spacing: 0.04em;
    }

    .top-bar__alarm-btn {
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      color: var(--gb-text-muted);
      transition: all 150ms ease;
    }
    .top-bar__alarm-btn--active {
      color: var(--gb-data-stale);
      animation: gb-alarm-beat 1.2s ease-in-out infinite;
    }
    .top-bar__alarm-btn:hover {
      background: var(--gb-bg-glass-active);
      color: var(--gb-text-value);
    }

    .top-bar__alarm-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 14px;
      height: 14px;
      background: var(--gb-data-stale);
      color: white;
      font-size: 0.55rem;
      font-weight: 700;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }

    .top-bar__connection {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .connection-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: background-color 400ms ease, box-shadow 400ms ease;
    }
    .top-bar__connection--online .connection-dot {
      background: var(--gb-data-good);
      box-shadow: 0 0 5px rgba(0, 230, 118, 0.7);
    }
    .top-bar__connection--offline .connection-dot {
      background: var(--gb-data-stale);
      animation: gb-pulse-stale 1.5s ease-in-out infinite;
    }

    .top-bar__theme-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      color: var(--gb-text-muted);
      transition: all 150ms ease;
    }
    .top-bar__theme-btn:hover {
      background: var(--gb-bg-glass-active);
      border-color: var(--gb-border-panel);
      color: var(--gb-text-value);
    }

    @keyframes gb-alarm-beat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @keyframes gb-pulse-stale {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    @media (max-width: 768px) {
      .top-bar__utc { display: none; }
    }
  `]
})
export class TopBarComponent {
  private readonly store = inject(DatapointStoreService);

  private readonly connected$ = new BehaviorSubject<boolean>(false);
  private readonly isNight$ = new BehaviorSubject<boolean>(false);
  private readonly alarmCount$ = new BehaviorSubject<number>(0);
  private readonly criticalCount$ = new BehaviorSubject<number>(0);
  private readonly hasUnacknowledged$ = new BehaviorSubject<boolean>(false);
  private readonly chartMode$ = new BehaviorSubject<boolean>(false);

  @Input() set connected(value: boolean) { this.connected$.next(Boolean(value)); }
  @Input() set isNight(value: boolean | null) { this.isNight$.next(Boolean(value)); }
  @Input() set alarmCount(value: number | null | undefined) { this.alarmCount$.next(this.sanitizeCount(value)); }
  @Input() set criticalCount(value: number | null | undefined) { this.criticalCount$.next(this.sanitizeCount(value)); }
  @Input() set hasUnacknowledged(value: boolean | null | undefined) { this.hasUnacknowledged$.next(Boolean(value)); }
  @Input() set chartMode(value: boolean | null) { this.chartMode$.next(Boolean(value)); }

  @Output() toggleTheme = new EventEmitter<void>();
  @Output() openAlarms = new EventEmitter<void>();
  @Output() toggleNav = new EventEmitter<void>();

  // Vessel data from DatapointStoreService
  private readonly sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround);
  private readonly cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue);
  private readonly hdg$ = this.store.observe<number>(PATHS.navigation.headingTrue);
  private readonly pos$ = this.store.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position);

  readonly clock$ = interval(1000).pipe(startWith(0), map(() => {
    const iso = new Date().toISOString();
    return { time: iso.substring(11, 19), iso };
  }));

  readonly vm$ = combineLatest([
    this.connected$,
    this.isNight$,
    this.alarmCount$,
    this.criticalCount$,
    this.hasUnacknowledged$,
    this.chartMode$,
    this.clock$,
    this.sog$.pipe(startWith(undefined)),
    this.cog$.pipe(startWith(undefined)),
    this.hdg$.pipe(startWith(undefined)),
    this.pos$.pipe(startWith(undefined)),
  ]).pipe(
    map(([connected, isNight, alarmCount, criticalCount, hasUnack, chartMode, clock, sog, cog, hdg, pos]) => {
      const now = Date.now();
      const isStale = (dp: { timestamp: number } | undefined): boolean =>
        !dp || (now - dp.timestamp > STALE_THRESHOLD_MS);

      // SOG comes in m/s from Signal K, convert to knots for display
      const sogKts = sog?.value != null ? sog.value * 1.94384 : 0;
      const posCoords = pos?.value
        ? { lat: (pos.value as any).latitude ?? (pos.value as any).lat, lon: (pos.value as any).longitude ?? (pos.value as any).lon }
        : null;

      return {
        sog: { value: sogKts, stale: isStale(sog) },
        cog: { value: cog?.value ?? 0, stale: isStale(cog) },
        hdg: { value: hdg?.value ?? 0, stale: isStale(hdg) },
        position: { value: posCoords, stale: isStale(pos) },
        utcTime: clock.time,
        utcISO: clock.iso,
        connected,
        alarmCount: Math.max(0, alarmCount),
        criticalCount: Math.max(0, criticalCount),
        hasUnacknowledged: hasUnack,
        isDayMode: !isNight,
        isChartMode: chartMode,
      } satisfies GlobalTopBarVm;
    })
  );

  private sanitizeCount(value: number | null | undefined): number {
    if (value === null || value === undefined || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.floor(value));
  }
}
