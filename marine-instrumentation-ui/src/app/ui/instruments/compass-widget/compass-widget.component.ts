import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { CompassComponent } from '../../../shared/components/patterns/compass/compass.component';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

interface CompassView {
  heading: number;
  cogStr: string;
  quality: DataQuality;
  age: number | null;
  source: string;
  timestamp: number;
}

@Component({
  selector: 'app-compass-widget',
  standalone: true,
  imports: [CommonModule, CompassComponent, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compass-widget.component.html',
  styleUrls: ['./compass-widget.component.scss'],
})
export class CompassWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);
  private readonly heading$ = this.store.observe<number>(PATHS.navigation.headingTrue).pipe(startWith(undefined));
  private readonly cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue).pipe(startWith(undefined));

  private readonly vm$ = combineLatest([this.heading$, this.cog$, this.ticker$]).pipe(
    map(([hdg, cog]) => {
      if (!hdg || typeof hdg.value !== 'number') {
        return {
          heading: 0,
          cogStr: '---',
          quality: 'missing',
          age: null,
          source: '',
          timestamp: 0,
        } satisfies CompassView;
      }

      const age = (Date.now() - hdg.timestamp) / 1000;
      const cogDeg = cog && typeof cog.value === 'number' ? this.radToDeg(cog.value) : null;

      return {
        heading: this.radToDeg(hdg.value),
        cogStr: cogDeg === null ? '---' : String(Math.round(cogDeg)).padStart(3, '0'),
        quality: this.quality.getQuality(hdg.timestamp),
        age,
        source: hdg.source ?? '',
        timestamp: hdg.timestamp,
      } satisfies CompassView;
    }),
  );

  readonly view = toSignal(this.vm$, {
    initialValue: {
      heading: 0,
      cogStr: '---',
      quality: 'missing',
      age: null,
      source: '',
      timestamp: 0,
    } satisfies CompassView,
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
