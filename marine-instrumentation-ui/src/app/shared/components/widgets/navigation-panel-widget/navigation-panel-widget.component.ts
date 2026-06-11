import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface NavigationPanelPosition {
  lat: number;
  lon: number;
}

export interface NavigationPanelCourse {
  cog: number;
  sog: number;
  heading: number;
}

export interface NavigationPanelWaypoint {
  name: string;
  distanceNm: number;
  bearingDeg: number;
  eta?: string | null;
}

export interface NavigationPanelRoute {
  name: string;
  progress: number;
  eta?: string | null;
}

@Component({
  selector: 'app-navigation-panel-widget',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="navigation-panel-widget">
      <header class="navigation-panel-widget__header">
        <p class="navigation-panel-widget__title">Navigation Panel</p>
      </header>

      <dl class="navigation-panel-widget__grid">
        <div class="navigation-panel-widget__card">
          <dt class="navigation-panel-widget__label">
            <app-icon name="target" size="14"></app-icon>
            Position
          </dt>
          <dd class="navigation-panel-widget__value">{{ formatPosition(position) }}</dd>
        </div>

        <div class="navigation-panel-widget__card">
          <dt class="navigation-panel-widget__label">
            <app-icon name="compass" size="14"></app-icon>
            Course
          </dt>
          <dd class="navigation-panel-widget__value">{{ formatCourse(course) }}</dd>
        </div>

        <div class="navigation-panel-widget__card">
          <dt class="navigation-panel-widget__label">
            <app-icon name="waypoint" size="14"></app-icon>
            Waypoint
          </dt>
          <dd class="navigation-panel-widget__value">{{ formatWaypoint(waypoint) }}</dd>
        </div>

        <div class="navigation-panel-widget__card">
          <dt class="navigation-panel-widget__label">
            <app-icon name="route" size="14"></app-icon>
            Route
          </dt>
          <dd class="navigation-panel-widget__value">{{ formatRoute(route) }}</dd>
        </div>
      </dl>
    </section>
  `,
  styleUrls: ['./navigation-panel-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationPanelWidgetComponent {
  @Input() position: NavigationPanelPosition | null = null;
  @Input() course: NavigationPanelCourse | null = null;
  @Input() waypoint: NavigationPanelWaypoint | null = null;
  @Input() route: NavigationPanelRoute | null = null;

  formatPosition(position: NavigationPanelPosition | null): string {
    if (!position) {
      return '--';
    }
    return `${position.lat.toFixed(4)}, ${position.lon.toFixed(4)}`;
  }

  formatCourse(course: NavigationPanelCourse | null): string {
    if (!course) {
      return '--';
    }
    return `COG ${this.padAngle(course.cog)} | HDG ${this.padAngle(course.heading)} | SOG ${course.sog.toFixed(1)} kn`;
  }

  formatWaypoint(waypoint: NavigationPanelWaypoint | null): string {
    if (!waypoint) {
      return '--';
    }
    const etaLabel = waypoint.eta ? ` | ETA ${waypoint.eta}` : '';
    return `${waypoint.name} | ${waypoint.distanceNm.toFixed(1)} nm | BRG ${this.padAngle(waypoint.bearingDeg)}${etaLabel}`;
  }

  formatRoute(route: NavigationPanelRoute | null): string {
    if (!route) {
      return '--';
    }
    const progress = this.clamp(route.progress, 0, 100);
    const etaLabel = route.eta ? ` | ETA ${route.eta}` : '';
    return `${route.name} | ${progress}%${etaLabel}`;
  }

  private padAngle(value: number): string {
    const normalized = ((Math.round(value) % 360) + 360) % 360;
    return `${normalized.toString().padStart(3, '0')}deg`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }
}

