import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { WaypointCardData, WaypointCardPatternComponent } from '../waypoint-card-pattern/waypoint-card-pattern.component';

export interface WaypointReorderEvent {
  id: string;
  direction: 'up' | 'down';
}

@Component({
  selector: 'app-waypoint-list-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent, WaypointCardPatternComponent],
  template: `
    <section class="wp-list-pattern">
      <header class="wp-list-pattern__header">
        <p class="wp-list-pattern__title">Waypoint List</p>
        <span class="wp-list-pattern__count">{{ waypoints.length }}</span>
      </header>

      <ng-container *ngIf="waypoints.length > 0; else emptyState">
        <div class="wp-list-pattern__rows">
          <div class="wp-list-pattern__row" *ngFor="let wp of waypoints; let i = index; let first = first; let last = last">
            <app-waypoint-card-pattern
              [waypoint]="wp"
              [active]="activeId === wp.id"
              (onSelect)="onSelect.emit(wp.id)"
              (onEdit)="onEdit.emit(wp.id)"
              (onDelete)="onDelete.emit(wp.id)"
              (onNavigate)="onNavigate.emit(wp.id)"
            />

            <div class="wp-list-pattern__reorder" *ngIf="reorderable">
              <button
                type="button"
                class="wp-list-pattern__reorder-btn"
                [disabled]="first"
                aria-label="Move waypoint up"
                (click)="emitReorder(wp.id, 'up')"
              >
                <app-icon name="chevron-up" size="14"></app-icon>
              </button>
              <button
                type="button"
                class="wp-list-pattern__reorder-btn"
                [disabled]="last"
                aria-label="Move waypoint down"
                (click)="emitReorder(wp.id, 'down')"
              >
                <app-icon name="chevron-down" size="14"></app-icon>
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="wp-list-pattern__empty">
          <app-icon name="waypoint" size="18"></app-icon>
          <span>No waypoints available</span>
        </div>
      </ng-template>
    </section>
  `,
  styleUrls: ['./waypoint-list-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointListPatternComponent {
  @Input() waypoints: WaypointCardData[] = [];
  @Input() activeId: string | null = null;
  @Input() reorderable = false;

  @Output() onSelect = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onNavigate = new EventEmitter<string>();
  @Output() onReorder = new EventEmitter<WaypointReorderEvent>();

  emitReorder(id: string, direction: 'up' | 'down'): void {
    this.onReorder.emit({ id, direction });
  }
}
