import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface RouteEditorWaypoint {
  id: string;
  name: string;
  bearingToNextDeg?: number | null;
  distanceToNextNm?: number | null;
}

export interface RouteEditorReorderEvent {
  id: string;
  direction: 'up' | 'down';
}

@Component({
  selector: 'app-route-editor-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <section class="route-editor-pattern">
      <header class="route-editor-pattern__header">
        <div class="route-editor-pattern__name-wrap">
          <label class="route-editor-pattern__label" for="routeNameInput">Route Name</label>
          <input
            id="routeNameInput"
            class="route-editor-pattern__name-input"
            [disabled]="!editing"
            [value]="routeName"
            (input)="rename($event)"
          />
        </div>
        <span class="route-editor-pattern__mode-pill">{{ editing ? 'EDITING' : 'VIEWING' }}</span>
      </header>

      <div class="route-editor-pattern__list">
        <div
          class="route-editor-pattern__item"
          *ngFor="let wp of waypoints; let i = index; let first = first; let last = last"
        >
          <span class="route-editor-pattern__index">{{ i + 1 }}</span>

          <div class="route-editor-pattern__info">
            <p class="route-editor-pattern__name">{{ wp.name }}</p>
            <p class="route-editor-pattern__leg" *ngIf="wp.distanceToNextNm !== null && wp.distanceToNextNm !== undefined">
              BRG {{ formatBearing(wp.bearingToNextDeg) }} · DST {{ wp.distanceToNextNm.toFixed(1) }} nm
            </p>
          </div>

          <div class="route-editor-pattern__controls" *ngIf="editing">
            <button
              type="button"
              class="route-editor-pattern__ctrl-btn"
              [disabled]="first"
              (click)="onReorder.emit({ id: wp.id, direction: 'up' })"
              aria-label="Move waypoint up"
            >
              <app-icon name="chevron-up" size="14"></app-icon>
            </button>
            <button
              type="button"
              class="route-editor-pattern__ctrl-btn"
              [disabled]="last"
              (click)="onReorder.emit({ id: wp.id, direction: 'down' })"
              aria-label="Move waypoint down"
            >
              <app-icon name="chevron-down" size="14"></app-icon>
            </button>
            <button
              type="button"
              class="route-editor-pattern__ctrl-btn"
              (click)="onRemoveWaypoint.emit(wp.id)"
              aria-label="Remove waypoint"
            >
              <app-icon name="x" size="14"></app-icon>
            </button>
          </div>
        </div>

        <div class="route-editor-pattern__empty" *ngIf="waypoints.length === 0">
          <app-icon name="route" size="16"></app-icon>
          <span>No waypoints in route</span>
        </div>
      </div>

      <footer class="route-editor-pattern__actions" *ngIf="editing">
        <app-button size="sm" variant="secondary" label="Add Waypoint" (action)="onAddWaypoint.emit()"></app-button>
      </footer>
    </section>
  `,
  styleUrls: ['./route-editor-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteEditorPatternComponent {
  @Input() routeName = '';
  @Input() waypoints: RouteEditorWaypoint[] = [];
  @Input() editing = false;

  @Output() onRename = new EventEmitter<string>();
  @Output() onReorder = new EventEmitter<RouteEditorReorderEvent>();
  @Output() onRemoveWaypoint = new EventEmitter<string>();
  @Output() onAddWaypoint = new EventEmitter<void>();

  rename(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.onRename.emit(value);
  }

  formatBearing(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '---';
    }
    return Math.round(value).toString().padStart(3, '0');
  }
}
