import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, scan, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

interface DepthPoint {
  value: number;
  timestamp: number;
}

interface DepthView {
  currentValue: string;
  unit: string;
  quality: DataQuality;
  isStale: boolean;
  age: number | null;
  source: string;
  graphFillPath: string;
  graphLinePath: string;
  scaleMax: number;
  scaleTicks: number[];
  isShallow: boolean;
  ariaLabel: string;
}

@Component({
  selector: 'app-depth-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <omi-gb-bezel class="marine-card" label="DEPTH / SONAR" [quality]="view().quality">
      <div class="depth-container" [class.alarm-active]="view().isShallow">
        <div class="sonar-wrapper">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            class="sonar-svg"
            role="img"
            [attr.aria-label]="view().ariaLabel"
          >
            <defs>
              <linearGradient id="gradWaterNormal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="var(--color-water-top)" stop-opacity="0.5" />
                <stop offset="100%" stop-color="var(--color-water-bottom)" stop-opacity="0.1" />
              </linearGradient>

              <linearGradient id="gradWaterAlarm" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="var(--color-alarm)" stop-opacity="0.6" />
                <stop offset="100%" stop-color="var(--color-alarm-dim)" stop-opacity="0.1" />
              </linearGradient>

              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="color-mix(in srgb, var(--gb-text-value) 8%, transparent)" stroke-width="0.5" />
              </pattern>
            </defs>

            <rect x="0" y="0" width="100" height="100" fill="url(#gridPattern)" />

            <g class="grid-group">
              <ng-container *ngFor="let tick of view().scaleTicks">
                <line
                  x1="0"
                  [attr.y1]="(tick / view().scaleMax) * 100"
                  x2="100"
                  [attr.y2]="(tick / view().scaleMax) * 100"
                  class="grid-line"
                />
                <text x="98" [attr.y]="(tick / view().scaleMax) * 100 - 2" class="grid-label" text-anchor="end">
                  {{ tick }}m
                </text>
              </ng-container>
            </g>

            <path
              [attr.d]="view().graphFillPath"
              [attr.fill]="view().isShallow ? 'url(#gradWaterAlarm)' : 'url(#gradWaterNormal)'"
              class="sonar-fill"
            />

            <path [attr.d]="view().graphLinePath" class="sonar-bottom-line" [class.alarm-stroke]="view().isShallow" />
            <line x1="0" y1="0" x2="100" y2="0" class="surface-line" />
          </svg>
        </div>

        <div class="data-overlay">
          <div class="primary-readout" [class.danger]="view().isShallow">
            <span class="value gb-display-value gb-display-value--xl">{{ view().currentValue }}</span>
            <span class="unit gb-display-unit">{{ view().unit }}</span>
          </div>

          <div class="status-badges">
            <div class="badge scale-badge gb-display-unit">RNG: {{ view().scaleMax }}m</div>
            <div *ngIf="view().isShallow" class="badge alarm-badge gb-display-unit">SHALLOW</div>
          </div>
        </div>

        <div class="meta-row">
          <span class="gb-instrument-label" *ngIf="view().source">{{ view().source }}</span>
          <span class="gb-display-unit" *ngIf="view().age !== null">{{ view().age | number:'1.1-1' }}s</span>
        </div>
      </div>
    </omi-gb-bezel>
  `,
  styleUrls: ['./depth-widget.component.scss'],
})
export class DepthWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly qualityService = inject(DataQualityService);
  private readonly ticker$ = timer(0, 500);

  private readonly HISTORY_POINTS = 50;
  private readonly SHALLOW_THRESHOLD = 3;
  private readonly STANDARD_RANGES = [10, 20, 50, 100, 200, 500, 1000];

  private readonly depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);

  private readonly history$ = this.depth$.pipe(
    scan((acc, curr) => {
      if (!curr || typeof curr.value !== 'number') {
        return acc;
      }
      const next = [...acc, { value: curr.value, timestamp: curr.timestamp }];
      if (next.length > this.HISTORY_POINTS) {
        next.shift();
      }
      return next;
    }, [] as DepthPoint[]),
  );

  private readonly vm$ = combineLatest([
    this.depth$.pipe(startWith(undefined)),
    this.history$.pipe(startWith([] as DepthPoint[])),
    this.ticker$,
  ]).pipe(
    map(([current, history]) => {
      if (!current || typeof current.value !== 'number') {
        return this.getEmptyView();
      }

      const age = (Date.now() - current.timestamp) / 1000;

      const baseQuality = this.qualityService.getQuality(current.timestamp);
      const isStale = baseQuality === 'stale' || baseQuality === 'missing';
      const isShallow = !isStale && current.value <= this.SHALLOW_THRESHOLD;
      const quality: DataQuality = isShallow && baseQuality === 'good' ? 'warn' : baseQuality;

      const maxHistValue = Math.max(...history.map((p) => p.value), 0.1);
      const scaleMax = this.STANDARD_RANGES.find((value) => value >= maxHistValue * 1.1) ?? Math.ceil(maxHistValue);
      const scaleTicks = [0.25, 0.5, 0.75].map((factor) => Math.round(scaleMax * factor));

      const stepX = 100 / (this.HISTORY_POINTS - 1);
      const scaleY = 100 / scaleMax;

      const linePoints = history.map((point, index) => {
        const x = (index * stepX).toFixed(1);
        const y = (point.value * scaleY).toFixed(1);
        return `${x} ${y}`;
      });

      const graphLinePath = linePoints.length ? `M ${linePoints.join(' L ')}` : '';
      const graphFillPath = linePoints.length ? `M ${linePoints.join(' L ')} L 100 0 L 0 0 Z` : '';

      return {
        currentValue: isStale ? '---' : current.value.toFixed(1),
        unit: 'm',
        quality,
        isStale,
        age,
        source: current.source ?? '',
        graphFillPath,
        graphLinePath,
        scaleMax,
        scaleTicks,
        isShallow,
        ariaLabel: isStale ? 'Depth sonar. Data stale.' : `Depth sonar ${current.value.toFixed(1)} meters.`,
      } satisfies DepthView;
    }),
  );

  readonly view = toSignal(this.vm$, { initialValue: this.getEmptyView() });

  private getEmptyView(): DepthView {
    return {
      currentValue: '--.-',
      unit: 'm',
      quality: 'missing',
      isStale: true,
      age: null,
      source: '',
      graphFillPath: '',
      graphLinePath: '',
      scaleMax: 10,
      scaleTicks: [],
      isShallow: false,
      ariaLabel: 'Depth sonar. Data unavailable.',
    };
  }
}
