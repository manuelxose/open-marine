import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';

interface TankConfig {
  id: string;
  label: string;
  path: string;
  class: string;
  warnLow?: number;
  warnHigh?: number;
}

const TANKS_CONFIG: TankConfig[] = [
  { id: 'fuel', label: 'FUEL', path: 'tanks.fuel.0.level', class: 'fuel', warnLow: 0.15 },
  { id: 'water', label: 'WATER', path: 'tanks.water.0.level', class: 'water', warnLow: 0.1 },
  { id: 'waste', label: 'WASTE', path: 'tanks.waste.0.level', class: 'waste', warnHigh: 0.8 },
  { id: 'gray', label: 'GRAY', path: 'tanks.gray.0.level', class: 'gray', warnHigh: 0.8 },
];

interface TankState {
  id: string;
  label: string;
  level: number;
  levelDisplay: string;
  class: string;
  isAlert: boolean;
  quality: DataQuality;
  timestamp: number;
  source: string;
}

interface TanksView {
  tanks: TankState[];
  quality: DataQuality;
  age: number | null;
  source: string;
}

@Component({
  selector: 'app-tank-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tank-widget.component.html',
  styleUrls: ['./tank-widget.component.scss'],
})
export class TankWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly qualityService = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  private readonly tanks$ = combineLatest(
    TANKS_CONFIG.map((config) =>
      this.store.observe<number>(config.path).pipe(
        startWith(undefined),
        map((point) => {
          const quality = this.qualityService.getQuality(point?.timestamp ?? null);
          const isUnavailable = quality === 'stale' || quality === 'missing';
          const level = typeof point?.value === 'number' ? point.value : 0;
          const isAlert =
            !isUnavailable &&
            ((config.warnLow !== undefined && level < config.warnLow) ||
              (config.warnHigh !== undefined && level > config.warnHigh));

          return {
            id: config.id,
            label: config.label,
            level,
            levelDisplay: isUnavailable ? '---' : (level * 100).toFixed(0),
            class: config.class,
            isAlert,
            quality,
            timestamp: point?.timestamp ?? 0,
            source: point?.source ?? '',
          } satisfies TankState;
        }),
      ),
    ),
  );

  readonly view = toSignal(
    combineLatest([this.tanks$, this.ticker$]).pipe(
      map(([tanks]) => {
        const latestTimestamp = Math.max(...tanks.map((tank) => tank.timestamp), 0);
        const primarySource = tanks.find((tank) => tank.source)?.source ?? '';

        return {
          tanks,
          quality: this.qualityService.getQuality(latestTimestamp || null),
          age: latestTimestamp > 0 ? (Date.now() - latestTimestamp) / 1000 : null,
          source: primarySource,
        } satisfies TanksView;
      }),
    ),
    {
      initialValue: {
        tanks: [] as TankState[],
        quality: 'missing',
        age: null,
        source: '',
      } satisfies TanksView,
    },
  );

  getLiquidY(level: number): number {
    const maxHeight = 160;
    const clamped = Math.max(0, Math.min(1, level));
    return 10 + maxHeight * (1 - clamped);
  }

  getLiquidHeight(level: number): number {
    const maxHeight = 160;
    const clamped = Math.max(0, Math.min(1, level));
    return maxHeight * clamped;
  }

  getTankAriaLabel(tank: TankState): string {
    const isUnavailable = tank.quality === 'stale' || tank.quality === 'missing';
    if (isUnavailable) {
      return `${tank.label} tank. Data stale.`;
    }
    return `${tank.label} tank ${tank.levelDisplay} percent.`;
  }
}
