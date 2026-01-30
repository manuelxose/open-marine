import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';
import { formatAngleDegrees, formatSpeed } from '../../../core/formatting/formatters';

interface WindView {
  awa: string;
  aws: string;
  awaDeg: number | null;
  twa: string;
  tws: string;
  twaDeg: number | null;
  quality: DataQuality;
  age: number | null;
  source: string;
}

@Component({
  selector: 'app-wind-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="Wind"
      [value]="'--'"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
    >
      <div class="wind-rose">
        <div class="rose-ring"></div>
        <div class="rose-label north">N</div>
        <div class="rose-label east">E</div>
        <div class="rose-label south">S</div>
        <div class="rose-label west">W</div>

        <div
          class="needle apparent"
          [style.transform]="view().awaDeg === null ? 'rotate(0deg)' : 'rotate(' + view().awaDeg + 'deg)'"
        ></div>
        <div
          class="needle true"
          [style.transform]="view().twaDeg === null ? 'rotate(0deg)' : 'rotate(' + view().twaDeg + 'deg)'"
        ></div>
        <div class="rose-center"></div>
      </div>

      <div class="wind-readouts">
        <div class="readout">
          <span class="label">AWA</span>
          <span class="value">{{ view().awa }}</span>
        </div>
        <div class="readout">
          <span class="label">AWS</span>
          <span class="value">{{ view().aws }}</span>
        </div>
        <div class="readout">
          <span class="label">TWA</span>
          <span class="value">{{ view().twa }}</span>
        </div>
        <div class="readout">
          <span class="label">TWS</span>
          <span class="value">{{ view().tws }}</span>
        </div>
      </div>
    </app-instrument-card>
  `,
  styleUrls: ['./wind-widget.component.scss'],
})
export class WindWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 500);

  private awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent);
  private aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent);
  private twa$ = this.store.observe<number>(PATHS.environment.wind.angleTrueWater);
  private tws$ = this.store.observe<number>(PATHS.environment.wind.speedTrue);

  private vm$ = combineLatest([
    this.awa$.pipe(startWith(undefined)),
    this.aws$.pipe(startWith(undefined)),
    this.twa$.pipe(startWith(undefined)),
    this.tws$.pipe(startWith(undefined)),
    this.ticker$,
  ]).pipe(
    map(([awa, aws, twa, tws]) => {
      const source = awa?.source || aws?.source || twa?.source || tws?.source || '';
      const mostRecent = [awa, aws, twa, tws]
        .filter(Boolean)
        .map((p) => p!.timestamp)
        .sort((a, b) => b - a)[0];

      let quality: DataQuality = 'bad';
      let age: number | null = null;
      if (mostRecent) {
        age = (Date.now() - mostRecent) / 1000;
        quality = age <= 2 ? 'good' : age <= 5 ? 'warn' : 'bad';
      }

      const awaFormatted = formatAngleDegrees(awa?.value);
      const awsFormatted = formatSpeed(aws?.value, 'kn');
      const twaFormatted = formatAngleDegrees(twa?.value);
      const twsFormatted = formatSpeed(tws?.value, 'kn');

      return {
        awa: `${awaFormatted.value}${awaFormatted.unit}`,
        aws: `${awsFormatted.value} ${awsFormatted.unit}`,
        awaDeg: awa?.value !== undefined ? this.toDegrees(awa.value) : null,
        twa: `${twaFormatted.value}${twaFormatted.unit}`,
        tws: `${twsFormatted.value} ${twsFormatted.unit}`,
        twaDeg: twa?.value !== undefined ? this.toDegrees(twa.value) : null,
        quality,
        age,
        source,
      } as WindView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: {
      awa: '--',
      aws: '--',
      awaDeg: null,
      twa: '--',
      tws: '--',
      twaDeg: null,
      quality: 'bad',
      age: null,
      source: '',
    },
  });

  private toDegrees(radians: number): number {
    let degrees = (radians * 180) / Math.PI;
    degrees = degrees % 360;
    if (degrees < 0) degrees += 360;
    return degrees;
  }
}
