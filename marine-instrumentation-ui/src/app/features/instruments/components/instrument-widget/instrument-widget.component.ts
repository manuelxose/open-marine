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
import { PATHS } from '@omi/marine-data-contract';
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

      /* ── Tile frame — glass morphism instrument ─── */
      .instrument-tile {
        background: var(--glass-bg, var(--gb-bg-panel));
        backdrop-filter: blur(var(--glass-blur, 16px));
        -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
        border: 1px solid var(--glass-border, var(--gb-border-panel));
        border-radius: var(--glass-card-radius-sm, 14px);
        padding: var(--space-3, 12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2, 8px);
        position: relative;
        box-shadow:
          var(--glass-highlight, none),
          var(--glass-inner-shadow, none),
          var(--glass-depth-shadow, 0 4px 20px rgba(0,0,0,0.15));
        aspect-ratio: 1;
        transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
        overflow: hidden;
      }

      /* Top shine line */
      .instrument-tile::before {
        content: '';
        position: absolute;
        top: 0;
        left: 12%;
        right: 12%;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--glass-shine, rgba(255,255,255,0.15)), transparent);
        opacity: 0.6;
        z-index: 1;
      }

      .instrument-tile:hover {
        border-color: color-mix(in srgb, var(--glass-border) 60%, var(--primary, #4a90d9) 40%);
        box-shadow:
          var(--glass-highlight, none),
          var(--glass-hover-glow, 0 0 16px rgba(74,144,217,0.12)),
          0 8px 32px rgba(0,0,0,0.12);
        transform: translateY(-2px);
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
        border-color: rgba(235, 203, 139, 0.4);
      }

      .instrument-tile--stale .instrument-tile__value {
        color: var(--text-muted, var(--gb-text-muted));
        opacity: 0.5;
      }

      /* ── Label ──────────────────────────────────── */
      .instrument-tile__label {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--text-tertiary, var(--gb-text-muted));
        align-self: flex-start;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        z-index: 1;
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
        z-index: 1;
      }

      .instrument-tile__value {
        font-family: 'Share Tech Mono', 'JetBrains Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-size: 1.5rem;
        font-weight: 500;
        color: var(--text-primary, var(--gb-text-value));
        line-height: 1;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
        transition: color 0.3s ease;
      }

      .instrument-tile__unit {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted, var(--gb-text-unit));
      }

      /* ── Bar gauge ──────────────────────────────── */
      .instrument-tile__bar-track {
        height: 6px;
        background: linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.1));
        border-radius: var(--radius-full, 999px);
        overflow: hidden;
        width: 100%;
        border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .instrument-tile__bar-fill {
        height: 100%;
        border-radius: var(--radius-full, 999px);
        transition: width 300ms ease;
        background: var(--primary, #4a90d9);
        position: relative;
      }

      .instrument-tile__bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
        border-radius: var(--radius-full, 999px);
      }

      .instrument-tile__bar-fill[data-level='warn'] {
        background: linear-gradient(90deg, var(--warn, #f3b13f), color-mix(in srgb, var(--warn, #f3b13f) 80%, #ebcb8b));
        box-shadow: 0 0 6px rgba(235, 203, 139, 0.3);
      }

      .instrument-tile__bar-fill[data-level='danger'] {
        background: linear-gradient(90deg, var(--danger, #f06352), color-mix(in srgb, var(--danger, #f06352) 80%, #bf616a));
        box-shadow: 0 0 6px rgba(191, 97, 106, 0.3);
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

    this.sub = this.store.observe<unknown>(this.config.path).subscribe({
      next: (dp) => {
        if (!dp) {
          this.quality = 'missing';
          this.rawValue = null;
          return;
        }
        const val = this.extractNumericValue(dp.value);
        if (val === null) {
          this.quality = 'missing';
          this.rawValue = null;
          return;
        }
        this.rawValue = this.toDisplayUnits(val);
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

  private extractNumericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (this.config.path !== PATHS.navigation.attitude || !value || typeof value !== 'object') {
      return null;
    }

    const attitude = value as { roll?: unknown; pitch?: unknown; yaw?: unknown };
    const component =
      this.config.id === 'heel'
        ? attitude.roll
        : this.config.id === 'pitch'
          ? attitude.pitch
          : attitude.yaw;

    if (typeof component !== 'number' || !Number.isFinite(component)) {
      return null;
    }

    return component;
  }

  private toDisplayUnits(value: number): number {
    const unit = this.config.unit.trim().toLowerCase();
    if (unit.includes('°')) {
      const deg = (value * 180) / Math.PI;
      if (this.config.minValue === 0 && this.config.maxValue === 360) {
        return this.normalizeHeadingDegrees(deg);
      }
      return deg;
    }
    if (unit === 'kts' || unit === 'kt' || unit === 'kn') {
      return value * 1.94384;
    }
    return value;
  }

  private normalizeHeadingDegrees(value: number): number {
    let deg = value;
    deg %= 360;
    if (deg < 0) {
      deg += 360;
    }
    return deg;
  }
}
