import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopBarComponent } from '../top-bar/top-bar.component';
import { AlarmBannerComponent } from '../alarm-banner/alarm-banner.component';
import { ThemeService } from '../../../core/theme/theme.service';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';

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

  theme$ = this.themeService.theme$;
  connected$ = this.signalK.connected$;
  isNight$ = this.themeService.theme$.pipe(
    // map(t => t === 'night') // simpler to just use async pipe on string, but TopBar expects boolean?
    // Let's check TopBar input. It accepts boolean | null. So we need to map.
    // Wait, async pipe in template will resolve to string 'day' | 'night'.
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
}
