import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { RouteCardData, RouteCardPatternComponent } from '../route-card-pattern/route-card-pattern.component';

@Component({
  selector: 'app-route-list-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent, RouteCardPatternComponent],
  template: `
    <section class="route-list-pattern">
      <header class="route-list-pattern__header">
        <p class="route-list-pattern__title">Route List</p>
        <span class="route-list-pattern__count">{{ routes.length }}</span>
      </header>

      <ng-container *ngIf="routes.length > 0; else emptyState">
        <div class="route-list-pattern__rows">
          <app-route-card-pattern
            *ngFor="let route of routes; trackBy: trackById"
            [route]="route"
            [active]="activeId === route.id"
            (onSelect)="onSelect.emit(route.id)"
            (onActivate)="onActivate.emit(route.id)"
            (onEdit)="onEdit.emit(route.id)"
          />
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="route-list-pattern__empty">
          <app-icon name="route" size="18"></app-icon>
          <span>No routes available</span>
        </div>
      </ng-template>
    </section>
  `,
  styleUrls: ['./route-list-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteListPatternComponent {
  @Input() routes: RouteCardData[] = [];
  @Input() activeId: string | null = null;

  @Output() onSelect = new EventEmitter<string>();
  @Output() onActivate = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<string>();

  trackById(_index: number, item: RouteCardData): string {
    return item.id;
  }
}
