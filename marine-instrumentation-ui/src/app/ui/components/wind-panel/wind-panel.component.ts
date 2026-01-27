import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { formatSpeed, formatAngleDegrees } from '../../../core/formatting/formatters';
import { SparklineComponent } from '../sparkline/sparkline.component';
import { PreferencesService } from '../../../services/preferences.service';
import { calculateMax, calculateMean, filterToWindow } from '../../../core/calculations/trend';
import { HistoryPoint } from '../../../state/datapoints/datapoint.models';

@Component({
  selector: 'app-wind-panel',
  standalone: true,
  imports: [CommonModule, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-card">
      <div class="panel-header">
        <div class="panel-title">Apparent Wind</div>
      </div>

      <div class="panel-body">
        <!-- Wind Dial + Values -->
        <div class="wind-main">
          <!-- Simple Wind Dial -->
          <div class="wind-dial">
            <div class="dial-ring"></div>
            <div
              class="dial-needle"
              [style.transform]="'rotate(' + awaDegreesDisplay() + 'deg)'"
            ></div>
            <div class="dial-center"></div>
            <!-- Cardinal marks -->
            <span class="dial-mark n">N</span>
            <span class="dial-mark e">S</span>
          </div>

          <!-- Wind Values -->
          <div class="wind-values">
            <div class="wind-primary">
              <span class="value-large">{{ awsValue() }}</span>
              <span class="value-unit">{{ awsUnit() }}</span>
            </div>
            <div class="wind-angle">
              <span class="angle-value">{{ awaValue() }}</span>
              <span class="angle-unit">°</span>
            </div>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat">
            <span class="stat-label">Gust</span>
            <span class="stat-value">{{ gustValue() }}</span>
            <span class="stat-unit">{{ awsUnit() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Avg</span>
            <span class="stat-value">{{ avgValue() }}</span>
            <span class="stat-unit">{{ awsUnit() }}</span>
          </div>
        </div>

        <!-- Sparkline -->
        <div class="sparkline-container">
          <app-sparkline [data]="awsHistory()" [height]="28"></app-sparkline>
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

    .panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .wind-main {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    /* Wind Dial */
    .wind-dial {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }

    :host-context(.compact) .wind-dial {
      width: 80px;
      height: 80px;
    }

    .dial-ring {
      position: absolute;
      inset: 0;
      border: 2px solid var(--border);
      border-radius: 50%;
      background: var(--surface-2);
    }

    .dial-needle {
      position: absolute;
      left: 50%;
      bottom: 50%;
      width: 4px;
      height: 40%;
      background: linear-gradient(to top, var(--accent), var(--accent));
      transform-origin: bottom center;
      border-radius: 2px;
      margin-left: -2px;
      transition: transform 0.3s ease-out;
      z-index: 2;
    }

    :host-context(.compact) .dial-needle {
      height: 35%;
    }

    .dial-center {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 12px;
      height: 12px;
      background: var(--accent);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 3;
    }

    .dial-mark {
      position: absolute;
      font-size: 0.6rem;
      font-weight: 700;
      color: var(--muted);
    }

    .dial-mark.n {
      top: 4px;
      left: 50%;
      transform: translateX(-50%);
    }

    .dial-mark.e {
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
    }

    /* Wind Values */
    .wind-values {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .wind-primary {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .value-large {
      font-size: clamp(2rem, 5vw, 2.5rem);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
      line-height: 1;
    }

    :host-context(.compact) .value-large {
      font-size: clamp(1.5rem, 4vw, 2rem);
    }

    .value-unit {
      font-size: 0.9rem;
      color: var(--muted);
      font-weight: 600;
    }

    .wind-angle {
      display: flex;
      align-items: baseline;
      gap: 2px;
    }

    .angle-value {
      font-size: 1.5rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
    }

    :host-context(.compact) .angle-value {
      font-size: 1.25rem;
    }

    .angle-unit {
      font-size: 0.85rem;
      color: var(--muted);
    }

    /* Stats Row */
    .stats-row {
      display: flex;
      gap: 1.5rem;
    }

    .stat {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }

    .stat-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .stat-value {
      font-size: 1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
    }

    .stat-unit {
      font-size: 0.75rem;
      color: var(--muted);
    }

    .sparkline-container {
      flex: 1;
      min-height: 28px;
      margin-top: auto;
    }
  `],
})
export class WindPanelComponent {
  private store = inject(DatapointStoreService);
  private prefs = inject(PreferencesService);

  private aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent);
  private awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent);
  private awsHistory$ = this.store.series$(PATHS.environment.wind.speedApparent, 60);

  private data = toSignal(
    combineLatest([
      this.aws$.pipe(startWith(undefined)),
      this.awa$.pipe(startWith(undefined)),
      this.awsHistory$,
      this.prefs.preferences$,
    ]).pipe(
      map(([aws, awa, history, prefs]) => {
        const awsFormatted = formatSpeed(aws?.value, prefs.speedUnit);
        const awaFormatted = formatAngleDegrees(awa?.value);

        // Calculate gust and avg over last 60s
        const recentHistory = filterToWindow(history, 60 * 1000);
        const gustMps = calculateMax(recentHistory);
        const avgMps = calculateMean(recentHistory);

        const gustFormatted = formatSpeed(gustMps, prefs.speedUnit);
        const avgFormatted = formatSpeed(avgMps, prefs.speedUnit);

        // AWA in degrees for dial rotation
        let awaDeg = 0;
        if (awa?.value !== undefined) {
          const deg = (awa.value * 180) / Math.PI;
          awaDeg = ((deg % 360) + 360) % 360;
        }

        return {
          awsValue: awsFormatted.value,
          awsUnit: awsFormatted.unit,
          awaValue: awaFormatted.value,
          awaDegrees: awaDeg,
          gustValue: gustMps !== null ? gustFormatted.value : '--',
          avgValue: avgMps !== null ? avgFormatted.value : '--',
        };
      })
    ),
    {
      initialValue: {
        awsValue: '--',
        awsUnit: 'kn',
        awaValue: '--',
        awaDegrees: 0,
        gustValue: '--',
        avgValue: '--',
      },
    }
  );

  awsHistory = toSignal(this.awsHistory$, { initialValue: [] as HistoryPoint[] });

  awsValue = computed(() => this.data().awsValue);
  awsUnit = computed(() => this.data().awsUnit);
  awaValue = computed(() => this.data().awaValue);
  awaDegreesDisplay = computed(() => this.data().awaDegrees);
  gustValue = computed(() => this.data().gustValue);
  avgValue = computed(() => this.data().avgValue);
}
