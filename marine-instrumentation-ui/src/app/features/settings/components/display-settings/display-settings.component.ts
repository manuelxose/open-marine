import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreferencesService } from '../../../../services/preferences.service';
import { ThemeService } from '../../../../core/theme/theme.service';

@Component({
  selector: 'app-display-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="prefs.preferences$ | async as p">
      <h2>Display</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Theme</span>
          <span class="setting-description">Switch between Day and Night color modes.</span>
        </div>
        <div class="theme-toggle">
          <button
            type="button"
            class="theme-btn"
            [class.active]="p.theme === 'day'"
            (click)="theme.setTheme('day')"
          >
            Day
          </button>
          <button
            type="button"
            class="theme-btn"
            [class.active]="p.theme === 'night'"
            (click)="theme.setTheme('night')"
          >
            Night
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Density</span>
          <span class="setting-description">Choose between comfortable and compact layout density.</span>
        </div>
        <div class="theme-toggle">
          <button
            type="button"
            class="theme-btn"
            [class.active]="p.density === 'comfortable'"
            (click)="prefs.setDensity('comfortable')"
          >
            Comfortable
          </button>
          <button
            type="button"
            class="theme-btn"
            [class.active]="p.density === 'compact'"
            (click)="prefs.setDensity('compact')"
          >
            Compact
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-section h2 {
      margin: 0 0 var(--space-4) 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
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

    .theme-toggle {
      display: flex;
      gap: var(--space-1);
    }

    .theme-btn {
      height: 32px;
      padding: 0 var(--space-3);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--bg-base);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 6px);
      cursor: pointer;
      transition: border-color 0.15s;
    }

    .theme-btn.active {
      color: var(--accent, #88c0d0);
      border-color: var(--accent, #88c0d0);
    }
  `],
})
export class DisplaySettingsComponent {
  readonly prefs = inject(PreferencesService);
  readonly theme = inject(ThemeService);
}
