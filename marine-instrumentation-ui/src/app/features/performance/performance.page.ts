import { Component, ChangeDetectionStrategy, inject  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceService } from './performance.service';
import { parsePolarCSV } from './utils/polar-parser';

@Component({
  selector: 'app-performance-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="perf-page">
      <div class="page-header">
        <h1>Performance</h1>
        <p class="subtitle">Sailing performance analysis and polar tracking</p>
      </div>

      <ng-container *ngIf="perf$ | async as perf">
        <!-- No polar loaded -->
        <div class="perf-empty" *ngIf="!perf.hasPolar">
          <div class="empty-card">
            <span class="empty-icon">📊</span>
            <h2>No Polar Diagram Loaded</h2>
            <p>
              Import a polar diagram (CSV format) to enable performance tracking.
              Polars define your vessel's target speed at each wind angle and speed.
            </p>
            <label class="import-btn" for="polar-upload">
              Import Polar CSV
              <input
                id="polar-upload"
                type="file"
                accept=".csv,.pol,.txt"
                (change)="onPolarFileSelected($event)"
                hidden
              />
            </label>
          </div>

          <!-- Basic VMG (no polar needed) -->
          <div class="metrics-card" *ngIf="perf.currentVmg !== null">
            <h3>Current VMG</h3>
            <div class="metric-row">
              <span class="metric-value">{{ perf.currentVmg | number: '1.1-1' }}</span>
              <span class="metric-unit">kts</span>
            </div>
          </div>
        </div>

        <!-- Polar loaded - full performance view -->
        <div class="perf-grid" *ngIf="perf.hasPolar">
          <!-- VMG Card -->
          <div class="perf-card perf-card--vmg">
            <h3>VMG</h3>
            <div class="vmg-row">
              <div class="vmg-item">
                <span class="vmg-label">Current</span>
                <span class="vmg-value">
                  {{ perf.currentVmg !== null ? (perf.currentVmg | number: '1.1-1') : '---' }}
                </span>
                <span class="vmg-unit">kts</span>
              </div>
              <div class="vmg-item">
                <span class="vmg-label">Upwind Max</span>
                <span class="vmg-value">
                  {{ perf.vmgUpwind !== null ? (perf.vmgUpwind | number: '1.1-1') : '---' }}
                </span>
                <span class="vmg-unit">kts</span>
              </div>
              <div class="vmg-item">
                <span class="vmg-label">Downwind Max</span>
                <span class="vmg-value">
                  {{ perf.vmgDownwind !== null ? (perf.vmgDownwind | number: '1.1-1') : '---' }}
                </span>
                <span class="vmg-unit">kts</span>
              </div>
            </div>
          </div>

          <!-- Polar Ratio Card -->
          <div class="perf-card perf-card--ratio">
            <h3>Polar Performance</h3>
            <div class="ratio-display">
              <span class="ratio-value" [attr.data-level]="ratioLevel(perf.polarRatio)">
                {{ perf.polarRatio !== null ? (perf.polarRatio | number: '1.0-0') : '---' }}
              </span>
              <span class="ratio-unit">%</span>
            </div>
            <div class="ratio-bar-track">
              <div
                class="ratio-bar-fill"
                [style.width.%]="perf.polarRatio ?? 0"
                [attr.data-level]="ratioLevel(perf.polarRatio)"
              ></div>
            </div>
            <div class="ratio-meta">
              <span *ngIf="perf.polarTarget !== null">
                Target: {{ perf.polarTarget | number: '1.1-1' }} kts
              </span>
            </div>
          </div>

          <!-- Target TWA Card -->
          <div class="perf-card perf-card--target">
            <h3>Optimal TWA</h3>
            <div class="target-display">
              <span class="target-value">
                {{ perf.targetTwa !== null ? (perf.targetTwa | number: '1.0-0') : '---' }}°
              </span>
            </div>
            <div class="recommendation" *ngIf="perf.recommendation">
              💡 {{ perf.recommendation }}
            </div>
          </div>

          <!-- Polar Management -->
          <div class="perf-card perf-card--manage">
            <h3>Polar Diagram</h3>
            <div class="polar-info" *ngIf="polar$ | async as polar">
              <p><strong>{{ polar.vesselName }}</strong></p>
              <p>{{ polar.twsValues.length }} wind speeds × {{ polar.twaValues.length }} angles</p>
            </div>
            <div class="polar-actions">
              <label class="action-btn" for="polar-replace">
                Replace Polar
                <input
                  id="polar-replace"
                  type="file"
                  accept=".csv,.pol,.txt"
                  (change)="onPolarFileSelected($event)"
                  hidden
                />
              </label>
              <button class="action-btn action-btn--danger" (click)="clearPolar()">
                Remove Polar
              </button>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        overflow-y: auto;
        background: var(--bg);
      }

      .perf-page {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        margin-bottom: 2rem;
      }

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text-1);
        margin-bottom: 0.25rem;
      }

      .subtitle {
        color: var(--text-2);
        font-size: 0.95rem;
      }

      /* ── Empty state ─────────────────────────────────── */

      .perf-empty {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        align-items: center;
      }

      .empty-card {
        background: var(--surface-1);
        border: 1px dashed var(--border);
        border-radius: 16px;
        padding: 3rem 2rem;
        text-align: center;
        max-width: 500px;
        width: 100%;
      }

      .empty-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
      }

      .empty-card h2 {
        font-size: 1.25rem;
        color: var(--text-1);
        margin-bottom: 0.5rem;
      }

      .empty-card p {
        color: var(--text-2);
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 1.5rem;
      }

      .import-btn,
      .action-btn {
        display: inline-block;
        padding: 0.6rem 1.5rem;
        background: var(--accent, #5ba4cf);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: opacity 0.2s;
      }

      .import-btn:hover,
      .action-btn:hover {
        opacity: 0.85;
      }

      .action-btn--danger {
        background: var(--status-offline, #f06352);
      }

      /* ── Grid ─────────────────────────────────────── */

      .perf-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .perf-card {
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: var(--shadow);
      }

      .perf-card h3 {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-2);
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
      }

      /* ── VMG ──────────────────────────────────────── */

      .vmg-row {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .vmg-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .vmg-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        color: var(--text-2);
        letter-spacing: 0.08em;
      }

      .vmg-value {
        font-size: 1.5rem;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        color: var(--text-1);
      }

      .vmg-unit {
        font-size: 0.7rem;
        color: var(--text-2);
      }

      /* ── Ratio ────────────────────────────────────── */

      .ratio-display {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
      }

      .ratio-value {
        font-size: 2.5rem;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        color: var(--text-1);
      }

      .ratio-value[data-level='good'] {
        color: var(--status-online, #2ec25c);
      }

      .ratio-value[data-level='ok'] {
        color: var(--accent, #5ba4cf);
      }

      .ratio-value[data-level='low'] {
        color: #f3b13f;
      }

      .ratio-unit {
        font-size: 1rem;
        color: var(--text-2);
      }

      .ratio-bar-track {
        height: 6px;
        background: var(--surface-2);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }

      .ratio-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
        background: var(--accent, #5ba4cf);
      }

      .ratio-bar-fill[data-level='good'] {
        background: var(--status-online, #2ec25c);
      }

      .ratio-bar-fill[data-level='low'] {
        background: #f3b13f;
      }

      .ratio-meta {
        font-size: 0.8rem;
        color: var(--text-2);
      }

      /* ── Target TWA ───────────────────────────────── */

      .target-display {
        text-align: center;
        margin-bottom: 1rem;
      }

      .target-value {
        font-size: 2.5rem;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
        color: var(--text-1);
      }

      .recommendation {
        padding: 0.75rem 1rem;
        background: rgba(91, 164, 207, 0.1);
        border: 1px solid rgba(91, 164, 207, 0.3);
        border-radius: 8px;
        font-size: 0.9rem;
        color: var(--text-1);
        text-align: center;
      }

      /* ── Polar management ─────────────────────────── */

      .polar-info {
        margin-bottom: 1rem;
      }

      .polar-info p {
        color: var(--text-2);
        font-size: 0.85rem;
        margin: 0.25rem 0;
      }

      .polar-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .metrics-card {
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
        width: 100%;
        max-width: 500px;
        box-shadow: var(--shadow);
      }

      .metrics-card h3 {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-2);
        margin-bottom: 0.75rem;
      }

      .metric-row {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }

      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        color: var(--text-1);
      }

      .metric-unit {
        font-size: 0.8rem;
        color: var(--text-2);
      }

      @media (max-width: 768px) {
        .perf-grid {
          grid-template-columns: 1fr;
        }

        .perf-page {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class PerformancePage {
  private readonly perfService = inject(PerformanceService);

  readonly perf$ = this.perfService.performance$;
  readonly polar$ = this.perfService.polar$;

  ratioLevel(ratio: number | null): string {
    if (ratio === null) return 'ok';
    if (ratio >= 95) return 'good';
    if (ratio >= 70) return 'ok';
    return 'low';
  }

  onPolarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        const polar = parsePolarCSV(content, file.name.replace(/\.[^.]+$/, ''));
        this.perfService.setPolar(polar);
      } catch (err) {
        console.error('[Performance] Failed to parse polar file:', err);
      }
    };
    reader.readAsText(file);
  }

  clearPolar(): void {
    this.perfService.clearPolar();
  }
}
