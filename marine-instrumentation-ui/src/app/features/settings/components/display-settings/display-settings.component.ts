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
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--gb-text-value);
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

    .theme-toggle {
      display: flex;
      gap: 2px;
      padding: 3px;
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 10px;
    }

    .theme-btn {
      height: 30px;
      padding: 0 var(--space-3);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gb-text-muted);
      background: transparent;
      border: none;
      border-radius: 7px;
      cursor: pointer;
      transition: all 150ms ease;
      white-space: nowrap;
    }

    .theme-btn:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.04));
      color: var(--gb-text-value);
    }

    .theme-btn.active {
      background: rgba(74, 144, 217, 0.15);
      color: #4a90d9;
    }
  `],
})
export class DisplaySettingsComponent {
  readonly prefs = inject(PreferencesService);
  readonly theme = inject(ThemeService);
}
