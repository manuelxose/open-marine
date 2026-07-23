import { Component, ChangeDetectionStrategy, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SimulationFacadeService } from '../../../features/diagnostics/simulation-facade.service';

/**
 * Persistent, cross-page "simulation running" indicator with a one-click abort.
 * The Diagnostics page starts environment-only scenarios (motor/wind/current);
 * the operator then engages the autopilot manually from the Autopilot page and
 * watches the vessel on the Chart — this banner is what lets them stop the
 * environment simulation from wherever they end up, not just from Diagnostics.
 */
@Component({
  selector: 'app-simulation-run-banner',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm(); as vm) {
      <div class="sim-run-banner" [class.sim-run-banner--chip]="variant === 'chip'" role="status">
        <span class="sim-run-banner__dot"></span>
        <span class="sim-run-banner__label">{{ 'simulation.run_banner.running' | translate }}</span>
        <span class="sim-run-banner__name">{{ vm.name }}</span>
        <span class="sim-run-banner__time">{{ vm.elapsed }}</span>
        <button type="button" class="sim-run-banner__abort" (click)="abort()">
          {{ 'simulation.run_banner.abort' | translate }}
        </button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .sim-run-banner {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: 36px;
      padding: 0 var(--space-4);
      background: var(--gb-alarm-info-bg);
      border-bottom: 1px solid var(--gb-alarm-info-border);
    }
    .sim-run-banner--chip {
      height: 32px;
      max-width: 280px;
      margin-top: var(--space-2);
      padding: 0 var(--space-3);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-md);
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      box-shadow: var(--chart-overlay-shadow);
    }
    .sim-run-banner__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--gb-data-good);
      flex-shrink: 0;
    }
    .sim-run-banner__label {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--gb-text-muted);
    }
    .sim-run-banner__name {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gb-text-value);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sim-run-banner__time {
      font-family: var(--font-mono, monospace);
      font-variant-numeric: tabular-nums;
      font-size: 0.75rem;
      color: var(--gb-text-muted);
    }
    .sim-run-banner__abort {
      height: 26px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-sm, 4px);
      border: 1px solid var(--gb-data-stale);
      color: var(--gb-data-stale);
      background: transparent;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      cursor: pointer;
    }
    .sim-run-banner__abort:hover { background: var(--gb-alarm-emergency-bg); }
  `],
})
export class SimulationRunBannerComponent {
  /** 'bar' (default): full-width strip for the app shell. 'chip': compact floating card for the chart overlay. */
  @Input() variant: 'bar' | 'chip' = 'bar';

  private readonly facade = inject(SimulationFacadeService);

  readonly vm = computed(() => {
    const run = this.facade.activeRun();
    if (!run || run.status !== 'running') return null;
    const scenario = this.facade.scenarios().find((item) => item.id === run.scenarioId);
    const totalSeconds = Math.max(0, Math.floor(run.simulatedTimeMs / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return {
      name: scenario?.name ?? run.scenarioId,
      elapsed: `${minutes}:${seconds}`,
    };
  });

  abort(): void {
    void this.facade.abortActiveRun();
  }
}
