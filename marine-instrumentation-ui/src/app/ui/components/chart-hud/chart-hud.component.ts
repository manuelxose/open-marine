import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FixState = 'no-fix' | 'fix' | 'stale';

export interface ChartHudMetrics {
  sogKn: number | null;
  cogDeg: number | null;
  hdgDeg: number | null;
  depthM: number | null;
  awsKn: number | null;
  awaDeg: number | null;
  dataAgeSec: number | null;
  bearingDeg: number | null;
  distanceNm: number | null;
}

@Component({
  selector: 'app-chart-hud',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-hud.component.html',
  styleUrls: ['./chart-hud.component.css'],
})
export class ChartHudComponent {
  @Input({ required: true }) fixState: FixState = 'no-fix';
  @Input({ required: true }) metrics!: ChartHudMetrics;

  formatValue(value: number | null, fraction = 0): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '--';
    }
    return value.toFixed(fraction);
  }

  fixLabel(): string {
    switch (this.fixState) {
      case 'fix':
        return 'FIX';
      case 'stale':
        return 'STALE';
      default:
        return 'NO FIX';
    }
  }
}
