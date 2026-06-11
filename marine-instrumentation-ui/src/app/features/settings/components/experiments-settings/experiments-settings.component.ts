import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { AppToggleComponent } from '../../../../shared/components/app-toggle/app-toggle.component';

@Component({
  selector: 'app-experiments-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppToggleComponent],
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
        <app-toggle
          [ngModel]="(prefs.prefs$ | async)?.theme === 'night'"
          (ngModelChange)="toggleNightMode()"
        ></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Advanced Instruments</span>
          <span class="setting-description">Show experimental instrument widgets on the dashboard.</span>
        </div>
        <app-toggle
          [ngModel]="experimentalInstruments"
          (ngModelChange)="toggleExperimentalInstruments()"
        ></app-toggle>
      </div>
    </div>
  `,
  styles: [`
    .settings-section h2 {
      margin: 0 0 var(--space-2) 0;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--gb-text-value);
    }

    .experiments-note {
      margin: 0 0 var(--space-4) 0;
      font-size: 0.75rem;
      color: var(--gb-text-muted);
      font-style: italic;
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .setting-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gb-text-value);
    }

    .setting-description {
      font-size: 0.75rem;
      color: var(--gb-text-muted);
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
