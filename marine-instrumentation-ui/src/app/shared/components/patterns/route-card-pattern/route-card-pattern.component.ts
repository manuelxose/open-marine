import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface RouteCardData {
  id: string;
  name: string;
  waypointCount: number;
  totalDistanceNm: number;
  progress?: number;
  eta?: string;
}

@Component({
  selector: 'app-route-card-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <article class="route-card-pattern" [class.route-card-pattern--active]="active" (click)="onSelect.emit(route.id)">
      <header class="route-card-pattern__header">
        <div class="route-card-pattern__title-wrap">
          <span class="route-card-pattern__icon">
            <app-icon name="route" size="18"></app-icon>
          </span>
          <div class="route-card-pattern__title-content">
            <p class="route-card-pattern__title">{{ route.name }}</p>
            <p class="route-card-pattern__subtitle">{{ route.waypointCount }} waypoints</p>
          </div>
        </div>
        <span class="route-card-pattern__pill" *ngIf="active">ACTIVE</span>
      </header>

      <dl class="route-card-pattern__metrics">
        <div class="route-card-pattern__metric">
          <dt class="route-card-pattern__metric-label">Distance</dt>
          <dd class="route-card-pattern__metric-value">{{ route.totalDistanceNm.toFixed(1) }} nm</dd>
        </div>
        <div class="route-card-pattern__metric">
          <dt class="route-card-pattern__metric-label">Progress</dt>
          <dd class="route-card-pattern__metric-value">{{ resolvedProgress() }}%</dd>
        </div>
        <div class="route-card-pattern__metric">
          <dt class="route-card-pattern__metric-label">ETA</dt>
          <dd class="route-card-pattern__metric-value">{{ route.eta ?? '--' }}</dd>
        </div>
      </dl>

      <div class="route-card-pattern__progress">
        <span class="route-card-pattern__progress-fill" [style.width.%]="resolvedProgress()"></span>
      </div>

      <footer class="route-card-pattern__actions">
        <app-button
          size="sm"
          variant="ghost"
          label="Edit"
          (action)="emitWithStop($event, onEdit)"
        ></app-button>
        <app-button
          size="sm"
          [variant]="active ? 'secondary' : 'primary'"
          [label]="active ? 'Following' : 'Activate'"
          (action)="emitWithStop($event, onActivate)"
        ></app-button>
      </footer>
    </article>
  `,
  styleUrls: ['./route-card-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteCardPatternComponent {
  @Input({ required: true }) route!: RouteCardData;
  @Input() active = false;
  @Input() progress: number | null = null;

  @Output() onSelect = new EventEmitter<string>();
  @Output() onActivate = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<string>();

  resolvedProgress(): number {
    const value = this.progress ?? this.route.progress ?? 0;
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  emitWithStop(event: Event | void, emitter: EventEmitter<string>): void {
    if (event instanceof Event) {
      event.stopPropagation();
    }
    emitter.emit(this.route.id);
  }
}
