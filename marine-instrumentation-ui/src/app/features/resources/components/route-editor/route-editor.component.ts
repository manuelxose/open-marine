import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  bearingToNext: number | null;
  distanceToNext: number | null;
}

@Component({
  selector: 'app-route-editor',
  standalone: true,
  imports: [CommonModule, DragDropModule, AppIconComponent, AppButtonComponent],
  template: `
    <div class="route-editor">
      <header class="route-header">
        <input 
          class="route-name-input"
          [value]="routeName"
          (change)="onNameChange($event)"
          placeholder="Route name"
          aria-label="Route name"
        />
        <div class="route-stats">
          <span>{{ waypoints.length }} waypoints</span>
          <span>{{ totalDistanceNm | number:'1.1-1' }} nm</span>
        </div>
      </header>

      <div 
        class="waypoint-list"
        cdkDropList
        (cdkDropListDropped)="onReorder($event)"
      >
        <div 
          *ngFor="let wp of waypoints; let i = index; trackBy: trackById"
          class="waypoint-item"
          cdkDrag
        >
          <span class="wp-handle" cdkDragHandle aria-hidden="true">
            <app-icon name="more-vertical" size="16"></app-icon>
          </span>
          <span class="wp-index">{{ i + 1 }}</span>
          <div class="wp-info">
            <span class="wp-name">{{ wp.name || 'Unnamed' }}</span>
            <span class="wp-leg" *ngIf="wp.bearingToNext !== null">
              {{ wp.bearingToNext | number:'1.0-0' }} deg / 
              {{ wp.distanceToNext | number:'1.1-1' }} nm
            </span>
          </div>
          <button 
            class="wp-remove"
            type="button"
            (click)="removeWaypoint.emit(wp.id)"
            aria-label="Remove waypoint"
          >
            <app-icon name="x" size="16"></app-icon>
          </button>
        </div>
        <div class="empty-state" *ngIf="waypoints.length === 0">No waypoints in route</div>
      </div>

      <footer class="route-actions">
        <app-button variant="secondary" (click)="addWaypoint.emit()">
          <app-icon name="plus" size="16"></app-icon> Add Waypoint
        </app-button>
        <app-button variant="secondary" (click)="reverseRoute.emit()">Reverse</app-button>
      </footer>
    </div>
  `,
  styles: [`
    .route-editor {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      height: 100%;
    }
    .route-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .route-name-input {
      flex: 1;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--border);
      background: var(--gb-bg-panel);
      color: var(--gb-text-value);
      border-radius: 6px;
      font-size: 1rem;
    }
    .route-stats {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: var(--gb-text-muted);
      text-align: right;
      min-width: 140px;
    }
    .waypoint-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 360px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem;
      background: var(--gb-bg-bezel);
    }
    .waypoint-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      background: var(--gb-bg-panel);
      border-radius: 6px;
      border: 1px solid transparent;
    }
    .waypoint-item.cdk-drag-preview {
      border-color: var(--border);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .waypoint-item.cdk-drag-placeholder {
      opacity: 0.35;
    }
    .wp-handle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--gb-text-muted);
      cursor: grab;
    }
    .wp-index {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--surface-3);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--gb-text-muted);
    }
    .wp-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .wp-name {
      font-weight: 600;
      color: var(--gb-text-value);
    }
    .wp-leg {
      font-size: 0.75rem;
      color: var(--gb-text-muted);
      font-family: var(--font-mono);
    }
    .wp-remove {
      border: none;
      background: none;
      color: var(--gb-text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
    }
    .wp-remove:hover {
      color: var(--danger);
      background: var(--surface-error);
    }
    .route-actions {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }
    .empty-state {
      text-align: center;
      padding: 1.5rem 1rem;
      color: var(--gb-text-muted);
      border: 1px dashed var(--border);
      border-radius: 6px;
      font-style: italic;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteEditorComponent {
  @Input() routeName = '';
  @Input() waypoints: RouteWaypoint[] = [];
  @Input() totalDistance: number | null = null;
  
  @Output() nameChange = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<{ previousIndex: number; currentIndex: number }>();
  @Output() removeWaypoint = new EventEmitter<string>();
  @Output() addWaypoint = new EventEmitter<void>();
  @Output() reverseRoute = new EventEmitter<void>();

  get totalDistanceNm(): number {
    if (this.totalDistance !== null) {
      return this.totalDistance;
    }
    return this.waypoints.reduce((sum, wp) => sum + (wp.distanceToNext ?? 0), 0);
  }

  onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.nameChange.emit(value);
  }

  onReorder(event: CdkDragDrop<RouteWaypoint[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    this.reorder.emit({ previousIndex: event.previousIndex, currentIndex: event.currentIndex });
  }

  trackById(_index: number, item: RouteWaypoint): string {
    return item.id;
  }
}
