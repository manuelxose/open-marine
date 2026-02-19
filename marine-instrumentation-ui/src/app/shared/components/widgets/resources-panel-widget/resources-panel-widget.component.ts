import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTabsComponent, TabItem } from '../../composites/app-tabs/app-tabs.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { WaypointCardData } from '../../patterns/waypoint-card-pattern/waypoint-card-pattern.component';
import { WaypointListPatternComponent } from '../../patterns/waypoint-list-pattern/waypoint-list-pattern.component';
import { RouteCardData } from '../../patterns/route-card-pattern/route-card-pattern.component';
import { RouteListPatternComponent } from '../../patterns/route-list-pattern/route-list-pattern.component';
import { TrackCardData, TrackCardPatternComponent } from '../../patterns/track-card-pattern/track-card-pattern.component';

export type ResourcesPanelTab = 'waypoints' | 'routes' | 'tracks';

@Component({
  selector: 'app-resources-panel-widget',
  standalone: true,
  imports: [
    CommonModule,
    AppTabsComponent,
    AppIconComponent,
    WaypointListPatternComponent,
    RouteListPatternComponent,
    TrackCardPatternComponent
  ],
  template: `
    <section class="resources-panel-widget">
      <header class="resources-panel-widget__header">
        <div>
          <p class="resources-panel-widget__title">Resources Panel</p>
          <p class="resources-panel-widget__subtitle">
            {{ waypoints.length }} waypoints | {{ routes.length }} routes | {{ tracks.length }} tracks
          </p>
        </div>
      </header>

      <app-tabs
        [items]="tabItems()"
        [variant]="'segment'"
        [activeTab]="activeTab"
        (activeTabChange)="handleTabChange($event)"
      />

      <div class="resources-panel-widget__content">
        <ng-container [ngSwitch]="activeTab">
          <app-waypoint-list-pattern
            *ngSwitchCase="'waypoints'"
            [waypoints]="waypoints"
            [activeId]="activeWaypointId"
            [reorderable]="false"
            (onSelect)="onWaypointSelect.emit($event)"
          />

          <app-route-list-pattern
            *ngSwitchCase="'routes'"
            [routes]="routes"
            [activeId]="activeRouteId"
            (onSelect)="onRouteSelect.emit($event)"
          />

          <div class="resources-panel-widget__tracks" *ngSwitchCase="'tracks'">
            <ng-container *ngIf="tracks.length > 0; else emptyTracks">
              <app-track-card-pattern
                *ngFor="let track of tracks; trackBy: trackByTrackId"
                [track]="track"
                (onView)="onTrackSelect.emit($event)"
              />
            </ng-container>
            <ng-template #emptyTracks>
              <div class="resources-panel-widget__empty">
                <app-icon name="track" size="18"></app-icon>
                <span>No tracks available</span>
              </div>
            </ng-template>
          </div>
        </ng-container>
      </div>
    </section>
  `,
  styleUrls: ['./resources-panel-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourcesPanelWidgetComponent {
  @Input() waypoints: WaypointCardData[] = [];
  @Input() routes: RouteCardData[] = [];
  @Input() tracks: TrackCardData[] = [];
  @Input() activeTab: ResourcesPanelTab = 'waypoints';
  @Input() activeWaypointId: string | null = null;
  @Input() activeRouteId: string | null = null;

  @Output() onTabChange = new EventEmitter<ResourcesPanelTab>();
  @Output() onWaypointSelect = new EventEmitter<string>();
  @Output() onRouteSelect = new EventEmitter<string>();
  @Output() onTrackSelect = new EventEmitter<string>();

  tabItems(): TabItem[] {
    return [
      { id: 'waypoints', label: 'Waypoints', count: this.waypoints.length },
      { id: 'routes', label: 'Routes', count: this.routes.length },
      { id: 'tracks', label: 'Tracks', count: this.tracks.length }
    ];
  }

  handleTabChange(tab: string | number): void {
    if (tab !== 'waypoints' && tab !== 'routes' && tab !== 'tracks') {
      return;
    }
    this.onTabChange.emit(tab);
  }

  trackByTrackId(_: number, item: TrackCardData): string {
    return item.id;
  }
}

