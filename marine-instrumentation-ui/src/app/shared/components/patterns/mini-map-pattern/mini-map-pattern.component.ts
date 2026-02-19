import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface MiniMapPoint {
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-mini-map-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="mini-map-pattern">
      <header class="mini-map-pattern__header">
        <p class="mini-map-pattern__title">Mini Map</p>
        <span class="mini-map-pattern__zoom">Z{{ zoom.toFixed(1) }}</span>
      </header>

      <div class="mini-map-pattern__canvas">
        <div class="mini-map-pattern__grid">
          <span class="mini-map-pattern__grid-line mini-map-pattern__grid-line--h"></span>
          <span class="mini-map-pattern__grid-line mini-map-pattern__grid-line--v"></span>
        </div>

        <span class="mini-map-pattern__center" aria-label="Chart center">
          <app-icon name="crosshair" size="14"></app-icon>
        </span>

        <span
          class="mini-map-pattern__vessel"
          *ngIf="vesselPosition"
          [style.left.%]="vesselOffset().x"
          [style.top.%]="vesselOffset().y"
          aria-label="Vessel position"
        >
          <app-icon name="vessel" size="14"></app-icon>
        </span>
      </div>

      <dl class="mini-map-pattern__meta">
        <div class="mini-map-pattern__meta-item">
          <dt class="mini-map-pattern__meta-label">Center</dt>
          <dd class="mini-map-pattern__meta-value">{{ formatPoint(center) }}</dd>
        </div>
        <div class="mini-map-pattern__meta-item">
          <dt class="mini-map-pattern__meta-label">Vessel</dt>
          <dd class="mini-map-pattern__meta-value">{{ formatPoint(vesselPosition) }}</dd>
        </div>
      </dl>
    </section>
  `,
  styleUrls: ['./mini-map-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiniMapPatternComponent {
  @Input() center: MiniMapPoint | null = null;
  @Input() zoom = 12;
  @Input() vesselPosition: MiniMapPoint | null = null;

  vesselOffset(): { x: number; y: number } {
    if (!this.center || !this.vesselPosition) {
      return { x: 50, y: 50 };
    }

    const dxMeters = this.metersEastWest(this.center, this.vesselPosition);
    const dyMeters = this.metersNorthSouth(this.center, this.vesselPosition);

    const rangeMeters = this.visibleRangeMeters();
    const half = rangeMeters / 2;

    const x = 50 + (dxMeters / half) * 50;
    const y = 50 - (dyMeters / half) * 50;

    return {
      x: this.clamp(x, 5, 95),
      y: this.clamp(y, 5, 95)
    };
  }

  formatPoint(point: MiniMapPoint | null): string {
    if (!point) {
      return '--';
    }
    return `${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`;
  }

  private visibleRangeMeters(): number {
    const z = Math.max(1, this.zoom);
    const base = 12000;
    return Math.max(250, base / Math.pow(1.45, z - 8));
  }

  private metersNorthSouth(a: MiniMapPoint, b: MiniMapPoint): number {
    return (b.lat - a.lat) * 111320;
  }

  private metersEastWest(a: MiniMapPoint, b: MiniMapPoint): number {
    const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
    const metersPerLonDegree = 111320 * Math.cos(meanLat);
    return (b.lon - a.lon) * metersPerLonDegree;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

