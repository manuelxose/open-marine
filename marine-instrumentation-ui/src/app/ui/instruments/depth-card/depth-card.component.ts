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
  selector: 'app-depth-card',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent, SparklineComponent],
  template: `
    <omi-gb-bezel class="depth-card" label="DEPTH" [quality]="view().quality">
      <div class="depth-content">
        <div class="value-row">
          <span class="gb-display-value gb-display-value--xl">{{ view().value }}</span>
          <span class="gb-display-unit" *ngIf="view().value !== '---'">m</span>
        </div>

        <div class="trend-wrap">
          <app-sparkline [data]="(history$ | async) || []" colorClass="text-accent"></app-sparkline>
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

      .depth-card {
        display: block;
        height: 100%;
      }

      .depth-content {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        width: 100%;
      }

      .value-row {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 0.35rem;
      }

      .trend-wrap {
        height: 40px;
        width: 100%;
      }

      .meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepthCardComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly qualityService = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  private readonly depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer).pipe(startWith(undefined));
  readonly history$ = this.store.observeHistory(PATHS.environment.depth.belowTransducer);

  readonly view = toSignal(
    combineLatest([this.depth$, this.ticker$]).pipe(
      map(([point]) => {
        if (!point || typeof point.value !== 'number') {
          return {
            value: '---',
            quality: 'missing',
            age: null,
            source: '',
          } as { value: string; quality: DataQuality; age: number | null; source: string };
        }

        const quality = this.qualityService.getQuality(point.timestamp);
        const value = quality === 'stale' || quality === 'missing' ? '---' : point.value.toFixed(1);

        return {
          value,
          quality,
          age: (Date.now() - point.timestamp) / 1000,
          source: point.source ?? '',
        };
      }),
    ),
    {
      initialValue: {
        value: '---',
        quality: 'missing' as DataQuality,
        age: null,
        source: '',
      },
    },
  );
}
