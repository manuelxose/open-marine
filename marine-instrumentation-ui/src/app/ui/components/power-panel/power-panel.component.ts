import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { formatCurrent, formatPower, formatVoltage } from '../../../core/formatting/formatters';
import { SparklineComponent } from '../sparkline/sparkline.component';
import { HistoryPoint } from '../../../state/datapoints/datapoint.models';

interface PowerViewModel {
  voltageValue: string;
  voltageUnit: string;
  currentValue: string;
  currentUnit: string;
  powerValue: string;
  powerUnit: string;
  ageSeconds: number | null;
  isStale: boolean;
}

@Component({
  selector: 'app-power-panel',
  standalone: true,
  imports: [CommonModule, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-card" [class.stale]="isStale()">
      <div class="panel-header">
        <div class="panel-title">Power</div>
        <div class="age-pill" [class.warn]="isStale()">
          {{ ageLabel() }}
        </div>
      </div>

      <div class="panel-body">
        <div class="primary-block">
          <div class="primary-value">
            <span class="value-large">{{ voltageValue() }}</span>
            <span class="value-unit">{{ voltageUnit() }}</span>
          </div>
          <div class="primary-label">House Voltage</div>
        </div>

        <div class="secondary-grid">
          <div class="secondary-item">
            <span class="secondary-label">Current</span>
            <div class="secondary-value">
              {{ currentValue() }}
              <span class="secondary-unit">{{ currentUnit() }}</span>
            </div>
          </div>
          <div class="secondary-item">
            <span class="secondary-label">Power</span>
            <div class="secondary-value">
              {{ powerValue() }}
              <span class="secondary-unit">{{ powerUnit() }}</span>
            </div>
          </div>
        </div>

        <div class="sparkline-container">
          <app-sparkline [data]="voltageHistory()" [height]="28" colorClass="text-warn"></app-sparkline>
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

    .panel-card.stale {
      border-color: var(--warn);
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

    .age-pill {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-2);
      background: var(--surface-2);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .age-pill.warn {
      color: var(--warn);
    }

    .panel-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .primary-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .primary-value {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .value-large {
      font-size: clamp(2.3rem, 5vw, 3rem);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
      line-height: 1;
    }

    :host-context(.compact) .value-large {
      font-size: clamp(1.9rem, 4vw, 2.5rem);
    }

    .value-unit {
      font-size: 1rem;
      color: var(--muted);
      font-weight: 600;
    }

    .primary-label {
      font-size: 0.7rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .secondary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .secondary-item {
      background: var(--surface-2);
      border-radius: 12px;
      padding: 0.5rem 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .secondary-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .secondary-value {
      font-size: 1.1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
    }

    .secondary-unit {
      font-size: 0.75rem;
      color: var(--muted);
      margin-left: 4px;
    }

    .sparkline-container {
      flex: 1;
      min-height: 28px;
      margin-top: auto;
    }
  `],
})
export class PowerPanelComponent {
  private store = inject(DatapointStoreService);

  private volts$ = this.store.observe<number>(PATHS.electrical.batteries.house.voltage);
  private amps$ = this.store.observe<number>(PATHS.electrical.batteries.house.current);
  private history$ = this.store.series$(PATHS.electrical.batteries.house.voltage, 60);
  private ticker$ = timer(0, 1000);

  private vm = toSignal(
    combineLatest([
      this.volts$.pipe(startWith(undefined)),
      this.amps$.pipe(startWith(undefined)),
      this.ticker$,
    ]).pipe(
      map(([volts, amps]) => {
        const now = Date.now();
        const ageSeconds = volts?.timestamp ? (now - volts.timestamp) / 1000 : null;
        const isStale = ageSeconds !== null && ageSeconds > 5;

        const voltage = formatVoltage(volts?.value);
        const current = formatCurrent(amps?.value);
        const powerWatts =
          typeof volts?.value === 'number' && typeof amps?.value === 'number'
            ? volts.value * amps.value
            : null;
        const power = formatPower(powerWatts);

        return {
          voltageValue: voltage.value,
          voltageUnit: voltage.unit,
          currentValue: current.value,
          currentUnit: current.unit,
          powerValue: power.value,
          powerUnit: power.unit,
          ageSeconds: ageSeconds !== null ? Math.round(ageSeconds) : null,
          isStale,
        };
      })
    ),
    {
      initialValue: {
        voltageValue: '--',
        voltageUnit: 'V',
        currentValue: '--',
        currentUnit: 'A',
        powerValue: '--',
        powerUnit: 'W',
        ageSeconds: null,
        isStale: false,
      } as PowerViewModel,
    }
  );

  voltageHistory = toSignal(this.history$, { initialValue: [] as HistoryPoint[] });

  voltageValue = computed(() => this.vm().voltageValue);
  voltageUnit = computed(() => this.vm().voltageUnit);
  currentValue = computed(() => this.vm().currentValue);
  currentUnit = computed(() => this.vm().currentUnit);
  powerValue = computed(() => this.vm().powerValue);
  powerUnit = computed(() => this.vm().powerUnit);
  isStale = computed(() => this.vm().isStale);

  ageLabel = computed(() => {
    const age = this.vm().ageSeconds;
    if (age === null) {
      return 'NO DATA';
    }
    return age > 5 ? `STALE ${age}s` : `${age}s`;
  });
}
