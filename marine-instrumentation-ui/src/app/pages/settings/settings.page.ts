import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreferencesService } from '../../core/services/preferences.service';
import { ThemeService } from '../../core/theme/theme.service';
import { LayoutService } from '../../core/services/layout.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>{{ 'settings.title' | translate }}</h1>
        <p class="subtitle">{{ 'settings.subtitle' | translate }}</p>
      </div>

      <div class="settings-sections">
        
        <!-- General Section -->
        <section class="settings-section">
          <h2>{{ 'settings.sections.general' | translate }}</h2>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">{{ 'settings.language.label' | translate }}</span>
              <span class="setting-description">{{ 'settings.language.description' | translate }}</span>
            </div>
            <select 
              [value]="(lang.lang$ | async)" 
              (change)="onLanguageChange($event)"
              class="setting-select"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </section>
        
        <!-- Appearance Section -->
        <section class="settings-section">
          <h2>{{ 'settings.sections.appearance' | translate }}</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">{{ 'settings.theme.label' | translate }}</span>
              <span class="setting-description">{{ 'settings.theme.description' | translate }}</span>
            </div>
            <button (click)="theme.toggle()" class="theme-toggle">
              {{ (theme.theme$ | async) | titlecase }}
            </button>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">{{ 'settings.compact.label' | translate }}</span>
              <span class="setting-description">{{ 'settings.compact.description' | translate }}</span>
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
          <h2>{{ 'settings.sections.units' | translate }}</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">{{ 'settings.units.speed.label' | translate }}</span>
              <span class="setting-description">{{ 'settings.units.speed.description' | translate }}</span>
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
              <span class="setting-label">{{ 'settings.units.depth.label' | translate }}</span>
              <span class="setting-description">{{ 'settings.units.depth.description' | translate }}</span>
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
          <h2>{{ 'settings.sections.dashboard' | translate }}</h2>
          
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
            {{ 'settings.widgets.reset' | translate }}
          </button>
        </section>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      --panel-bg: var(--surface-1);
      --panel-border: var(--border);
      --text-main: var(--text-1);
      --text-sec: var(--text-2);
    }

    .settings-page {
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
      max-width: 100%;
      margin: 0 auto;
      background: var(--bg);
    }

    .page-header {
      margin-bottom: 2rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--text-sec);
      font-size: 0.875rem;
    }

    .settings-sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Section Styling */
    .settings-section {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--shadow);
    }

    h2 {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-sec);
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--panel-border);
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px dashed var(--panel-border);
      gap: 1rem;
    }

    .setting-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
      min-width: 0; /* Prevent text overflow */
    }

    .setting-label {
      font-weight: 600;
      color: var(--text-main);
      font-size: 0.95rem;
    }

    .setting-description {
      font-size: 0.8rem;
      color: var(--text-sec);
      line-height: 1.3;
    }

    /* Form Elements */
    .setting-select {
      background: var(--bg);
      border: 1px solid var(--panel-border);
      color: var(--text-main);
      padding: 0.5rem 2rem 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      min-width: 140px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.8rem center;
      transition: border-color 0.2s;
    }

    .setting-select:focus, .setting-select:hover {
      outline: none;
      border-color: var(--accent);
    }

    .theme-toggle {
      background: var(--bg);
      color: var(--text-main);
      border: 1px solid var(--panel-border);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      border-color: var(--text-sec);
      background: var(--surface-2);
    }

    /* Refined Toggle Switch */
    .toggle-btn {
      position: relative;
      width: 40px;
      height: 22px;
      background: var(--surface-2); /* Better light mode visibility */
      border: 1px solid var(--panel-border);
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0; 
      padding: 0;
      overflow: hidden;
    }

    .toggle-btn:hover {
      border-color: var(--text-sec);
    }

    .toggle-btn.active {
      background: var(--accent);
      border-color: var(--accent);
    }
    
    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: var(--text-sec);
      border-radius: 50%;
      transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .toggle-btn.active .toggle-slider {
      background: white;
      transform: translateX(18px);
    }

    /* Widget List */
    .widget-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .widget-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--bg); /* Distinct from panel bg */
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      transition: border-color 0.2s;
    }
    
    .widget-item:hover {
      border-color: var(--accent);
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
      color: var(--text-main);
      font-size: 0.95rem;
    }

    .widget-size {
      font-size: 0.6rem;
      padding: 0.15rem 0.4rem;
      background: var(--panel-border);
      color: var(--text-sec);
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .widget-description {
      font-size: 0.8rem;
      color: var(--text-sec);
    }

    .reset-btn {
      margin-top: 1.5rem;
      width: 100%;
      background: transparent;
      border: 1px dashed var(--panel-border);
      color: var(--text-sec);
      padding: 0.8rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .reset-btn:hover {
      background: rgba(240, 99, 82, 0.05);
      color: var(--danger, #f06352);
      border-color: var(--danger, #f06352);
    }

    /* Mobile Adaptations */
    @media (max-width: 600px) {
      .settings-page {
        padding: 1rem;
      }
      
      .settings-section {
        padding: 1rem;
      }
      
      .toggle-btn.active .toggle-slider {
        transform: translateX(18px);
      }
      
      .widget-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsPage {
  prefs = inject(PreferencesService);
  theme = inject(ThemeService);
  layout = inject(LayoutService);
  lang = inject(LanguageService);

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

  onLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.lang.setLanguage(target.value as 'en' | 'es');
  }
}

