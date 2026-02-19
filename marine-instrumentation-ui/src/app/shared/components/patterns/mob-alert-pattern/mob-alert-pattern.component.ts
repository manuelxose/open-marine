import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface MobPosition {
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-mob-alert-pattern',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppIconComponent
  ],
  template: `
    <section class="mob-alert-pattern" [class.mob-alert-pattern--active]="active">
      <header class="mob-alert-pattern__header">
        <div class="mob-alert-pattern__title-wrap">
          <span class="mob-alert-pattern__icon-wrap" [class.mob-alert-pattern__icon-wrap--pulse]="active">
              <app-icon [name]="active ? 'alarm' : 'life-buoy'" size="20"></app-icon>
            </span>
            <div class="mob-alert-pattern__title-content">
              <p class="mob-alert-pattern__title">{{ active ? 'MOB ALERT ACTIVE' : 'MOB STANDBY' }}</p>
              <p class="mob-alert-pattern__subtitle">
                {{ active ? 'Immediate recovery required' : 'No man-overboard event detected' }}
              </p>
            </div>
          </div>
          <div class="mob-alert-pattern__elapsed" *ngIf="active">
            <span class="mob-alert-pattern__elapsed-label">Elapsed</span>
            <span class="mob-alert-pattern__elapsed-value">{{ formatElapsed(elapsed) }}</span>
          </div>
        </header>

        <dl class="mob-alert-pattern__metrics" *ngIf="active">
          <div class="mob-alert-pattern__metric">
            <dt class="mob-alert-pattern__metric-label">Position</dt>
            <dd class="mob-alert-pattern__metric-value">{{ formatPosition(position) }}</dd>
          </div>
          <div class="mob-alert-pattern__metric">
            <dt class="mob-alert-pattern__metric-label">Bearing</dt>
            <dd class="mob-alert-pattern__metric-value">{{ formatBearing(bearing) }}</dd>
          </div>
          <div class="mob-alert-pattern__metric">
            <dt class="mob-alert-pattern__metric-label">Distance</dt>
            <dd class="mob-alert-pattern__metric-value">{{ formatDistance(distance) }}</dd>
          </div>
        </dl>

        <div class="mob-alert-pattern__actions">
          <app-button
            *ngIf="!active"
            variant="danger"
            size="sm"
            label="Trigger MOB"
            (action)="onActivate.emit()"
          />
          <ng-container *ngIf="active">
            <app-button
              variant="danger"
              size="sm"
              label="Clear Alert"
              (action)="onClear.emit()"
            />
            <app-button
              variant="warning"
              size="sm"
              label="Navigate to MOB"
              (action)="onNavigate.emit()"
            />
          </ng-container>
        </div>
    </section>
  `,
  styleUrls: ['./mob-alert-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobAlertPatternComponent {
  @Input() active = false;
  @Input() position: MobPosition | null = null;
  @Input() elapsed = 0;
  @Input() bearing: number | null = null;
  @Input() distance: number | null = null;

  @Output() onActivate = new EventEmitter<void>();
  @Output() onClear = new EventEmitter<void>();
  @Output() onNavigate = new EventEmitter<void>();

  formatElapsed(value: number): string {
    const safeValue = Math.max(0, Math.floor(value));
    const mins = Math.floor(safeValue / 60).toString().padStart(2, '0');
    const secs = (safeValue % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  formatPosition(position: MobPosition | null): string {
    if (!position) {
      return '--';
    }
    return `${position.lat.toFixed(4)}, ${position.lon.toFixed(4)}`;
  }

  formatBearing(value: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${Math.round(value).toString().padStart(3, '0')}deg`;
  }

  formatDistance(value: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${value.toFixed(2)} nm`;
  }
}
