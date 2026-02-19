import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith } from 'rxjs';
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
  { id: 'water', label: 'WATER', path: 'tanks.water.0.level', class: 'water', warnLow: 0.10 },
  { id: 'waste', label: 'WASTE', path: 'tanks.waste.0.level', class: 'waste', warnHigh: 0.80 },
  { id: 'gray', label: 'GRAY', path: 'tanks.gray.0.level', class: 'gray', warnHigh: 0.80 },
];

interface TankState {
  id: string;
  label: string;
  level: number; // 0..1
  class: string;
  isAlert: boolean;
}

@Component({
  selector: 'app-tank-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tank-widget.component.html',
  styleUrls: ['./tank-widget.component.scss']
})
export class TankWidgetComponent {
  private store = inject(DatapointStoreService);

  private tanks$ = combineLatest(
    TANKS_CONFIG.map(config => 
      this.store.observe<number>(config.path).pipe(
        startWith(undefined),
        map(point => {
          const val = typeof point?.value === 'number' ? point.value : 0;
          
          let alert = false;
          if (config.warnLow !== undefined && val < config.warnLow) alert = true;
          if (config.warnHigh !== undefined && val > config.warnHigh) alert = true;

          return {
            id: config.id,
            label: config.label,
            level: val,
            class: config.class,
            isAlert: alert
          } as TankState;
        })
      )
    )
  );

  view = toSignal(
    this.tanks$.pipe(map(tanks => ({ tanks }))),
    { initialValue: { tanks: [] as TankState[] } }
  );

  getLiquidY(level: number): number {
    // SVG: y=10 (top) to y=170 (bottom). Height 160.
    // Fill 100%: y=10. Fill 0%: y=170.
    const maxH = 160;
    const clamped = Math.max(0, Math.min(1, level));
    return 10 + maxH * (1 - clamped);
  }

  getLiquidHeight(level: number): number {
    const maxH = 160;
    const clamped = Math.max(0, Math.min(1, level));
    return maxH * clamped;
  }
}
