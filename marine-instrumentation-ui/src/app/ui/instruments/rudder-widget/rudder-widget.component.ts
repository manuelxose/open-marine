import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

const radToDeg = (value: number): number => (value * 180) / Math.PI;

interface RudderView {
  angleDegrees: number;
  absAngle: number;
  angleDisplay: string;
  side: 'PORT' | 'STBD' | 'CENTER';
  quality: DataQuality;
  isStale: boolean;
  source: string;
  age: number | null;
  ariaLabel: string;
}

@Component({
  selector: 'app-rudder-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rudder-widget.component.html',
  styleUrls: ['./rudder-widget.component.scss'],
})
export class RudderWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  private readonly rudder$ = this.store.observe<number>(PATHS.steering.rudderAngle).pipe(startWith(undefined));

  readonly view = toSignal(
    combineLatest([this.rudder$, this.ticker$]).pipe(
      map(([point]) => {
        if (!point || typeof point.value !== 'number') {
          return {
            angleDegrees: 0,
            absAngle: 0,
            angleDisplay: '---',
            side: 'CENTER',
            quality: 'missing',
            isStale: true,
            age: null,
            source: '',
            ariaLabel: 'Rudder angle. Data unavailable.',
          } satisfies RudderView;
        }

        const age = (Date.now() - point.timestamp) / 1000;
        const degrees = radToDeg(point.value);
        const side = Math.abs(degrees) < 0.5 ? 'CENTER' : degrees < 0 ? 'PORT' : 'STBD';
        const quality = this.quality.getQuality(point.timestamp);
        const isStale = quality === 'stale' || quality === 'missing';
        const absAngle = Math.abs(degrees);
        const angleDisplay = isStale ? '---' : absAngle.toFixed(1);

        return {
          angleDegrees: degrees,
          absAngle,
          angleDisplay,
          side,
          quality,
          isStale,
          source: point.source ?? '',
          age,
          ariaLabel: isStale
            ? 'Rudder angle. Data stale.'
            : `Rudder angle ${angleDisplay} degrees ${side.toLowerCase()}.`,
        } satisfies RudderView;
      }),
    ),
    {
      initialValue: {
        angleDegrees: 0,
        absAngle: 0,
        angleDisplay: '---',
        side: 'CENTER',
        quality: 'missing',
        isStale: true,
        age: null,
        source: '',
        ariaLabel: 'Rudder angle. Data unavailable.',
      } satisfies RudderView,
    },
  );

  getRotationTransform(degrees: number): string {
    const visualAngle = Math.max(-50, Math.min(50, degrees));
    return `rotate(${visualAngle}, 100, 110)`;
  }
}
