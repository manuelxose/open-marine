import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { LatFormatPipe } from '../../../../shared/pipes/lat-format.pipe';
import { LonFormatPipe } from '../../../../shared/pipes/lon-format.pipe';
import { Waypoint } from '../../../../state/resources/waypoint-store.service';

@Component({
  selector: 'app-waypoint-list',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppButtonComponent, LatFormatPipe, LonFormatPipe],
  template: `
    <div class="waypoint-list">
      <div *ngIf="waypoints.length === 0" class="empty-state">
        <app-icon name="locate" class="empty-icon"></app-icon>
        <p>No waypoints created</p>
      </div>

      <div 
        *ngFor="let wp of waypoints; trackBy: trackById" 
        class="waypoint-item"
        [class.selected]="selectedId === wp.id"
        (click)="select.emit(wp.id)"
      >
        <div class="wp-icon">
            <!-- Placeholder icon logic, maybe map type to icon name -->
            <app-icon [name]="'crosshair'" size="20"></app-icon>
        </div>
        
        <div class="wp-details">
          <div class="wp-name">{{ wp.name || 'Unnamed Waypoint' }}</div>
          <div class="wp-coords" *ngIf="wp.position as pos; else missingCoords">
            {{ pos.latitude | latFormat }} / {{ pos.longitude | lonFormat }}
          </div>
          <ng-template #missingCoords>
            <div class="wp-coords">—</div>
          </ng-template>
        </div>

        <div class="wp-actions">
           <app-button 
             variant="ghost" 
             size="sm" 
             (click)="$event.stopPropagation(); edit.emit(wp.id)"
             title="Edit"
            >
             <app-icon name="edit" size="18"></app-icon>
           </app-button>
           <app-button 
             variant="ghost" 
             size="sm" 
             class="danger-hover"
             (click)="$event.stopPropagation(); delete.emit(wp.id)"
             title="Delete"
            >
             <app-icon name="trash" size="18"></app-icon>
           </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .waypoint-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .empty-state {
        padding: 3rem;
        text-align: center;
        color: var(--text-tertiary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }
    .empty-icon {
        opacity: 0.5;
    }
    .waypoint-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--surface-2);
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .waypoint-item:hover {
        background: var(--surface-3);
    }
    .waypoint-item.selected {
        border-color: var(--primary);
        background: var(--surface-3);
    }
    .wp-icon {
        color: var(--text-secondary);
        display: flex;
        align-items: center;
    }
    .wp-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .wp-name {
        font-weight: 600;
        color: var(--text-primary);
    }
    .wp-coords {
        font-size: 0.75rem;
        font-family: var(--font-mono);
        color: var(--text-secondary);
    }
    .wp-actions {
        display: flex;
        gap: 0.25rem;
        opacity: 0.6;
        transition: opacity 0.2s;
    }
    .waypoint-item:hover .wp-actions {
        opacity: 1;
    }
    .danger-hover:hover {
        color: var(--danger);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaypointListComponent {
  @Input() waypoints: Waypoint[] = [];
  @Input() selectedId: string | null = null;
  
  @Output() select = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  trackById(_index: number, item: Waypoint): string {
    return item.id;
  }
}
