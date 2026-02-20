import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, scan, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';
import { initNeedleState, updateNeedleAngle } from '../../../shared/utils/needle-rotation.utils';

interface NavView {
  latStr: string;
  lonStr: string;
  sog: string;
  cog: string;
  hdg: string;
  driftAngle: number;
  driftRotation: number;
  hasDrift: boolean;
  sogHistoryPath: string;
  quality: DataQuality;
  isStale: boolean;
  age: number | null;
  source: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-navigation-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navigation-card.component.html',
  styleUrls: ['./navigation-card.component.scss'],
})
export class NavigationWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);
  private driftRotationState = initNeedleState(0);

  private readonly pos$ = this.store
    .observe<{ latitude: number; longitude: number }>(PATHS.navigation.position)
    .pipe(startWith(undefined));
  private readonly sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround).pipe(startWith(undefined));
  private readonly cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue).pipe(startWith(undefined));
  private readonly hdg$ = this.store.observe<number>(PATHS.navigation.headingTrue).pipe(startWith(undefined));

  private readonly sogHistory$ = this.sog$.pipe(
    map((point) => point?.value ?? 0),
    scan((acc: number[], current: number) => [...acc, current].slice(-50), [] as number[]),
    startWith([] as number[]),
  );

  private readonly vm$ = combineLatest([
    this.pos$,
    this.sog$,
    this.cog$,
    this.hdg$,
    this.sogHistory$,
    this.ticker$,
  ]).pipe(
    map(([pos, sog, cog, hdg, history]) => {
      const formatCoord = (value: number, type: 'lat' | 'lon'): string => {
        const abs = Math.abs(value);
        const deg = Math.floor(abs);
        const min = (abs - deg) * 60;
        const dir = type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
        const degStr = deg.toString().padStart(type === 'lat' ? 2 : 3, '0');
        const minStr = min.toFixed(3).padStart(6, '0');
        return `${degStr}${String.fromCharCode(176)} ${minStr}' ${dir}`;
      };

      const latRaw = pos?.value ? formatCoord(pos.value.latitude, 'lat') : '--' + String.fromCharCode(176) + " --.---";
      const lonRaw = pos?.value ? formatCoord(pos.value.longitude, 'lon') : '--' + String.fromCharCode(176) + " --.---";

      const sogKn = (sog?.value ?? 0) * 1.94384;
      const cogDeg = cog && typeof cog.value === 'number' ? this.radToDeg(cog.value) : 0;
      const hdgDeg = hdg && typeof hdg.value === 'number' ? this.radToDeg(hdg.value) : 0;

      let drift = cogDeg - hdgDeg;
      if (drift < -180) {
        drift += 360;
      }
      if (drift > 180) {
        drift -= 360;
      }
      const normalizedDrift = ((drift % 360) + 360) % 360;
      this.driftRotationState = updateNeedleAngle(this.driftRotationState, normalizedDrift);

      const maxSog = Math.max(...history, 0.1);
      const stepX = history.length > 1 ? 200 / (history.length - 1) : 0;
      const points = history.map((value, index) => {
        const x = index * stepX;
        const y = 120 - (value / maxSog) * 40;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const sogHistoryPath = points.length > 1 ? `M ${points.join(' L ')} L 200,120 L 0,120 Z` : '';

      const timestamp = Math.max(pos?.timestamp ?? 0, sog?.timestamp ?? 0, cog?.timestamp ?? 0, hdg?.timestamp ?? 0);
      const quality = this.quality.getQuality(timestamp || null);
      const isStale = quality === 'stale' || quality === 'missing';
      const latStr = isStale ? '---' : latRaw;
      const lonStr = isStale ? '---' : lonRaw;
      const sogStr = isStale ? '---' : sogKn.toFixed(1);
      const cogStr = isStale ? '---' : String(Math.round(cogDeg)).padStart(3, '0');
      const hdgStr = isStale ? '---' : String(Math.round(hdgDeg)).padStart(3, '0');

      return {
        latStr,
        lonStr,
        sog: sogStr,
        cog: cogStr,
        hdg: hdgStr,
        driftAngle: drift,
        driftRotation: this.driftRotationState.visualAngle,
        hasDrift: !isStale && Math.abs(drift) > 2,
        sogHistoryPath,
        quality,
        isStale,
        age: timestamp > 0 ? (Date.now() - timestamp) / 1000 : null,
        source: pos?.source ?? sog?.source ?? cog?.source ?? hdg?.source ?? '',
        ariaLabel: isStale
          ? 'Navigation vector. Data stale.'
          : `Navigation vector. SOG ${sogStr} knots, COG ${cogStr} degrees, HDG ${hdgStr} degrees.`,
      } satisfies NavView;
    }),
  );

  readonly view = toSignal(this.vm$, {
    initialValue: {
      latStr: '--',
      lonStr: '--',
      sog: '--',
      cog: '--',
      hdg: '--',
      driftAngle: 0,
      driftRotation: 0,
      hasDrift: false,
      sogHistoryPath: '',
      quality: 'missing',
      isStale: true,
      age: null,
      source: '',
      ariaLabel: 'Navigation vector. Data unavailable.',
    } satisfies NavView,
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
