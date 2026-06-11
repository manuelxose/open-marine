import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export interface WaypointCardData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description?: string;
  icon?: IconName;
  timestamp?: string | number | Date;
}

@Component({
  selector: 'app-waypoint-card-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <article
      class="wp-card-pattern"
      [class.wp-card-pattern--active]="active"
      [class.wp-card-pattern--editing]="editing"
      (click)="onSelect.emit(waypoint.id)"
    >
      <header class="wp-card-pattern__header">
        <div class="wp-card-pattern__title-wrap">
          <span class="wp-card-pattern__icon-wrap">
            <app-icon [name]="waypoint.icon ?? 'waypoint'" size="18"></app-icon>
          </span>
          <div class="wp-card-pattern__title-content">
            <p class="wp-card-pattern__title">{{ waypoint.name }}</p>
            <p class="wp-card-pattern__subtitle" *ngIf="waypoint.timestamp">
              Updated {{ formatDate(waypoint.timestamp) }}
            </p>
          </div>
        </div>

        <span class="wp-card-pattern__pill" *ngIf="active">ACTIVE</span>
      </header>

      <p class="wp-card-pattern__description" *ngIf="waypoint.description">{{ waypoint.description }}</p>

      <dl class="wp-card-pattern__coords">
        <div class="wp-card-pattern__coord">
          <dt class="wp-card-pattern__coord-label">Lat</dt>
          <dd class="wp-card-pattern__coord-value">{{ formatCoord(waypoint.lat, 'lat') }}</dd>
        </div>
        <div class="wp-card-pattern__coord">
          <dt class="wp-card-pattern__coord-label">Lon</dt>
          <dd class="wp-card-pattern__coord-value">{{ formatCoord(waypoint.lon, 'lon') }}</dd>
        </div>
      </dl>

      <footer class="wp-card-pattern__actions">
        <app-button
          size="sm"
          variant="ghost"
          label="Edit"
          (action)="emitWithStop($event, onEdit)"
        />
        <app-button
          size="sm"
          variant="ghost"
          label="Delete"
          (action)="emitWithStop($event, onDelete)"
        />
        <app-button
          size="sm"
          [variant]="active ? 'secondary' : 'primary'"
          [label]="active ? 'Following' : 'Navigate'"
          (action)="emitWithStop($event, onNavigate)"
        />
      </footer>
    </article>
  `,
  styleUrls: ['./waypoint-card-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointCardPatternComponent {
  @Input({ required: true }) waypoint!: WaypointCardData;
  @Input() active = false;
  @Input() editing = false;

  @Output() onSelect = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onNavigate = new EventEmitter<string>();

  emitWithStop(event: Event | void, emitter: EventEmitter<string>): void {
    if (event instanceof Event) {
      event.stopPropagation();
    }
    emitter.emit(this.waypoint.id);
  }

  formatCoord(value: number, type: 'lat' | 'lon'): string {
    const abs = Math.abs(value);
    const hemis = type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    const digits = type === 'lat' ? 2 : 3;
    const degrees = Math.floor(abs);
    const minutes = (abs - degrees) * 60;
    return `${degrees.toString().padStart(digits, '0')} deg ${minutes.toFixed(3).padStart(6, '0')} ${hemis}`;
  }

  formatDate(value: string | number | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}
