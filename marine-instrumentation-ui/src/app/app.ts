import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { filter, timeout, catchError } from 'rxjs/operators';
import { AppShellComponent } from './ui/layout/app-shell/app-shell.component';
import { AppToastContainerComponent } from './shared/components/app-toast/app-toast-container/app-toast-container.component';
import { MOBAlertComponent } from './features/alarms/components/mob-alert/mob-alert.component';
import { SplashScreenComponent } from './core/splash/splash-screen.component';
import { SplashService } from './core/splash/splash.service';
import { OnboardingOverlayComponent } from './core/onboarding/onboarding-overlay.component';
import { OnboardingService } from './core/onboarding/onboarding.service';
import { TourHighlightComponent } from './core/onboarding/tour/tour-highlight.component';
import { SignalKClientService } from './data-access/signalk/signalk-client.service';
import { VesselEnrichmentService } from './data-access/vessel-enrichment/vessel-enrichment.service';
import { SignalKHostDetectorService } from './core/services/signalk-host-detector.service';
import { EnvironmentStateService } from './core/services/environment-state.service';
import { buildEnvironment } from './core/config/app-environment.token';

type ThemeMode = 'day' | 'night';

const LEGACY_THEME_KEY = 'omi-theme';
const PREFERENCES_STORAGE_KEY = 'omi-preferences';
/** Canonical preferences store (PreferencesService v2) — single source of theme truth. */
const PREFERENCES_V2_STORAGE_KEY = 'omi-preferences-v2';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AppShellComponent,
    AppToastContainerComponent,
    MOBAlertComponent,
    SplashScreenComponent,
    OnboardingOverlayComponent,
    TourHighlightComponent,
  ],
  template: `
    <!-- Layer 1: Splash Screen -->
    @if (showSplash()) {
      <app-splash-screen />
    }

    <!-- Layer 2: App (rendered after splash) -->
    @if (!showSplash()) {
      <!-- Layer 2a: Onboarding overlay (first visit) -->
      @if (showOnboarding()) {
        <app-onboarding-overlay />
      }

      <!-- Layer 2b: App shell -->
      <app-app-shell></app-app-shell>
      @if (!showOnboarding()) {
        <app-mob-alert></app-mob-alert>
      }
      <app-toast-container></app-toast-container>

      <!-- Layer 2c: Tour highlight (when active) -->
      <app-tour-highlight />
    }
  `,
})
export class AppComponent implements OnInit {
  private readonly splash = inject(SplashService);
  private readonly onboarding = inject(OnboardingService);
  private readonly signalK = inject(SignalKClientService);
  private readonly enrichmentService = inject(VesselEnrichmentService);
  private readonly hostDetector = inject(SignalKHostDetectorService);
  private readonly envState = inject(EnvironmentStateService);

  readonly showSplash = toSignal(this.splash.visible$, { initialValue: true });
  readonly showOnboarding = toSignal(this.onboarding.shouldShowOnboarding$, {
    initialValue: false,
  });

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => this.enrichmentService.purgeExpiredCache(), 5000);

    const savedTheme = this.resolveInitialTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);

    // Drive splash status messages
    this.splash.updateStatus('Loading instruments...');

    // Brief delay for visual pacing
    await new Promise((resolve) => setTimeout(resolve, 400));

    // ── Phase 1: Auto-detect Signal K host ──────────────────────────────
    this.splash.updateStatus('Searching for Signal K server...');
    const signalKHost = await this.hostDetector.detect();

    const env = buildEnvironment(signalKHost);
    this.envState.updateEnv(env);
    this.splash.updateStatus(`Connecting to ${signalKHost}...`);

    // ── Phase 2: Connect to detected host ───────────────────────────────
    this.signalK.connect(env.signalKWsUrl);

    // Wait for Signal K connection or timeout
    await firstValueFrom(
      this.signalK.connected$.pipe(
        filter((c) => c === true),
        timeout(3000),
        catchError(() => of(false)),
      ),
    );

    this.splash.updateStatus('Ready');
    await this.splash.hideSplash();
  }

  private resolveInitialTheme(): ThemeMode {
    // Canonical store first (where PreferencesService persists), then legacy fallbacks.
    const v2Theme = this.readThemeFromStore(PREFERENCES_V2_STORAGE_KEY);
    if (v2Theme) {
      return v2Theme;
    }

    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === 'day' || legacyTheme === 'night') {
      return legacyTheme;
    }

    return this.readThemeFromStore(PREFERENCES_STORAGE_KEY) ?? 'night';
  }

  private readThemeFromStore(key: string): ThemeMode | null {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as { theme?: unknown };
      return parsed.theme === 'day' || parsed.theme === 'night' ? parsed.theme : null;
    } catch {
      return null;
    }
  }
}
