import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../../../state/app/app-state.service';

@Component({
  selector: 'app-data-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2>Data &amp; Privacy</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Reset Onboarding</span>
          <span class="setting-description">Show the setup wizard again on next launch.</span>
        </div>
        <button type="button" class="action-btn" (click)="resetOnboarding()">
          Reset
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Clear Cached Tiles</span>
          <span class="setting-description">Remove locally stored map tiles. They will be re-downloaded as needed.</span>
        </div>
        <button type="button" class="action-btn" (click)="clearTileCache()">
          Clear
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Clear All Preferences</span>
          <span class="setting-description">Reset all settings to defaults. This cannot be undone.</span>
        </div>
        <button type="button" class="action-btn action-btn--danger" (click)="clearAllData()">
          Clear All
        </button>
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

    .action-btn {
      height: 36px;
      padding: 0 var(--space-3);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--bg-elevated, var(--bg-surface));
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 6px);
      cursor: pointer;
    }

    .action-btn--danger {
      color: var(--danger, #bf616a);
      border-color: var(--danger, #bf616a);
    }
  `],
})
export class DataSettingsComponent {
  private readonly appState = inject(AppStateService);

  resetOnboarding(): void {
    this.appState.resetOnboarding();
  }

  clearTileCache(): void {
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          if (name.includes('tile') || name.includes('osm') || name.includes('openseamap')) {
            caches.delete(name);
          }
        }
      });
    }
  }

  clearAllData(): void {
    if (confirm('Are you sure? This will reset all settings to defaults.')) {
      localStorage.clear();
      location.reload();
    }
  }
}
