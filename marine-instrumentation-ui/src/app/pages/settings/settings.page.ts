import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreferencesService } from '../../core/services/preferences.service';
import { ThemeService } from '../../core/theme/theme.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>Settings</h1>
        <p class="subtitle">Customize your MFD experience</p>
      </div>

      <div class="settings-sections">
        
        <!-- Appearance Section -->
        <section class="settings-section">
          <h2>Appearance</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Theme</span>
              <span class="setting-description">Switch between day and night mode</span>
            </div>
            <button (click)="theme.toggle()" class="theme-toggle">
              {{ (theme.theme$ | async) | titlecase }}
            </button>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Compact Mode</span>
              <span class="setting-description">Increase information density</span>
            </div>
            <button 
              (click)="toggleCompact()" 
              class="toggle-btn"
              [class.active]="(prefs.prefs$ | async)?.density === 'compact'"
            >
              <span class="toggle-slider"></span>
            </button>
          </div>
        </section>

        <!-- Units Section -->
        <section class="settings-section">
          <h2>Units</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Speed</span>
              <span class="setting-description">Display unit for speed measurements</span>
            </div>
            <select 
              [value]="(prefs.prefs$ | async)?.speedUnit" 
              (change)="onSpeedUnitChange($event)"
              class="setting-select"
            >
              <option value="kn">Knots (kn)</option>
              <option value="m/s">Meters/sec (m/s)</option>
              <option value="km/h">Kilometers/hour (km/h)</option>
            </select>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Depth</span>
              <span class="setting-description">Display unit for depth measurements</span>
            </div>
            <select 
              [value]="(prefs.prefs$ | async)?.depthUnit" 
              (change)="onDepthUnitChange($event)"
              class="setting-select"
            >
              <option value="m">Meters (m)</option>
              <option value="ft">Feet (ft)</option>
            </select>
          </div>
        </section>

        <!-- Dashboard Section -->
        <section class="settings-section">
          <h2>Dashboard Widgets</h2>
          
          <div class="widget-list">
            <div *ngFor="let def of widgetDefs; trackBy: trackByWidget" class="widget-item">
              <div class="widget-info">
                <div class="widget-header">
                  <span class="widget-name">{{ def.title }}</span>
                  <span class="widget-size">{{ def.size }}</span>
                </div>
                <span class="widget-description">{{ def.description }}</span>
              </div>
              <button 
                (click)="toggleWidget(def.id)" 
                class="toggle-btn"
                [class.active]="isWidgetVisible(def.id)"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>

          <button (click)="resetLayout()" class="reset-btn">
            Reset to Default Layout
          </button>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
      max-width: 900px;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--fg);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--muted);
      font-size: 0.875rem;
    }

    .settings-sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .settings-section {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }

    h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--fg);
      margin-bottom: 1rem;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .setting-label {
      font-weight: 600;
      color: var(--fg);
    }

    .setting-description {
      font-size: 0.875rem;
      color: var(--muted);
    }

    .setting-select {
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 150px;
    }

    .theme-toggle {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .theme-toggle:hover {
      transform: scale(1.05);
    }

    .toggle-btn {
      position: relative;
      width: 48px;
      height: 24px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .toggle-btn.active {
      background: var(--accent);
      border-color: var(--accent);
    }

    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
    }

    .toggle-btn.active .toggle-slider {
      transform: translateX(24px);
    }

    .widget-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .widget-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .widget-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .widget-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .widget-name {
      font-weight: 600;
      color: var(--fg);
    }

    .widget-size {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      background: var(--accent);
      color: white;
      border-radius: 4px;
      font-weight: 700;
    }

    .widget-description {
      font-size: 0.875rem;
      color: var(--muted);
    }

    .reset-btn {
      margin-top: 1rem;
      width: 100%;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 0.75rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .reset-btn:hover {
      background: var(--surface-0);
    }
  `]
})
export class SettingsPage {
  prefs = inject(PreferencesService);
  theme = inject(ThemeService);
  layout = inject(LayoutService);

  get widgetDefs() {
    return this.layout.getWidgetDefinitions();
  }

  isWidgetVisible(widgetId: string): boolean {
    const config = this.layout.getSnapshot().widgets.find(w => w.id === widgetId);
    return config?.visible ?? false;
  }

  toggleWidget(widgetId: string) {
    this.layout.toggleWidget(widgetId);
  }

  resetLayout() {
    this.layout.reset();
  }

  trackByWidget(index: number, def: { id: string }): string {
    return def.id;
  }

  toggleCompact() {
    this.prefs.toggleDensity();
  }

  onSpeedUnitChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.prefs.setSpeedUnit(target.value as 'kn' | 'm/s' | 'km/h');
  }

  onDepthUnitChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.prefs.setDepthUnit(target.value as 'm' | 'ft');
  }
}
