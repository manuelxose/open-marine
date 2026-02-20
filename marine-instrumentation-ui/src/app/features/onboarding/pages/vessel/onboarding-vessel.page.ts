import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VesselProfileService } from '../../../../state/vessel/vessel-profile.service';
import { PreferencesService, type SpeedUnit, type DepthUnit, type ThemeMode } from '../../../../services/preferences.service';
import { AppStateService } from '../../../../state/app/app-state.service';

@Component({
  selector: 'app-onboarding-vessel',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="onboarding-page">
      <div class="onboarding-card">
        <a class="back-link" routerLink="/onboarding/connection">&larr; Back</a>

        <h1 class="onboarding-title">Vessel Setup</h1>
        <p class="onboarding-subtitle">Step 2 of 2</p>

        <form (ngSubmit)="finish()" class="form">
          <!-- Vessel Name -->
          <div class="field">
            <label class="field-label" for="vessel-name">Vessel Name</label>
            <input
              id="vessel-name"
              type="text"
              class="field-input"
              [(ngModel)]="vesselName"
              name="vesselName"
              placeholder="e.g. S/V Wanderer"
              autocomplete="off"
            />
          </div>

          <!-- MMSI -->
          <div class="field">
            <label class="field-label" for="mmsi">MMSI <span class="optional">(optional)</span></label>
            <input
              id="mmsi"
              type="text"
              class="field-input"
              [(ngModel)]="mmsi"
              name="mmsi"
              placeholder="e.g. 123456789"
              maxlength="9"
              pattern="[0-9]*"
              autocomplete="off"
            />
          </div>

          <!-- Units row -->
          <div class="field-row-2">
            <div class="field">
              <label class="field-label" for="speed-unit">Speed Unit</label>
              <select id="speed-unit" class="field-select" [(ngModel)]="speedUnit" name="speedUnit">
                <option value="kn">Knots (kn)</option>
                <option value="km/h">km/h</option>
                <option value="m/s">m/s</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label" for="depth-unit">Depth Unit</label>
              <select id="depth-unit" class="field-select" [(ngModel)]="depthUnit" name="depthUnit">
                <option value="m">Meters (m)</option>
                <option value="ft">Feet (ft)</option>
              </select>
            </div>
          </div>

          <!-- Theme -->
          <div class="field">
            <label class="field-label">Display Theme</label>
            <div class="theme-toggle">
              <button
                type="button"
                class="theme-btn"
                [class.active]="theme === 'day'"
                (click)="theme = 'day'"
              >
                ☀️ Day
              </button>
              <button
                type="button"
                class="theme-btn"
                [class.active]="theme === 'night'"
                (click)="theme = 'night'"
              >
                🌙 Night
              </button>
            </div>
          </div>

          <button class="onboarding-btn onboarding-btn--primary" type="submit">
            Finish Setup
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .onboarding-page {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--space-4);
      background: var(--bg-base);
    }

    .onboarding-card {
      width: 100%;
      max-width: 480px;
      padding: var(--space-8);
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl, 12px);
    }

    .back-link {
      display: inline-block;
      margin-bottom: var(--space-4);
      font-size: 0.8125rem;
      color: var(--text-secondary);
      text-decoration: none;
    }
    .back-link:hover { color: var(--text-primary); }

    .onboarding-title {
      margin: 0 0 var(--space-1) 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .onboarding-subtitle {
      margin: 0 0 var(--space-6) 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .field-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }

    .field-label {
      display: block;
      margin-bottom: var(--space-1);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .optional {
      font-weight: 400;
      color: var(--text-muted, var(--text-secondary));
      opacity: 0.7;
    }

    .field-input,
    .field-select {
      width: 100%;
      height: 44px;
      padding: 0 var(--space-3);
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--bg-base);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 8px);
      outline: none;
    }

    .field-input:focus,
    .field-select:focus {
      border-color: var(--accent, #88c0d0);
    }

    .field-select {
      appearance: none;
      cursor: pointer;
    }

    .theme-toggle {
      display: flex;
      gap: var(--space-2);
    }

    .theme-btn {
      flex: 1;
      height: 44px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--bg-base);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }

    .theme-btn.active {
      color: var(--accent, #88c0d0);
      border-color: var(--accent, #88c0d0);
    }

    .onboarding-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      padding: 0 var(--space-6);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: var(--radius-md, 8px);
      border: none;
      cursor: pointer;
      margin-top: var(--space-4);
      transition: opacity 0.15s ease;
    }

    .onboarding-btn:hover { opacity: 0.9; }

    .onboarding-btn--primary {
      color: var(--bg-base, #0b1116);
      background: var(--accent, #88c0d0);
    }
  `],
})
export class OnboardingVesselPage {
  private readonly router = inject(Router);
  private readonly vesselProfile = inject(VesselProfileService);
  private readonly preferences = inject(PreferencesService);
  private readonly appState = inject(AppStateService);

  vesselName = '';
  mmsi = '';
  speedUnit: SpeedUnit = 'kn';
  depthUnit: DepthUnit = 'm';
  theme: ThemeMode = 'night';

  finish(): void {
    // Save vessel profile
    this.vesselProfile.update({
      name: this.vesselName.trim(),
      mmsi: this.mmsi.trim(),
    });

    // Save preferences
    this.preferences.setSpeedUnit(this.speedUnit);
    this.preferences.setDepthUnit(this.depthUnit);
    this.preferences.setTheme(this.theme);

    // Mark onboarding complete
    this.appState.completeOnboarding();

    // Navigate to chart (home)
    this.router.navigate(['/chart']);
  }
}
