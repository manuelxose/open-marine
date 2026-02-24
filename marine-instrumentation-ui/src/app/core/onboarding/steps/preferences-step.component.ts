import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { PreferencesService, type SpeedUnit, type DepthUnit, type ThemeMode } from '../../services/preferences.service';
import { LanguageService, type Language } from '../../services/language.service';

@Component({
  selector: 'app-preferences-step',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preferences-step">
      <h2 class="step-title">⚙️ {{ 'onboarding.preferences.title' | translate }}</h2>

      <!-- Language -->
      <div class="pref-group">
        <label class="pref-label">{{ 'onboarding.preferences.language' | translate }}</label>
        <select
          class="pref-select"
          [value]="currentLang()"
          (change)="onLanguageChange($event)"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      <!-- Theme -->
      <div class="pref-group">
        <label class="pref-label">{{ 'onboarding.preferences.theme' | translate }}</label>
        <div class="option-group">
          <button
            class="option-pill"
            [class.selected]="currentTheme() === 'day'"
            (click)="setTheme('day')"
          >
            ☀️ {{ 'onboarding.preferences.day' | translate }}
          </button>
          <button
            class="option-pill"
            [class.selected]="currentTheme() === 'night'"
            (click)="setTheme('night')"
          >
            🌙 {{ 'onboarding.preferences.night' | translate }}
          </button>
        </div>
      </div>

      <!-- Speed Unit -->
      <div class="pref-group">
        <label class="pref-label">{{ 'onboarding.preferences.speedUnit' | translate }}</label>
        <div class="option-group">
          <button
            class="option-pill"
            [class.selected]="currentSpeedUnit() === 'kn'"
            (click)="setSpeedUnit('kn')"
          >kn</button>
          <button
            class="option-pill"
            [class.selected]="currentSpeedUnit() === 'm/s'"
            (click)="setSpeedUnit('m/s')"
          >m/s</button>
          <button
            class="option-pill"
            [class.selected]="currentSpeedUnit() === 'km/h'"
            (click)="setSpeedUnit('km/h')"
          >km/h</button>
        </div>
      </div>

      <!-- Depth Unit -->
      <div class="pref-group">
        <label class="pref-label">{{ 'onboarding.preferences.depthUnit' | translate }}</label>
        <div class="option-group">
          <button
            class="option-pill"
            [class.selected]="currentDepthUnit() === 'm'"
            (click)="setDepthUnit('m')"
          >m</button>
          <button
            class="option-pill"
            [class.selected]="currentDepthUnit() === 'ft'"
            (click)="setDepthUnit('ft')"
          >ft</button>
        </div>
      </div>

      <div class="wizard-nav">
        <button class="btn-secondary" (click)="back.emit()">
          ← {{ 'onboarding.back' | translate }}
        </button>
        <button class="btn-primary" (click)="next.emit()">
          {{ 'onboarding.next' | translate }} →
        </button>
      </div>
    </div>
  `,
  styles: [`
    .preferences-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 420px;
    }

    .step-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gb-text-value, #eceff4);
      margin-bottom: 1.5rem;
    }

    .pref-group {
      width: 100%;
      margin-bottom: 1.25rem;
    }

    .pref-label {
      display: block;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gb-text-muted, #7b88a0);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }

    .pref-select {
      width: 100%;
      background: var(--gb-bg-bezel, #1e2231);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      color: var(--gb-text-value, #eceff4);
      padding: 0.6rem 1rem;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      cursor: pointer;
      min-height: 44px;
    }

    .pref-select:focus {
      outline: none;
      border-color: var(--gb-accent, #4a90d9);
    }

    .option-group {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .option-pill {
      padding: 0.6rem 1.25rem;
      border: 2px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      background: var(--gb-bg-panel, #1e2231);
      color: var(--gb-text-muted, #7b88a0);
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      min-height: 44px;
    }

    .option-pill.selected {
      border-color: var(--gb-accent, #4a90d9);
      background: rgba(74, 144, 217, 0.1);
      color: var(--gb-accent, #4a90d9);
    }

    .option-pill:hover:not(.selected) {
      border-color: var(--gb-text-muted, #7b88a0);
    }

    .wizard-nav {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn-primary {
      background: var(--gb-accent, #4a90d9);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      min-height: 44px;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: transparent;
      color: var(--gb-text-muted, #7b88a0);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
    }

    .btn-secondary:hover {
      border-color: var(--gb-text-muted, #7b88a0);
      color: var(--gb-text-value, #eceff4);
    }
  `],
})
export class PreferencesStepComponent {
  next = output();
  back = output();

  private readonly prefs = inject(PreferencesService);
  private readonly lang = inject(LanguageService);

  currentLang = signal<Language>(this.lang.getCurrentLanguage());
  currentTheme = signal<ThemeMode>(this.prefs.snapshot.theme);
  currentSpeedUnit = signal<SpeedUnit>(this.prefs.snapshot.speedUnit);
  currentDepthUnit = signal<DepthUnit>(this.prefs.snapshot.depthUnit);

  onLanguageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Language;
    this.lang.setLanguage(value);
    this.currentLang.set(value);
  }

  setTheme(theme: ThemeMode): void {
    this.prefs.setTheme(theme);
    this.currentTheme.set(theme);
  }

  setSpeedUnit(unit: SpeedUnit): void {
    this.prefs.setSpeedUnit(unit);
    this.currentSpeedUnit.set(unit);
  }

  setDepthUnit(unit: DepthUnit): void {
    this.prefs.setDepthUnit(unit);
    this.currentDepthUnit.set(unit);
  }
}
