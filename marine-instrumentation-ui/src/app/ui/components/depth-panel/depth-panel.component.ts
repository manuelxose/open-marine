import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { formatDepth } from '../../../core/formatting/formatters';
import { SparklineComponent } from '../sparkline/sparkline.component';
import { PreferencesService } from '../../../services/preferences.service';
import { calculateDepthTrend, filterToWindow, TrendDirection } from '../../../core/calculations/trend';
import { HistoryPoint } from '../../../state/datapoints/datapoint.models';
import { combineLatest, startWith } from 'rxjs';

@Component({
  selector: 'app-depth-panel',
  standalone: true,
  imports: [CommonModule, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-card" [class.shallow]="isShallow()">
      <div class="panel-header">
        <div class="panel-title">Depth</div>
        <div class="shallow-badge" *ngIf="isShallow()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          SHALLOW
        </div>
      </div>

      <div class="panel-body">
        <div class="depth-main">
          <div class="depth-value">
            <span class="value-large">{{ depthValue() }}</span>
            <span class="value-unit">{{ depthUnit() }}</span>
          </div>
          <!-- Trend Arrow -->
          <div class="trend-indicator" [class]="'trend-' + trend()">
            <svg *ngIf="trend() === 'rising'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            <svg *ngIf="trend() === 'falling'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            <svg *ngIf="trend() === 'stable'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
        </div>

        <!-- Threshold indicator -->
        <div class="threshold-info">
          Shallow threshold: {{ shallowThreshold() }}{{ depthUnit() }}
        </div>

        <!-- Sparkline with threshold marker -->
        <div class="sparkline-container">
          <app-sparkline
            [data]="depthHistory()"
            [height]="36"
            [threshold]="shallowThresholdValue()"
          ></app-sparkline>
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
      transition: border-color 0.3s ease;
      box-shadow: var(--shadow);
    }

    .panel-card.shallow {
      border-color: var(--danger);
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), transparent);
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

    .shallow-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--danger);
      color: white;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .depth-main {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .depth-value {
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

    .shallow .value-large {
      color: var(--danger);
    }

    :host-context(.compact) .value-large {
      font-size: clamp(2rem, 5vw, 2.5rem);
    }

    .value-unit {
      font-size: 1rem;
      color: var(--muted);
      font-weight: 600;
    }

    .trend-indicator {
      color: var(--muted);
    }

    .trend-rising {
      color: var(--ok);
    }

    .trend-falling {
      color: var(--danger);
    }

    .trend-stable {
      color: var(--muted);
    }

    .threshold-info {
      font-size: 0.7rem;
      color: var(--muted);
    }

    .sparkline-container {
      flex: 1;
      min-height: 36px;
      margin-top: auto;
    }
  `],
})
export class DepthPanelComponent {
  private store = inject(DatapointStoreService);
  private prefs = inject(PreferencesService);

  private depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);
  private depthHistory$ = this.store.series$(PATHS.environment.depth.belowTransducer, 60);

  private data = toSignal(
    combineLatest([
      this.depth$.pipe(startWith(undefined)),
      this.depthHistory$,
      this.prefs.preferences$,
    ]).pipe(
      map(([depth, history, prefs]) => {
        const formatted = formatDepth(depth?.value, prefs.depthUnit);
        const thresholdFormatted = formatDepth(prefs.shallowThreshold, prefs.depthUnit);

        // Calculate trend over last 15 seconds
        const trendWindow = filterToWindow(history, 15 * 1000);
        const trend = calculateDepthTrend(trendWindow);

        // Check shallow water
        const depthMeters = depth?.value ?? Infinity;
        const isShallow = depthMeters < prefs.shallowThreshold;

        return {
          depthValue: formatted.value,
          depthUnit: formatted.unit,
          trend,
          isShallow,
          shallowThreshold: thresholdFormatted.value,
          shallowThresholdValue: prefs.shallowThreshold,
        };
      })
    ),
    {
      initialValue: {
        depthValue: '--',
        depthUnit: 'm',
        trend: 'unknown' as TrendDirection,
        isShallow: false,
        shallowThreshold: '3.0',
        shallowThresholdValue: 3.0,
      },
    }
  );

  depthHistory = toSignal(this.depthHistory$, { initialValue: [] as HistoryPoint[] });

  depthValue = computed(() => this.data().depthValue);
  depthUnit = computed(() => this.data().depthUnit);
  trend = computed(() => this.data().trend);
  isShallow = computed(() => this.data().isShallow);
  shallowThreshold = computed(() => this.data().shallowThreshold);
  shallowThresholdValue = computed(() => this.data().shallowThresholdValue);
}
