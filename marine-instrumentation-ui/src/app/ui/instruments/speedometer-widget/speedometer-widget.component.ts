import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';
import { initNeedleState, updateNeedleAngle } from '../../../shared/utils/needle-rotation.utils';

interface SpeedView {
  sog: number;
  sogStr: string;
  stw: number;
  stwStr: string;
  quality: DataQuality;
  isStale: boolean;
  age: number | null;
  source: string;
  sogRotation: number;
  stwRotation: number;
  sogArcDash: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-speedometer-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './speedometer-widget.component.html',
  styleUrls: ['./speedometer-widget.component.scss'],
})
export class SpeedometerWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);
  private sogRotationState = initNeedleState(180);
  private stwRotationState = initNeedleState(180);

  private readonly MAX_SPEED = 15;
  private readonly RADIUS = 80;
  private readonly ARC_LENGTH = Math.PI * this.RADIUS;

  readonly ticks = Array.from({ length: 16 }, (_, i) => {
    const value = i;
    const isMajor = value % 5 === 0;
    const pct = value / this.MAX_SPEED;
    const angleRad = Math.PI * (1 - pct);

    const centerX = 100;
    const centerY = 100;
    const rInner = this.RADIUS - (isMajor ? 15 : 10);
    const rOuter = this.RADIUS - 5;
    const x1 = centerX + rInner * Math.cos(angleRad);
    const y1 = centerY - rInner * Math.sin(angleRad);
    const x2 = centerX + rOuter * Math.cos(angleRad);
    const y2 = centerY - rOuter * Math.sin(angleRad);

    const rText = this.RADIUS - 28;
    const tx = centerX + rText * Math.cos(angleRad);
    const ty = centerY - rText * Math.sin(angleRad);

    return { value, x1, y1, x2, y2, tx, ty, isMajor };
  });

  private readonly sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround).pipe(startWith(undefined));
  private readonly stw$ = this.store.observe<number>(PATHS.navigation.speedThroughWater).pipe(startWith(undefined));

  private readonly vm$ = combineLatest([this.sog$, this.stw$, this.ticker$]).pipe(
    map(([sogData, stwData]) => {
      const sogVal = (sogData?.value ?? 0) * 1.94384;
      const stwVal = (stwData?.value ?? 0) * 1.94384;
      const lastUpdate = Math.max(sogData?.timestamp ?? 0, stwData?.timestamp ?? 0);
      const age = lastUpdate > 0 ? (Date.now() - lastUpdate) / 1000 : null;
      const quality = this.quality.getQuality(lastUpdate || null);
      const isStale = quality === 'stale' || quality === 'missing';

      const calcRotation = (value: number): number => {
        const clamped = Math.min(Math.max(value, 0), this.MAX_SPEED);
        return 180 + (clamped / this.MAX_SPEED) * 180;
      };

      const clampedSog = Math.min(Math.max(sogVal, 0), this.MAX_SPEED);
      const fillLen = (clampedSog / this.MAX_SPEED) * this.ARC_LENGTH;
      const emptyLen = this.ARC_LENGTH - fillLen;
      const sogRotation = calcRotation(sogVal);
      const stwRotation = calcRotation(stwVal);
      this.sogRotationState = updateNeedleAngle(this.sogRotationState, sogRotation);
      this.stwRotationState = updateNeedleAngle(this.stwRotationState, stwRotation);
      const sogStr = isStale ? '---' : sogVal.toFixed(1);
      const stwStr = isStale ? '---' : stwVal.toFixed(1);

      return {
        sog: sogVal,
        sogStr,
        stw: stwVal,
        stwStr,
        quality,
        isStale,
        age,
        source: sogData?.source ?? stwData?.source ?? '',
        sogRotation: this.sogRotationState.visualAngle,
        stwRotation: this.stwRotationState.visualAngle,
        sogArcDash: `${fillLen.toFixed(1)} ${emptyLen.toFixed(1)}`,
        ariaLabel: isStale
          ? 'Speed gauge. Data stale.'
          : `Speed gauge. SOG ${sogStr} knots, STW ${stwStr} knots.`,
      } satisfies SpeedView;
    }),
  );

  readonly view = toSignal(this.vm$, {
    initialValue: {
      sog: 0,
      sogStr: '0.0',
      stw: 0,
      stwStr: '0.0',
      quality: 'missing',
      isStale: true,
      age: null,
      source: '',
      sogRotation: 180,
      stwRotation: 180,
      sogArcDash: '0 251',
      ariaLabel: 'Speed gauge. Data unavailable.',
    } satisfies SpeedView,
  });
}
