import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { map, filter, startWith } from 'rxjs';
import { TopBarComponent } from '../top-bar/top-bar.component';
import { AlarmBannerComponent } from '../alarm-banner/alarm-banner.component';
import { ThemeService } from '../../../core/theme/theme.service';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';
import { AlarmsFacadeService } from '../../../features/alarms/services/alarms-facade.service';
import { AlarmSeverity, AlarmState } from '../../../state/alarms/alarm.models';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, TopBarComponent, AlarmBannerComponent],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private themeService = inject(ThemeService);
  private signalK = inject(SignalKClientService);
  private alarmsFacade = inject(AlarmsFacadeService);
  private router = inject(Router);

  theme$ = this.themeService.theme$;
  connected$ = this.signalK.connected$;

  alarmCount$ = this.alarmsFacade.activeAlarms$.pipe(
    map((alarms) => alarms.length)
  );
  criticalCount$ = this.alarmsFacade.activeAlarms$.pipe(
    map((alarms) => alarms.filter((alarm) =>
      alarm.severity === AlarmSeverity.Critical || alarm.severity === AlarmSeverity.Emergency
    ).length)
  );
  hasUnacknowledged$ = this.alarmsFacade.activeAlarms$.pipe(
    map((alarms) => alarms.some((alarm) => alarm.state === AlarmState.Active))
  );

  /** Whether current route is exactly /chart (for chart mode: hide sidenav, compact top bar). */
  isChartRoute$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map((e) => this.isChartRoute(e.urlAfterRedirects)),
    startWith(this.isChartRoute(this.router.url))
  );

  navCollapsed = true;

  constructor() {
    this.signalK.connect();
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  toggleNav() {
    this.navCollapsed = !this.navCollapsed;
    this.requestChartReflow();
  }

  handleMainAreaClick(event: MouseEvent): void {
    if (this.navCollapsed || !this.isChartRoute(this.router.url)) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.chart-nav-hamburger')) {
      return;
    }

    this.navCollapsed = true;
    this.requestChartReflow();
  }

  navigateToAlarms(): void {
    this.router.navigate(['/alarms']);
  }

  private requestChartReflow(): void {
    // Single resize after the CSS transition (~300ms) so MapLibre repaints once on the final layout.
    setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  }

  private isChartRoute(url: string): boolean {
    const path = url.split('?')[0]?.split('#')[0] ?? url;
    return path === '/chart';
  }
}
