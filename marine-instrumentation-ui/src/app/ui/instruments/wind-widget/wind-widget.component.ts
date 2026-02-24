import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';
import { initNeedleState, updateNeedleAngle } from '../../../shared/utils/needle-rotation.utils';

interface WindView {
  awa: number;
  awsDisplay: string;
  twa: number;
  twsDisplay: string;
  quality: DataQuality;
  isStale: boolean;
  age: number | null;
  source: string;
  awaRotation: number;
  twaRotation: number;
  ariaLabel: string;
}

@Component({
  selector: 'app-wind-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wind-widget.component.html',
  styleUrls: ['./wind-widget.component.scss'],
})
export class WindWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 500);
  private awaRotationState = initNeedleState(0);
  private twaRotationState = initNeedleState(0);

  readonly ticks = Array.from({ length: 36 }, (_, i) => {
    const angle = i * 10;
    return { angle, major: angle % 30 === 0 };
  });

  private readonly awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent).pipe(startWith(undefined));
  private readonly aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent).pipe(startWith(undefined));
  private readonly twa$ = this.store.observe<number>(PATHS.environment.wind.angleTrueWater).pipe(startWith(undefined));
  private readonly tws$ = this.store.observe<number>(PATHS.environment.wind.speedTrue).pipe(startWith(undefined));

  private readonly vm$ = combineLatest([this.awa$, this.aws$, this.twa$, this.tws$, this.ticker$]).pipe(
    map(([awa, aws, twa, tws]) => {
      const lastUpdate = Math.max(
        awa?.timestamp ?? 0,
        aws?.timestamp ?? 0,
        twa?.timestamp ?? 0,
        tws?.timestamp ?? 0,
      );
      const hasData = lastUpdate > 0;
      const age = hasData ? (Date.now() - lastUpdate) / 1000 : null;
      const quality = this.quality.getQuality(hasData ? lastUpdate : null);
      const isStale = quality === 'stale' || quality === 'missing';

      const awsKn = aws && typeof aws.value === 'number' ? (aws.value * 1.94384).toFixed(1) : '--';
      const twsKn = tws && typeof tws.value === 'number' ? (tws.value * 1.94384).toFixed(1) : '--';
      const awsDisplay = isStale ? '---' : awsKn;
      const twsDisplay = isStale ? '---' : twsKn;
      const awaDeg = awa && typeof awa.value === 'number' ? this.radToDeg(awa.value) : 0;
      const twaDeg = twa && typeof twa.value === 'number' ? this.radToDeg(twa.value) : 0;
      this.awaRotationState = updateNeedleAngle(this.awaRotationState, awaDeg);
      this.twaRotationState = updateNeedleAngle(this.twaRotationState, twaDeg);

      return {
        awa: awaDeg,
        awsDisplay,
        twa: twaDeg,
        twsDisplay,
        quality,
        isStale,
        age,
        source: awa?.source ?? twa?.source ?? '',
        awaRotation: this.awaRotationState.visualAngle,
        twaRotation: this.twaRotationState.visualAngle,
        ariaLabel: isStale
          ? 'Wind gauge. Data stale.'
          : `Wind gauge. AWS ${awsDisplay} knots, TWS ${twsDisplay} knots.`,
      } satisfies WindView;
    }),
  );

  readonly view = toSignal(this.vm$, {
    initialValue: {
      awa: 0,
      awsDisplay: '--',
      twa: 0,
      twsDisplay: '--',
      quality: 'missing',
      isStale: true,
      age: null,
      source: '',
      awaRotation: 0,
      twaRotation: 0,
      ariaLabel: 'Wind gauge. Data unavailable.',
    } satisfies WindView,
  });

  private radToDeg(rad: number): number {
    let deg = (rad * 180) / Math.PI;
    deg %= 360;
    if (deg < 0) {
      deg += 360;
    }
    return deg;
  }
}
