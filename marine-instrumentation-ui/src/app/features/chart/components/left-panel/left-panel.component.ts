import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { AisTargetListComponent } from '../../../ais/components/ais-target-list/ais-target-list.component';
import { ChartWaypointListComponent } from '../chart-waypoint-list/chart-waypoint-list.component';
import { AisTarget } from '../../../../core/models/ais.model';
import {
  ChartLeftPanelTab,
  ChartRoutesPanelVm,
  ChartWaypointListVm,
} from '../../types/chart-vm';

@Component({
  selector: 'app-left-panel',
  standalone: true,
  imports: [
    CommonModule,
    AppIconComponent,
    AisTargetListComponent,
    ChartWaypointListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.scss'],
})
export class LeftPanelComponent {
  @Input() isOpen = true;
  @Input() activeTab: ChartLeftPanelTab = 'ais';
  @Input() waypointVm: ChartWaypointListVm | null = null;
  @Input() routesVm: ChartRoutesPanelVm | null = null;
  @Input() aisTargets: AisTarget[] = [];
  @Input() selectedAisMmsi: string | null = null;
  @Input() aisSortBy: 'distance' | 'cpa' | 'name' = 'distance';

  @Output() toggleOpen = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<ChartLeftPanelTab>();
  @Output() selectAisTarget = new EventEmitter<string>();
  @Output() aisSortByChange = new EventEmitter<'distance' | 'cpa' | 'name'>();
  @Output() followTarget = new EventEmitter<string>();

  @Output() selectWaypoint = new EventEmitter<string>();
  @Output() renameWaypoint = new EventEmitter<{ id: string; name: string }>();
  @Output() deleteWaypoint = new EventEmitter<string>();
  @Output() navigateWaypoint = new EventEmitter<string>();
  @Output() clearActiveWaypoint = new EventEmitter<void>();

  @Output() exportWaypointsGpx = new EventEmitter<void>();
  @Output() exportRouteGpx = new EventEmitter<void>();

  readonly tabs: { id: ChartLeftPanelTab; label: string; icon: 'ais' | 'waypoint' | 'route' }[] = [
    { id: 'ais', label: 'AIS', icon: 'ais' },
    { id: 'waypoints', label: 'Waypoints', icon: 'waypoint' },
    { id: 'routes', label: 'Routes', icon: 'route' },
  ];

  trackByRouteId(index: number, route: NonNullable<ChartRoutesPanelVm['routes']>[number]): string {
    return route.id || String(index);
  }
}
