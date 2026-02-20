import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';
import type { InstrumentDefinition } from '../../data/instrument-catalog';

type DataQuality = 'good' | 'stale' | 'missing';

@Component({
  selector: 'omi-instrument-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="instrument-widget"
      [class.instrument-widget--compact]="compact"
      [attr.data-quality]="quality"
    >
      <div class="instrument-widget__header">
        <span class="instrument-widget__label">{{ config.label }}</span>
        <span class="instrument-widget__quality-dot" [attr.data-quality]="quality"></span>
      </div>

      <div class="instrument-widget__body">
        <!-- Digital display (default) -->
        <ng-container *ngIf="config.displayType === 'digital' || config.displayType === 'analog-linear'">
          <div class="instrument-widget__digital">
            <span class="instrument-widget__value gb-display-value" [class.gb-display-value--xl]="!compact">
              {{ displayValue }}
            </span>
            <span class="instrument-widget__unit gb-display-unit">{{ config.unit }}</span>
          </div>

          <!-- Linear bar for analog-linear -->
          <div
            class="instrument-widget__bar-track"
            *ngIf="config.displayType === 'analog-linear' && config.minValue != null && config.maxValue != null"
          >
            <div
              class="instrument-widget__bar-fill"
              [style.width.%]="barPercent"
              [attr.data-level]="barLevel"
            ></div>
          </div>
        </ng-container>

        <!-- Circular display -->
        <ng-container *ngIf="config.displayType === 'analog-circular' || config.displayType === 'wind-rose'">
          <div class="instrument-widget__circular">
            <span class="instrument-widget__value gb-display-value" [class.gb-display-value--xl]="!compact">
              {{ displayValue }}
            </span>
            <span class="instrument-widget__unit gb-display-unit">{{ config.unit }}</span>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .instrument-widget {
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: border-color 0.2s;
      }

      .instrument-widget:hover {
        border-color: var(--accent, var(--border));
      }

      .instrument-widget--compact {
        padding: 0.5rem;
        gap: 0.25rem;
      }

      .instrument-widget__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .instrument-widget__label {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .instrument-widget__quality-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .instrument-widget__quality-dot[data-quality='good'] {
        background: var(--status-online, #2ec25c);
      }
      .instrument-widget__quality-dot[data-quality='stale'] {
        background: #f3b13f;
      }
      .instrument-widget__quality-dot[data-quality='missing'] {
        background: var(--text-2);
        opacity: 0.3;
      }

      .instrument-widget__body {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .instrument-widget__digital,
      .instrument-widget__circular {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }

      .instrument-widget__value {
        font-variant-numeric: tabular-nums;
        min-width: 0;
      }

      .instrument-widget__unit {
        font-size: 0.7rem;
        color: var(--text-2);
      }

      .instrument-widget__bar-track {
        height: 4px;
        background: var(--surface-2);
        border-radius: 2px;
        overflow: hidden;
      }

      .instrument-widget__bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
        background: var(--accent, #5ba4cf);
      }

      .instrument-widget__bar-fill[data-level='warn'] {
        background: #f3b13f;
      }

      .instrument-widget__bar-fill[data-level='danger'] {
        background: var(--status-offline, #f06352);
      }

      [data-quality='stale'] .instrument-widget__value {
        opacity: 0.5;
      }

      [data-quality='missing'] .instrument-widget__value {
        opacity: 0.3;
      }
    `,
  ],
})
export class InstrumentWidgetComponent implements OnInit, OnDestroy {
  @Input() config!: InstrumentDefinition;
  @Input() compact = false;

  private readonly store = inject(DatapointStoreService);
  private sub?: Subscription;

  rawValue: number | null = null;
  timestamp = 0;
  quality: DataQuality = 'missing';

  private readonly STALE_MS = 5000;

  get displayValue(): string {
    if (this.quality === 'missing' || this.rawValue === null) return '---';
    if (this.quality === 'stale') return '---';
    const decimals = this.config.decimals ?? 1;
    return this.rawValue.toFixed(decimals);
  }

  get barPercent(): number {
    if (
      this.rawValue === null ||
      this.config.minValue == null ||
      this.config.maxValue == null
    )
      return 0;
    const range = this.config.maxValue - this.config.minValue;
    if (range <= 0) return 0;
    const pct =
      ((this.rawValue - this.config.minValue) / range) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  get barLevel(): 'ok' | 'warn' | 'danger' {
    if (this.rawValue === null) return 'ok';
    if (
      (this.config.dangerLow != null && this.rawValue <= this.config.dangerLow) ||
      (this.config.dangerHigh != null &&
        this.rawValue >= this.config.dangerHigh)
    )
      return 'danger';
    if (
      (this.config.warnLow != null && this.rawValue <= this.config.warnLow) ||
      (this.config.warnHigh != null && this.rawValue >= this.config.warnHigh)
    )
      return 'warn';
    return 'ok';
  }

  ngOnInit(): void {
    if (!this.config.path) return;

    this.sub = this.store.observe<number>(this.config.path).subscribe({
      next: (dp) => {
        if (!dp) {
          this.quality = 'missing';
          this.rawValue = null;
          return;
        }
        const val = dp.value;
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          this.quality = 'missing';
          this.rawValue = null;
          return;
        }
        this.rawValue = val;
        this.timestamp = typeof dp.timestamp === 'string'
          ? Date.parse(dp.timestamp)
          : (dp.timestamp as unknown as number);

        const age = Date.now() - this.timestamp;
        this.quality = age > this.STALE_MS ? 'stale' : 'good';
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
