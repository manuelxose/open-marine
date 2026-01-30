import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';
import { formatAngleDegrees } from '../../../core/formatting/formatters';

interface CompassView {
  headingDeg: number | null;
  value: string;
  unit: string;
  quality: DataQuality;
  age: number | null;
  source: string;
}

@Component({
  selector: 'app-compass-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="Compass"
      [value]="'--'"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
    >
      <div class="compass">
        <div class="compass-ring"></div>
        <div class="compass-label north">N</div>
        <div class="compass-label east">E</div>
        <div class="compass-label south">S</div>
        <div class="compass-label west">W</div>

        <div
          class="compass-needle"
          [style.transform]="view().headingDeg === null ? 'rotate(0deg)' : 'rotate(' + view().headingDeg + 'deg)'"
        ></div>
        <div class="compass-center"></div>

        <div class="compass-readout">
          <span class="value">{{ view().value }}</span>
          <span class="unit">{{ view().unit }}</span>
        </div>
      </div>
    </app-instrument-card>
  `,
  styleUrls: ['./compass-widget.component.scss'],
})
export class CompassWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 500);
  private headingTrue$ = this.store.observe<number>(PATHS.navigation.headingTrue);
  private headingMag$ = this.store.observe<number>(PATHS.navigation.headingMagnetic);

  private vm$ = combineLatest([
    this.headingTrue$.pipe(startWith(undefined)),
    this.headingMag$.pipe(startWith(undefined)),
    this.ticker$,
  ]).pipe(
    map(([headingTrue, headingMag]) => {
      const point = headingTrue ?? headingMag;
      if (!point) {
        return { headingDeg: null, value: '--', unit: 'deg', quality: 'bad', age: null, source: '' } as CompassView;
      }

      const now = Date.now();
      const age = (now - point.timestamp) / 1000;
      let quality: DataQuality = 'good';
      if (age > 2) quality = 'warn';
      if (age > 5) quality = 'bad';

      const formatted = formatAngleDegrees(point.value);
      const headingDeg = this.toDegrees(point.value);

      return {
        headingDeg,
        value: formatted.value,
        unit: formatted.unit,
        quality,
        age,
        source: point.source,
      } as CompassView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: { headingDeg: null, value: '--', unit: 'deg', quality: 'bad', age: null, source: '' },
  });

  private toDegrees(radians: number): number {
    let degrees = (radians * 180) / Math.PI;
    degrees = degrees % 360;
    if (degrees < 0) degrees += 360;
    return degrees;
  }
}
