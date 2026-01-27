import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, combineLatest, timer, startWith } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';
import { formatAngleDegrees } from '../../../core/formatting/formatters';

@Component({
  selector: 'app-heading-instrument',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="Heading"
      [value]="view().value"
      [unit]="view().unit"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
    ></app-instrument-card>
  `
})
export class HeadingInstrumentComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 500);
  private point$ = this.store.observe<number>('navigation.headingMagnetic');

  vm$ = combineLatest([
    this.point$.pipe(startWith(undefined)),
    this.ticker$
  ]).pipe(
    map(([point]) => {
      if (!point) return { value: '--', unit: '°', quality: 'bad' as DataQuality, age: null, source: '' };

      const now = Date.now();
      const age = (now - point.timestamp) / 1000;
      let quality: DataQuality = 'good';
      if (age > 2) quality = 'warn';
      if (age > 5) quality = 'bad';

      const { value, unit } = formatAngleDegrees(point.value);

      return { value, unit, quality, age, source: point.source };
    })
  );

  view = toSignal(this.vm$, { 
    initialValue: { value: '--', unit: '°', quality: 'bad', age: null, source: '' } 
  });
}
