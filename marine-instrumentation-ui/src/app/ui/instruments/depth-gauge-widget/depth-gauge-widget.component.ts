import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith, timer, combineLatest } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';
import { formatDepth } from '../../../core/formatting/formatters';

interface DepthView {
  depthValue: string;
  depthUnit: string;
  quality: DataQuality;
  age: number | null;
  source: string;
  percent: number;
  isShallow: boolean;
}

@Component({
  selector: 'app-depth-gauge-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="Depth"
      [value]="'--'"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
    >
      <div class="depth-gauge">
        <div class="gauge-track">
          <div
            class="gauge-fill"
            [class.shallow]="view().isShallow"
            [style.height.%]="view().percent"
          ></div>
        </div>
        <div class="depth-readout">
          <span class="value">{{ view().depthValue }}</span>
          <span class="unit">{{ view().depthUnit }}</span>
        </div>
      </div>
      <div class="depth-threshold" *ngIf="shallowThreshold">
        Shallow threshold: {{ shallowThreshold }} {{ unit }}
      </div>
    </app-instrument-card>
  `,
  styleUrls: ['./depth-gauge-widget.component.scss'],
})
export class DepthGaugeWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 500);

  @Input() unit: 'm' | 'ft' = 'm';
  @Input() shallowThreshold = 3;

  private depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);

  private vm$ = combineLatest([
    this.depth$.pipe(startWith(undefined)),
    this.ticker$,
  ]).pipe(
    map(([depthPoint]) => {
      if (!depthPoint) {
        return {
          depthValue: '--',
          depthUnit: this.unit,
          quality: 'bad',
          age: null,
          source: '',
          percent: 0,
          isShallow: false,
        } as DepthView;
      }

      const now = Date.now();
      const age = (now - depthPoint.timestamp) / 1000;
      let quality: DataQuality = 'good';
      if (age > 2) quality = 'warn';
      if (age > 5) quality = 'bad';

      const formatted = formatDepth(depthPoint.value, this.unit);
      const valueNum = Number(formatted.value);
      const percent = this.toPercent(valueNum);
      const threshold = this.shallowThreshold || 0;

      return {
        depthValue: formatted.value,
        depthUnit: formatted.unit,
        quality,
        age,
        source: depthPoint.source,
        percent,
        isShallow: threshold > 0 && valueNum <= threshold,
      } as DepthView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: {
      depthValue: '--',
      depthUnit: this.unit,
      quality: 'bad',
      age: null,
      source: '',
      percent: 0,
      isShallow: false,
    },
  });

  private toPercent(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const max = this.unit === 'ft' ? 120 : 40;
    return Math.min(100, (value / max) * 100);
  }
}
