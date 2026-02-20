import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

interface RpmView {
  rpm: number;
  rpmDisplay: string;
  quality: DataQuality;
  isStale: boolean;
  source: string;
  age: number | null;
  ariaLabel: string;
}

@Component({
  selector: 'app-engine-rpm-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './engine-rpm-widget.component.html',
  styleUrls: ['./engine-rpm-widget.component.scss'],
})
export class EngineRpmWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  readonly MAX_RPM = 4000;
  readonly ARC_LENGTH = 377;

  private readonly hz$ = this.store.observe<number>(PATHS.propulsion.main.revolutions).pipe(startWith(undefined));

  readonly view = toSignal(
    combineLatest([this.hz$, this.ticker$]).pipe(
      map(([point]) => {
        if (!point || typeof point.value !== 'number') {
          return {
            rpm: 0,
            rpmDisplay: '---',
            quality: 'missing',
            isStale: true,
            source: '',
            age: null,
            ariaLabel: 'Engine RPM gauge. Data unavailable.',
          } satisfies RpmView;
        }

        const rpm = point.value * 60;
        const quality = this.quality.getQuality(point.timestamp);
        const isStale = quality === 'stale' || quality === 'missing';
        const rpmDisplay = isStale ? '---' : Math.round(rpm).toString();

        return {
          rpm,
          rpmDisplay,
          quality,
          isStale,
          source: point.source ?? '',
          age: (Date.now() - point.timestamp) / 1000,
          ariaLabel: isStale ? 'Engine RPM gauge. Data stale.' : `Engine RPM gauge ${rpmDisplay} RPM.`,
        } satisfies RpmView;
      }),
    ),
    {
      initialValue: {
        rpm: 0,
        rpmDisplay: '---',
        quality: 'missing',
        isStale: true,
        source: '',
        age: null,
        ariaLabel: 'Engine RPM gauge. Data unavailable.',
      } satisfies RpmView,
    },
  );

  getDashOffset(rpm: number): number {
    const clamped = Math.max(0, Math.min(rpm, this.MAX_RPM));
    const percentage = clamped / this.MAX_RPM;
    return this.ARC_LENGTH * (1 - percentage);
  }

  getNeedleTransform(rpm: number): string {
    const clamped = Math.max(0, Math.min(rpm, this.MAX_RPM));
    const degrees = (clamped / this.MAX_RPM) * 270 - 135;
    return `rotate(${degrees}, 100, 100)`;
  }
}
