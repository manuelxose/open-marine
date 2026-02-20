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
  selector: 'app-wind-card',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent, SparklineComponent],
  template: `
    <omi-gb-bezel class="wind-card" label="WIND" [quality]="view().quality">
      <div class="wind-content">
        <div class="top-grid">
          <div class="cell">
            <span class="gb-instrument-label">AWS</span>
            <div class="value-row">
              <span class="gb-display-value gb-display-value--lg">{{ view().aws }}</span>
              <span class="gb-display-unit" *ngIf="view().aws !== '---'">kn</span>
            </div>
          </div>
          <div class="cell cell-right">
            <span class="gb-instrument-label">AWA</span>
            <div class="value-row">
              <span class="gb-display-value gb-display-value--md">{{ view().awa }}</span>
              <span class="gb-display-unit" *ngIf="view().awa !== '---'">&#176;</span>
            </div>
          </div>
        </div>

        <div class="trend-wrap">
          <app-sparkline [data]="(awsHistory$ | async) || []" colorClass="text-accent"></app-sparkline>
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

      .wind-card {
        display: block;
        height: 100%;
      }

      .wind-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
        width: 100%;
      }

      .top-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .cell {
        display: flex;
        flex-direction: column;
      }

      .cell-right {
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
export class WindCardComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly qualityService = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  private readonly aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent).pipe(startWith(undefined));
  private readonly awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent).pipe(startWith(undefined));

  readonly awsHistory$ = this.store.observeHistory(PATHS.environment.wind.speedApparent);

  readonly view = toSignal(
    combineLatest([this.aws$, this.awa$, this.ticker$]).pipe(
      map(([aws, awa]) => {
        const source = aws?.source ?? awa?.source ?? '';
        const timestamp = Math.max(aws?.timestamp ?? 0, awa?.timestamp ?? 0);
        const quality = this.qualityService.getQuality(timestamp || null);
        const isStale = quality === 'stale' || quality === 'missing';
        const awsKn = aws && typeof aws.value === 'number' ? aws.value * 1.94384 : null;
        const awaDeg = awa && typeof awa.value === 'number' ? this.radToDeg(awa.value) : null;

        return {
          aws: isStale || awsKn === null ? '---' : awsKn.toFixed(1),
          awa: isStale || awaDeg === null ? '---' : Math.round(awaDeg).toString(),
          quality,
          age: timestamp > 0 ? (Date.now() - timestamp) / 1000 : null,
          source,
        } as { aws: string; awa: string; quality: DataQuality; age: number | null; source: string };
      }),
    ),
    {
      initialValue: {
        aws: '---',
        awa: '---',
        quality: 'missing' as DataQuality,
        age: null,
        source: '',
      },
    },
  );

  private radToDeg(rad: number): number {
    let deg = (rad * 180) / Math.PI;
    deg %= 360;
    if (deg < 0) {
      deg += 360;
    }
    return deg;
  }
}
