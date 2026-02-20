import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreferencesService } from '../../../../core/services/preferences.service';

@Component({
  selector: 'app-experiments-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2>Experiments</h2>
      <p class="experiments-note">
        These features are under active development. They may change or be removed in future releases.
      </p>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Night Mode Beta</span>
          <span class="setting-description">Enable automatic day/night theme switching based on local time.</span>
        </div>
        <button
          (click)="toggleNightMode()"
          class="toggle-btn"
          [class.active]="(prefs.prefs$ | async)?.theme === 'night'"
        >
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Advanced Instruments</span>
          <span class="setting-description">Show experimental instrument widgets on the dashboard.</span>
        </div>
        <button
          (click)="toggleExperimentalInstruments()"
          class="toggle-btn"
          [class.active]="experimentalInstruments"
        >
          <span class="toggle-slider"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-section h2 {
      margin: 0 0 var(--space-2) 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .experiments-note {
      margin: 0 0 var(--space-4) 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-default);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .setting-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .setting-description {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .toggle-btn {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--bg-elevated, var(--bg-surface));
      border: 1px solid var(--border-default);
      border-radius: 12px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s, border-color 0.2s;
    }

    .toggle-btn.active {
      background: var(--accent, #88c0d0);
      border-color: var(--accent, #88c0d0);
    }

    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: var(--text-primary);
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .toggle-btn.active .toggle-slider {
      transform: translateX(20px);
    }
  `],
})
export class ExperimentsSettingsComponent {
  readonly prefs = inject(PreferencesService);
  experimentalInstruments = false;

  toggleNightMode(): void {
    this.prefs.toggleTheme();
  }

  toggleExperimentalInstruments(): void {
    this.experimentalInstruments = !this.experimentalInstruments;
  }
}
