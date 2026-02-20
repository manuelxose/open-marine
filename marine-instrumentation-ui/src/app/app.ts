import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { AppShellComponent } from './ui/layout/app-shell/app-shell.component';
import { AppToastContainerComponent } from './shared/components/app-toast/app-toast-container/app-toast-container.component';
import { MOBAlertComponent } from './features/alarms/components/mob-alert/mob-alert.component';

type ThemeMode = 'day' | 'night';

const LEGACY_THEME_KEY = 'omi-theme';
const PREFERENCES_STORAGE_KEY = 'omi-preferences';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent, AppToastContainerComponent, MOBAlertComponent],
  template: `
    <app-app-shell></app-app-shell>
    <app-mob-alert></app-mob-alert>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent implements OnInit {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedTheme = this.resolveInitialTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
  }

  private resolveInitialTheme(): ThemeMode {
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === 'day' || legacyTheme === 'night') {
      return legacyTheme;
    }

    const preferencesRaw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!preferencesRaw) {
      return 'night';
    }

    try {
      const parsed = JSON.parse(preferencesRaw) as { theme?: unknown };
      return parsed.theme === 'day' || parsed.theme === 'night' ? parsed.theme : 'night';
    } catch {
      return 'night';
    }
  }
}
