import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import type { HistoryPoint } from '../../../state/datapoints/datapoint.models';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

interface MeteoView {
  pressure: number;
  pressureDisplay: string;
  quality: DataQuality;
  isStale: boolean;
  age: number | null;
  source: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-meteo-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  templateUrl: './meteo-widget.component.html',
  styleUrls: ['./meteo-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeteoWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly qualityService = inject(DataQualityService);
  private readonly PRESSURE_PATH = 'environment.outside.pressure';
  private readonly ticker$ = timer(0, 1000);

  private readonly pressurePoint$ = this.store.observe<number>(this.PRESSURE_PATH).pipe(startWith(undefined));

  readonly view = toSignal(
    combineLatest([this.pressurePoint$, this.ticker$]).pipe(
      map(([point]) => {
        if (!point || typeof point.value !== 'number') {
          return {
            pressure: 1013,
            pressureDisplay: '---',
            quality: 'missing',
            isStale: true,
            age: null,
            source: '',
            ariaLabel: 'Meteo pressure. Data unavailable.',
          } satisfies MeteoView;
        }

        const pressure = point.value / 100;
        const quality = this.qualityService.getQuality(point.timestamp);
        const isStale = quality === 'stale' || quality === 'missing';
        const pressureDisplay = isStale ? '---' : pressure.toFixed(0);

        return {
          pressure,
          pressureDisplay,
          quality,
          isStale,
          age: (Date.now() - point.timestamp) / 1000,
          source: point.source ?? '',
          ariaLabel: isStale ? 'Meteo pressure. Data stale.' : `Meteo pressure ${pressureDisplay} hectopascals.`,
        } satisfies MeteoView;
      }),
    ),
    {
      initialValue: {
        pressure: 1013,
        pressureDisplay: '---',
        quality: 'missing',
        isStale: true,
        age: null,
        source: '',
        ariaLabel: 'Meteo pressure. Data unavailable.',
      } satisfies MeteoView,
    },
  );

  readonly history = toSignal(
    this.store.series$(this.PRESSURE_PATH, 12 * 60 * 60).pipe(
      map((points: HistoryPoint[]) => points.map((p) => ({ ...p, value: p.value / 100 }))),
    ),
    { initialValue: [] as HistoryPoint[] },
  );

  readonly trend = computed(() => {
    const points = this.history();
    if (points.length < 2) {
      return 0;
    }
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) {
      return 0;
    }
    return last.value - first.value;
  });

  readonly sparklinePath = computed(() => {
    const points = this.history();
    if (!points || points.length < 2) {
      return 'M0,40 L100,40 Z';
    }

    const width = 100;
    const height = 40;

    const values = points.map((p) => p.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    const padding = (maxVal - minVal) * 0.1 || 1;
    minVal -= padding;
    maxVal += padding;
    const range = maxVal - minVal;

    const now = Date.now();
    const windowMs = 12 * 60 * 60 * 1000;
    const startTime = now - windowMs;

    const coords = points.map((p) => {
      const x = Math.max(0, Math.min(width, ((p.timestamp - startTime) / windowMs) * width));
      const normalizedVal = (p.value - minVal) / range;
      const y = height - normalizedVal * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const line = coords.length > 0 ? `M ${coords.join(' L ')}` : 'M0,40';
    return `${line} L ${width},${height} L 0,${height} Z`;
  });
}
