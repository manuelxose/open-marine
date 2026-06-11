import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { formatDepth } from '../../../core/formatting/formatters';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

interface DepthView {
  depthValue: string;
  depthUnit: string;
  quality: DataQuality;
  isStale: boolean;
  age: number | null;
  source: string;
  barHeight: number;
  isShallow: boolean;
  ariaLabel: string;
}

@Component({
  selector: 'app-depth-gauge-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './depth-gauge-widget.component.html',
  styleUrls: ['./depth-gauge-widget.component.scss'],
})
export class DepthGaugeWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  @Input() unit: 'm' | 'ft' = 'm';
  @Input() shallowThreshold = 3;

  private readonly depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer).pipe(startWith(undefined));

  private readonly vm$ = combineLatest([this.depth$, this.ticker$]).pipe(
    map(([depthPoint]) => {
      if (!depthPoint || typeof depthPoint.value !== 'number') {
        return {
          depthValue: '--',
          depthUnit: this.unit,
          quality: 'missing',
          isStale: true,
          age: null,
          source: '',
          barHeight: 0,
          isShallow: false,
          ariaLabel: 'Depth gauge. Data unavailable.',
        } satisfies DepthView;
      }

      const age = (Date.now() - depthPoint.timestamp) / 1000;
      const formatted = formatDepth(depthPoint.value, this.unit);
      const valueNum = Number(formatted.value);
      const barHeight = (this.toPercent(valueNum) / 100) * 140;
      const threshold = this.shallowThreshold || 0;
      const quality = this.quality.getQuality(depthPoint.timestamp);
      const isStale = quality === 'stale' || quality === 'missing';
      const depthValue = isStale ? '---' : formatted.value;
      const depthUnit = formatted.unit;

      return {
        depthValue,
        depthUnit,
        quality,
        isStale,
        age,
        source: depthPoint.source ?? '',
        barHeight,
        isShallow: !isStale && threshold > 0 && valueNum <= threshold,
        ariaLabel: isStale
          ? 'Depth gauge. Data stale.'
          : `Depth gauge. ${depthValue} ${depthUnit}.`,
      } satisfies DepthView;
    }),
  );

  readonly view = toSignal(this.vm$, {
    initialValue: {
      depthValue: '--',
      depthUnit: this.unit,
      quality: 'missing',
      isStale: true,
      age: null,
      source: '',
      barHeight: 0,
      isShallow: false,
      ariaLabel: 'Depth gauge. Data unavailable.',
    } satisfies DepthView,
  });

  private toPercent(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    const max = this.unit === 'ft' ? 120 : 40;
    return Math.min(100, (value / max) * 100);
  }
}
