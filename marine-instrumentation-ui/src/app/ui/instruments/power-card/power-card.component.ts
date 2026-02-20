import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

@Component({
  selector: 'app-power-card',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent, SparklineComponent],
  template: `
    <omi-gb-bezel class="power-card" label="POWER" [quality]="view().quality">
      <div class="power-content">
        <div class="top-row">
          <div class="metric">
            <span class="gb-instrument-label">Volts</span>
            <div class="value-row">
              <span class="gb-display-value gb-display-value--lg">{{ view().volts }}</span>
              <span class="gb-display-unit" *ngIf="view().volts !== '---'">V</span>
            </div>
          </div>

          <div class="metric metric-right">
            <span class="gb-instrument-label">Current</span>
            <div class="value-row">
              <span class="gb-display-value gb-display-value--md">{{ view().amps }}</span>
              <span class="gb-display-unit" *ngIf="view().amps !== '---'">A</span>
            </div>
          </div>
        </div>

        <div class="trend-wrap">
          <app-sparkline [data]="(history$ | async) || []" colorClass="text-warning"></app-sparkline>
        </div>

        <div class="meta-row">
          <span class="gb-instrument-label" *ngIf="view().source">{{ view().source }}</span>
          <span class="gb-display-unit" *ngIf="view().age !== null">{{ view().age | number:'1.1-1' }}s</span>
        </div>
      </div>
    </omi-gb-bezel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .power-card {
        display: block;
        height: 100%;
      }

      .power-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
        width: 100%;
      }

      .top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }

      .metric {
        display: flex;
        flex-direction: column;
      }

      .metric-right {
        align-items: flex-end;
      }

      .value-row {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
      }

      .trend-wrap {
        height: 34px;
        width: 100%;
      }

      .meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PowerCardComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly qualityService = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  private readonly volts$ = this.store.observe<number>(PATHS.electrical.batteries.house.voltage).pipe(startWith(undefined));
  private readonly amps$ = this.store.observe<number>(PATHS.electrical.batteries.house.current).pipe(startWith(undefined));
  readonly history$ = this.store.observeHistory(PATHS.electrical.batteries.house.voltage);

  readonly view = toSignal(
    combineLatest([this.volts$, this.amps$, this.ticker$]).pipe(
      map(([volts, amps]) => {
        const source = volts?.source ?? amps?.source ?? '';
        const timestamp = Math.max(volts?.timestamp ?? 0, amps?.timestamp ?? 0);
        const quality = this.qualityService.getQuality(timestamp || null);
        const isStale = quality === 'stale' || quality === 'missing';
        const voltsValue = volts && typeof volts.value === 'number' ? volts.value.toFixed(2) : '--.--';
        const ampsValue = amps && typeof amps.value === 'number' ? amps.value.toFixed(1) : '--.-';

        return {
          volts: isStale ? '---' : voltsValue,
          amps: isStale ? '---' : ampsValue,
          quality,
          age: timestamp > 0 ? (Date.now() - timestamp) / 1000 : null,
          source,
        } as { volts: string; amps: string; quality: DataQuality; age: number | null; source: string };
      }),
    ),
    {
      initialValue: {
        volts: '---',
        amps: '---',
        quality: 'missing' as DataQuality,
        age: null,
        source: '',
      },
    },
  );
}
