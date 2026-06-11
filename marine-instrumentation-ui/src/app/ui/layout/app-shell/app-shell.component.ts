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

  /** Whether current route is /chart (for chart mode: hide sidenav, compact top bar) */
  isChartRoute$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map((e) => e.urlAfterRedirects.startsWith('/chart')),
    startWith(this.router.url.startsWith('/chart'))
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
    if (this.navCollapsed || !this.router.url.startsWith('/chart')) {
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

  /**
   * Force chart/map reflow after shell layout transitions (hamburger open/close).
   * MapLibre listens to window resize events and repaints accordingly.
   */
  private requestChartReflow(): void {
    // Immediate frame + transition checkpoints (CSS transitions are ~300ms).
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  }
}
