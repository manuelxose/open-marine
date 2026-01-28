import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, combineLatest, timer, startWith } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';
import { formatDepth } from '../../../core/formatting/formatters';
import { PreferencesService } from '../../../core/services/preferences.service';

@Component({
  selector: 'app-depth-instrument',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="Depth"
      [value]="view().value"
      [unit]="view().unit"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
    ></app-instrument-card>
  `
})
export class DepthInstrumentComponent {
  private store = inject(DatapointStoreService);
  private prefs = inject(PreferencesService);
  private ticker$ = timer(0, 500);
  private point$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);

  vm$ = combineLatest([
    this.point$.pipe(startWith(undefined)),
    this.ticker$,
    this.prefs.prefs$
  ]).pipe(
    map(([point, , prefs]) => {
      if (!point) return { value: '--', unit: prefs.depthUnit, quality: 'bad' as DataQuality, age: null, source: '' };

      const now = Date.now();
      const age = (now - point.timestamp) / 1000;
      let quality: DataQuality = 'good';
      if (age > 2) quality = 'warn';
      if (age > 5) quality = 'bad';

      const { value, unit } = formatDepth(point.value, prefs.depthUnit);

      return { value, unit, quality, age, source: point.source };
    })
  );

  view = toSignal(this.vm$, { 
    initialValue: { value: '--', unit: 'm', quality: 'bad', age: null, source: '' } 
  });
}
