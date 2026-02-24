import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';

export type ChartHudFixState = 'no-fix' | 'fix' | 'stale';

export interface ChartHudPosition {
  lat: number | null;
  lon: number | null;
  ageSeconds?: number | null;
}

export interface ChartHudNavigationData {
  sog?: number | null;
  cog?: number | null;
  heading?: number | null;
  depth?: number | null;
}

@Component({
  selector: 'app-chart-hud-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  template: `
    <section class="chart-hud-pattern" [ngClass]="stateClass()">
      <header class="chart-hud-pattern__header">
        <div class="chart-hud-pattern__status">
          <span class="chart-hud-pattern__dot" [class.chart-hud-pattern__dot--pulse]="fixState === 'stale'"></span>
          <span class="chart-hud-pattern__status-label">{{ fixLabel() }}</span>
          <span class="chart-hud-pattern__age" *ngIf="position.ageSeconds !== null && position.ageSeconds !== undefined">
            {{ position.ageSeconds }}s
          </span>
        </div>

        <app-button
          size="xs"
          variant="ghost"
          label="AP"
          iconLeft="helm"
          (action)="onAutopilot.emit()"
        />
      </header>

      <dl class="chart-hud-pattern__coords">
        <div class="chart-hud-pattern__coord">
          <dt class="chart-hud-pattern__coord-label">LAT</dt>
          <dd class="chart-hud-pattern__coord-value">{{ formatCoord(position.lat, true) }}</dd>
        </div>
        <div class="chart-hud-pattern__coord">
          <dt class="chart-hud-pattern__coord-label">LON</dt>
          <dd class="chart-hud-pattern__coord-value">{{ formatCoord(position.lon, false) }}</dd>
        </div>
      </dl>

      <dl class="chart-hud-pattern__data">
        <div class="chart-hud-pattern__item">
          <dt class="chart-hud-pattern__item-label">SOG</dt>
          <dd class="chart-hud-pattern__item-value">{{ formatSpeed(navigationData.sog) }}</dd>
        </div>
        <div class="chart-hud-pattern__item">
          <dt class="chart-hud-pattern__item-label">COG</dt>
          <dd class="chart-hud-pattern__item-value">{{ formatAngle(navigationData.cog) }}</dd>
        </div>
        <div class="chart-hud-pattern__item">
          <dt class="chart-hud-pattern__item-label">HDG</dt>
          <dd class="chart-hud-pattern__item-value">{{ formatAngle(navigationData.heading) }}</dd>
        </div>
        <div class="chart-hud-pattern__item">
          <dt class="chart-hud-pattern__item-label">DEPTH</dt>
          <dd class="chart-hud-pattern__item-value">{{ formatDepth(navigationData.depth) }}</dd>
        </div>
      </dl>
    </section>
  `,
  styleUrls: ['./chart-hud-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartHudPatternComponent {
  @Input() fixState: ChartHudFixState = 'no-fix';
  @Input() position: ChartHudPosition = { lat: null, lon: null, ageSeconds: null };
  @Input() navigationData: ChartHudNavigationData = {};

  @Output() onAutopilot = new EventEmitter<void>();

  stateClass(): string {
    return `chart-hud-pattern--${this.fixState}`;
  }

  fixLabel(): string {
    switch (this.fixState) {
      case 'fix':
        return 'GPS FIX';
      case 'stale':
        return 'STALE';
      case 'no-fix':
        return 'NO FIX';
      default:
        return 'UNKNOWN';
    }
  }

  formatCoord(value: number | null | undefined, latitude: boolean): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }

    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = (abs - degrees) * 60;
    const hemi = latitude ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const degreeDigits = latitude ? 2 : 3;

    return `${degrees.toString().padStart(degreeDigits, '0')}deg ${minutes.toFixed(3)} ${hemi}`;
  }

  formatSpeed(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }
    return `${value.toFixed(1)} kn`;
  }

  formatDepth(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }
    return `${value.toFixed(1)} m`;
  }

  formatAngle(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }
    const normalized = ((Math.round(value) % 360) + 360) % 360;
    return `${normalized.toString().padStart(3, '0')}deg`;
  }
}
