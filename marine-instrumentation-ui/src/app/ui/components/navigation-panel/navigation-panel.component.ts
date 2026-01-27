import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { formatSpeed, formatAngleDegrees, formatCoordinate } from '../../../core/formatting/formatters';
import { SparklineComponent } from '../sparkline/sparkline.component';
import { PreferencesService } from '../../../services/preferences.service';

interface PositionValue {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-navigation-panel',
  standalone: true,
  imports: [CommonModule, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-card">
      <div class="panel-header">
        <div class="panel-title">Navigation</div>
        <div class="fix-badge" [class.has-fix]="hasFix()" [class.stale]="isStale()">
          <span class="fix-dot"></span>
          <span>{{ hasFix() ? (isStale() ? 'STALE' : 'FIX') : 'NO FIX' }}</span>
        </div>
      </div>

      <div class="panel-body">
        <!-- Primary: SOG -->
        <div class="primary-value">
          <div class="value-large">{{ sogValue() }}</div>
          <div class="value-unit">{{ sogUnit() }}</div>
        </div>

        <!-- Secondary Row: HDG + COG -->
        <div class="secondary-row">
          <div class="secondary-item">
            <span class="secondary-label">HDG</span>
            <span class="secondary-value">{{ hdgValue() }}</span>
            <span class="secondary-unit">{{ hdgUnit() }}</span>
          </div>
          <div class="secondary-item">
            <span class="secondary-label">COG</span>
            <span class="secondary-value">{{ cogValue() }}</span>
            <span class="secondary-unit">{{ cogUnit() }}</span>
          </div>
        </div>

        <!-- Position -->
        <div class="position-display" *ngIf="hasFix()">
          <div class="coord">{{ latDisplay() }}</div>
          <div class="coord">{{ lonDisplay() }}</div>
        </div>
        <div class="position-display no-fix" *ngIf="!hasFix()">
          <span>Awaiting GPS fix...</span>
        </div>

        <!-- Sparkline -->
        <div class="sparkline-container">
          <app-sparkline [data]="sogHistory()" [height]="32"></app-sparkline>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .panel-card {
      height: 100%;
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: var(--shadow);
    }

    :host-context(.compact) .panel-card {
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      gap: 0.5rem;
      box-shadow: none;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .fix-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface-2);
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--danger);
    }

    .fix-badge.has-fix {
      color: var(--ok);
    }

    .fix-badge.stale {
      color: var(--warn);
    }

    .fix-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--danger);
    }

    .fix-badge.has-fix .fix-dot {
      background: var(--ok);
      box-shadow: 0 0 6px var(--ok);
    }

    .fix-badge.stale .fix-dot {
      background: var(--warn);
    }

    .panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .primary-value {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .value-large {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
      line-height: 1;
    }

    :host-context(.compact) .value-large {
      font-size: clamp(2rem, 5vw, 2.5rem);
    }

    .value-unit {
      font-size: 1rem;
      color: var(--muted);
      font-weight: 600;
    }

    .secondary-row {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .secondary-item {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }

    .secondary-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .secondary-value {
      font-size: 1.25rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
    }

    .secondary-unit {
      font-size: 0.75rem;
      color: var(--muted);
      font-weight: 600;
    }

    :host-context(.compact) .secondary-value {
      font-size: 1rem;
    }

    .position-display {
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
      color: var(--muted);
      padding: 0.5rem;
      background: var(--surface-2);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .position-display.no-fix {
      color: var(--warn);
      font-style: italic;
      text-align: center;
    }

    .coord {
      font-family: var(--font-mono);
    }

    .sparkline-container {
      flex: 1;
      min-height: 32px;
      margin-top: auto;
    }
  `],
})
export class NavigationPanelComponent {
  private store = inject(DatapointStoreService);
  private prefs = inject(PreferencesService);

  private sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround);
  private hdg$ = this.store.observe<number>(PATHS.navigation.headingTrue);
  private cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue);
  private position$ = this.store.observe<PositionValue>(PATHS.navigation.position);
  private sogHistory$ = this.store.series$(PATHS.navigation.speedOverGround, 60);

  private tick$ = timer(0, 1000);

  private data = toSignal(
    combineLatest([
      this.sog$.pipe(startWith(undefined)),
      this.hdg$.pipe(startWith(undefined)),
      this.cog$.pipe(startWith(undefined)),
      this.position$.pipe(startWith(undefined)),
      this.prefs.preferences$,
      this.tick$,
    ]).pipe(
      map(([sog, hdg, cog, pos, prefs, _tick]) => {
        const now = Date.now();
        const posAge = pos?.timestamp ? (now - pos.timestamp) / 1000 : null;
        const isStale = posAge !== null && posAge > 5;

        const sogFormatted = formatSpeed(sog?.value, prefs.speedUnit);
        const hdgFormatted = formatAngleDegrees(hdg?.value);
        const cogFormatted = formatAngleDegrees(cog?.value);

        return {
          sogValue: sogFormatted.value,
          sogUnit: sogFormatted.unit,
          hdgValue: hdgFormatted.value,
          hdgUnit: hdgFormatted.unit,
          cogValue: cogFormatted.value,
          cogUnit: cogFormatted.unit,
          hasFix: pos?.value?.latitude !== undefined,
          isStale,
          lat: pos?.value?.latitude,
          lon: pos?.value?.longitude,
        };
      })
    ),
    {
      initialValue: {
        sogValue: '--',
        sogUnit: 'kn',
        hdgValue: '--',
        hdgUnit: '°',
        cogValue: '--',
        cogUnit: '°',
        hasFix: false,
        isStale: false,
        lat: undefined as number | undefined,
        lon: undefined as number | undefined,
      },
    }
  );

  sogHistory = toSignal(this.sogHistory$, { initialValue: [] });

  sogValue = computed(() => this.data().sogValue);
  sogUnit = computed(() => this.data().sogUnit);
  hdgValue = computed(() => this.data().hdgValue);
  hdgUnit = computed(() => this.data().hdgUnit);
  cogValue = computed(() => this.data().cogValue);
  cogUnit = computed(() => this.data().cogUnit);
  hasFix = computed(() => this.data().hasFix);
  isStale = computed(() => this.data().isStale);

  latDisplay = computed(() => {
    const lat = this.data().lat;
    return lat !== undefined ? formatCoordinate(lat, 'lat') : '--';
  });

  lonDisplay = computed(() => {
    const lon = this.data().lon;
    return lon !== undefined ? formatCoordinate(lon, 'lon') : '--';
  });
}
