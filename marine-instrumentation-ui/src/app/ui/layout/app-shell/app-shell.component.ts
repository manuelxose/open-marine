import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { TopBarComponent } from '../top-bar/top-bar.component';
import { AlarmBannerComponent } from '../alarm-banner/alarm-banner.component';
import { ThemeService } from '../../../core/theme/theme.service';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AlarmsFacadeService } from '../../../features/alarms/services/alarms-facade.service';
import { AlarmSeverity, AlarmState } from '../../../state/alarms/alarm.models';
import { DiagnosticsService } from '../../../services/diagnostics.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, TopBarComponent, AlarmBannerComponent, TranslatePipe],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private themeService = inject(ThemeService);
  private signalK = inject(SignalKClientService);
  private alarmsFacade = inject(AlarmsFacadeService);
  private diagnostics = inject(DiagnosticsService);
  private router = inject(Router);

  theme$ = this.themeService.theme$;
  connected$ = this.signalK.connected$;
  latency$ = this.diagnostics.state$.pipe(map((state) => state.avgLatencyMs));

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

  navCollapsed = false;

  constructor() {
    this.signalK.connect();
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  toggleNav() {
    this.navCollapsed = !this.navCollapsed;
  }

  navigateToAlarms(): void {
    this.router.navigate(['/alarms']);
  }
}
