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
      class="instrument-tile"
      [class.instrument-tile--compact]="compact"
      [class.instrument-tile--wide]="config.displayType === 'analog-linear'"
      [class.instrument-tile--stale]="quality === 'stale'"
      [attr.data-quality]="quality"
    >
      <span class="instrument-tile__label">{{ config.label }}</span>

      <div class="instrument-tile__gauge">
        <!-- Linear bar for analog-linear -->
        <div
          class="instrument-tile__bar-track"
          *ngIf="config.displayType === 'analog-linear' && config.minValue != null && config.maxValue != null"
        >
          <div
            class="instrument-tile__bar-fill"
            [style.width.%]="barPercent"
            [attr.data-level]="barLevel"
          ></div>
        </div>
      </div>

      <div class="instrument-tile__value-group">
        <span class="instrument-tile__value">{{ displayValue }}</span>
        <span class="instrument-tile__unit">{{ config.unit }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* ── Tile frame ─────────────────────────────── */
      .instrument-tile {
        background: var(--gb-bg-panel);
        border: 1px solid var(--gb-border-panel);
        border-radius: 14px;
        padding: var(--space-3, 12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2, 8px);
        position: relative;
        box-shadow: var(--gb-shadow-instrument, none);
        aspect-ratio: 1;
        transition: border-color 200ms ease;
      }

      .instrument-tile:hover {
        border-color: var(--gb-accent, var(--gb-border-panel));
      }

      .instrument-tile--wide {
        aspect-ratio: 2/1;
        grid-column: span 2;
      }

      .instrument-tile--compact {
        padding: var(--space-2, 8px);
        gap: var(--space-1, 4px);
      }

      .instrument-tile--stale {
        border-color: rgba(var(--gb-data-stale-rgb, 243,177,63), 0.3);
      }

      .instrument-tile--stale .instrument-tile__value {
        color: var(--gb-text-stale, var(--gb-text-muted));
      }

      /* ── Label ──────────────────────────────────── */
      .instrument-tile__label {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--gb-text-muted);
        align-self: flex-start;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      /* ── Gauge area ─────────────────────────────── */
      .instrument-tile__gauge {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }

      /* ── Value group ────────────────────────────── */
      .instrument-tile__value-group {
        display: flex;
        align-items: baseline;
        gap: 4px;
        align-self: flex-end;
      }

      .instrument-tile__value {
        font-family: 'JetBrains Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-size: 1.5rem;
        font-weight: 400;
        color: var(--gb-text-value);
        line-height: 1;
      }

      .instrument-tile__unit {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--gb-text-unit);
      }

      /* ── Bar gauge ──────────────────────────────── */
      .instrument-tile__bar-track {
        height: 4px;
        background: var(--gb-bg-bezel, rgba(255,255,255,0.06));
        border-radius: 2px;
        overflow: hidden;
        width: 100%;
      }

      .instrument-tile__bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 300ms ease;
        background: var(--gb-accent, #4a90d9);
      }

      .instrument-tile__bar-fill[data-level='warn'] {
        background: var(--gb-data-warn, #f3b13f);
      }

      .instrument-tile__bar-fill[data-level='danger'] {
        background: var(--gb-data-danger, #f06352);
      }

      /* ── Quality states ─────────────────────────── */
      [data-quality='stale'] .instrument-tile__value {
        opacity: 0.5;
      }

      [data-quality='missing'] .instrument-tile__value {
        opacity: 0.3;
      }

      /* ── Compact overrides ──────────────────────── */
      .instrument-tile--compact .instrument-tile__value {
        font-size: 1rem;
      }

      .instrument-tile--compact .instrument-tile__label {
        font-size: 0.5rem;
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
