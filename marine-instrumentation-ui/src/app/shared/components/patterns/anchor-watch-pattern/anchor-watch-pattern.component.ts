import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface AnchorWatchPosition {
  lat: number;
  lon: number;
}

export type AnchorWatchStatus = 'set' | 'ok' | 'dragging' | 'alarm';

@Component({
  selector: 'app-anchor-watch-pattern',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppIconComponent
  ],
  template: `
    <section class="anchor-watch-pattern" [ngClass]="statusClass()">
        <header class="anchor-watch-pattern__header">
          <div class="anchor-watch-pattern__title-wrap">
            <span class="anchor-watch-pattern__icon-wrap">
              <app-icon name="anchor-watch" size="20"></app-icon>
            </span>
            <div class="anchor-watch-pattern__title-content">
              <p class="anchor-watch-pattern__title">ANCHOR WATCH</p>
              <p class="anchor-watch-pattern__subtitle">{{ statusText() }}</p>
            </div>
          </div>
          <span class="anchor-watch-pattern__status-pill">{{ status.toUpperCase() }}</span>
        </header>

        <dl class="anchor-watch-pattern__metrics">
          <div class="anchor-watch-pattern__metric">
            <dt class="anchor-watch-pattern__metric-label">Radius</dt>
            <dd class="anchor-watch-pattern__metric-value">{{ radius }} m</dd>
          </div>
          <div class="anchor-watch-pattern__metric">
            <dt class="anchor-watch-pattern__metric-label">Current Drift</dt>
            <dd class="anchor-watch-pattern__metric-value">{{ formatDistance(driftDistance()) }}</dd>
          </div>
          <div class="anchor-watch-pattern__metric">
            <dt class="anchor-watch-pattern__metric-label">Anchor Point</dt>
            <dd class="anchor-watch-pattern__metric-value">{{ formatPosition(anchorPosition) }}</dd>
          </div>
        </dl>

        <div class="anchor-watch-pattern__actions">
          <app-button
            *ngIf="!anchorPosition"
            variant="primary"
            size="sm"
            label="Set Anchor"
            (action)="onSetAnchor.emit()"
          />
          <app-button
            *ngIf="anchorPosition"
            variant="ghost"
            size="sm"
            label="Raise Anchor"
            (action)="onRaiseAnchor.emit()"
          />
        </div>
    </section>
  `,
  styleUrls: ['./anchor-watch-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnchorWatchPatternComponent {
  @Input() anchorPosition: AnchorWatchPosition | null = null;
  @Input() currentPosition: AnchorWatchPosition | null = null;
  @Input() radius = 40;
  @Input() status: AnchorWatchStatus = 'set';

  @Output() onSetAnchor = new EventEmitter<void>();
  @Output() onRaiseAnchor = new EventEmitter<void>();

  driftDistance(): number | null {
    if (!this.anchorPosition || !this.currentPosition) {
      return null;
    }
    return this.haversineMeters(this.anchorPosition, this.currentPosition);
  }

  statusClass(): string {
    return `status-${this.status}`;
  }

  statusText(): string {
    switch (this.status) {
      case 'set':
        return 'Anchor watch configured';
      case 'ok':
        return 'Holding position inside safe radius';
      case 'dragging':
        return 'Approaching radius threshold';
      case 'alarm':
        return 'Anchor dragging alarm';
      default:
        return 'Anchor watch';
    }
  }

  formatPosition(value: AnchorWatchPosition | null): string {
    if (!value) {
      return '--';
    }
    return `${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}`;
  }

  formatDistance(value: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${Math.round(value)} m`;
  }

  private haversineMeters(a: AnchorWatchPosition, b: AnchorWatchPosition): number {
    const r = 6371000;
    const lat1 = this.toRadians(a.lat);
    const lat2 = this.toRadians(b.lat);
    const dLat = this.toRadians(b.lat - a.lat);
    const dLon = this.toRadians(b.lon - a.lon);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }
}
