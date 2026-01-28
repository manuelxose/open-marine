import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, combineLatest, timer, startWith } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';
import { formatSpeed } from '../../../core/formatting/formatters';
import { PreferencesService } from '../../../core/services/preferences.service';

@Component({
  selector: 'app-sog-instrument',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="SOG"
      [value]="view().value"
      [unit]="view().unit"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
    ></app-instrument-card>
  `
})
export class SogInstrumentComponent {
  private store = inject(DatapointStoreService);
  private prefs = inject(PreferencesService);
  
  // Create a 250ms ticker for age updates
  private ticker$ = timer(0, 250);

  private point$ = this.store.observe<number>(PATHS.navigation.speedOverGround);

  // Combine data + ticker + prefs to update age and formatted value
  vm$ = combineLatest([
    this.point$.pipe(startWith(undefined)),
    this.ticker$,
    this.prefs.prefs$
  ]).pipe(
    map(([point, , prefs]) => {
      if (!point) {
        return {
          value: '--',
          unit: prefs.speedUnit,
          quality: 'bad' as DataQuality,
          age: null,
          source: ''
        };
      }

      const now = Date.now();
      const age = (now - point.timestamp) / 1000;
      
      let quality: DataQuality = 'good';
      if (age > 2) quality = 'warn';
      if (age > 5) quality = 'bad';

      const { value, unit } = formatSpeed(point.value, prefs.speedUnit);

      return {
        value,
        unit,
        quality,
        age,
        source: point.source
      };
    })
  );

  // Expose as Signal for template (optional, but clean)
  view = toSignal(this.vm$, { 
    initialValue: { value: '--', unit: 'kn', quality: 'bad' as DataQuality, age: null, source: '' } 
  });
}
