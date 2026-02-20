import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, type IconName } from '../../shared/components/app-icon/app-icon.component';
import { LayoutService } from '../../core/services/layout.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

// Standalone settings sub-components
import { VesselSettingsComponent } from '../../features/settings/components/vessel-settings/vessel-settings.component';
import { ConnectionSettingsComponent } from '../../features/settings/components/connection-settings/connection-settings.component';
import { DisplaySettingsComponent } from '../../features/settings/components/display-settings/display-settings.component';
import { UnitsSettingsComponent } from '../../features/settings/components/units-settings/units-settings.component';
import { AlarmSettingsComponent } from '../../features/settings/components/alarm-settings/alarm-settings.component';
import { ChartSettingsComponent } from '../../features/settings/components/chart-settings/chart-settings.component';
import { DataSettingsComponent } from '../../features/settings/components/data-settings/data-settings.component';
import { ExperimentsSettingsComponent } from '../../features/settings/components/experiments-settings/experiments-settings.component';

type SettingsSection =
  | 'general'
  | 'vessel'
  | 'display'
  | 'units'
  | 'chart'
  | 'alarms'
  | 'connection'
  | 'dashboard'
  | 'data'
  | 'experiments';

interface SectionMeta {
  id: SettingsSection;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    AppIconComponent,
    VesselSettingsComponent,
    ConnectionSettingsComponent,
    DisplaySettingsComponent,
    UnitsSettingsComponent,
    AlarmSettingsComponent,
    ChartSettingsComponent,
    DataSettingsComponent,
    ExperimentsSettingsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>{{ 'settings.title' | translate }}</h1>
        <p class="subtitle">{{ 'settings.subtitle' | translate }}</p>
      </div>

      <div class="settings-layout">
        <!-- Section Navigation -->
        <nav class="settings-nav" role="tablist" aria-label="Settings sections">
          @for (section of sections; track section.id) {
            <button
              class="nav-item"
              [class.active]="activeSection() === section.id"
              (click)="activeSection.set(section.id)"
              role="tab"
              [attr.aria-selected]="activeSection() === section.id"
            >
              <app-icon [name]="section.icon" size="16"></app-icon>
              <span>{{ section.label }}</span>
            </button>
          }
        </nav>

        <!-- Section Content -->
        <div class="settings-content" role="tabpanel">
          @switch (activeSection()) {
            @case ('general') {
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
            }
            @case ('vessel') {
              <app-vessel-settings />
            }
            @case ('display') {
              <app-display-settings />
            }
            @case ('units') {
              <app-units-settings />
            }
            @case ('chart') {
              <app-chart-settings />
            }
            @case ('alarms') {
              <app-alarm-settings />
            }
            @case ('connection') {
              <app-connection-settings />
            }
            @case ('dashboard') {
              <section class="settings-section">
                <h2>{{ 'settings.sections.dashboard' | translate }}</h2>
                <div class="widget-list">
                  <div *ngFor="let def of widgetDefs; trackBy: trackByWidget" class="widget-item">
                    <div class="widget-info">
                      <div class="widget-header">
                        <span class="widget-name">{{ def.title | translate }}</span>
                        <span class="widget-size">{{ def.size }}</span>
                      </div>
                      <span class="widget-description">{{ def.description | translate }}</span>
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
            }
            @case ('data') {
              <app-data-settings />
            }
            @case ('experiments') {
              <app-experiments-settings />
            }
          }
        </div>
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
      max-width: 1100px;
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

    /* Two-column layout: nav + content */
    .settings-layout {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 1.5rem;
      max-width: 1100px;
      margin: 0 auto;
      align-items: start;
    }

    /* Section Navigation */
    .settings-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 0.5rem;
      position: sticky;
      top: 1.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      border: none;
      background: transparent;
      color: var(--text-sec);
      font-size: 0.825rem;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      white-space: nowrap;
    }

    .nav-item:hover {
      background: var(--surface-2, rgba(255,255,255,0.04));
      color: var(--text-main);
    }

    .nav-item.active {
      background: var(--accent, #88c0d0);
      color: white;
      font-weight: 600;
    }

    /* Section Content */
    .settings-content {
      min-height: 400px;
    }

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
      min-width: 0;
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

    /* Toggle Switch */
    .toggle-btn {
      position: relative;
      width: 40px;
      height: 22px;
      background: var(--surface-2);
      border: 1px solid var(--panel-border);
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      padding: 0;
      overflow: hidden;
    }

    .toggle-btn:hover { border-color: var(--text-sec); }

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
      background: var(--bg);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      transition: border-color 0.2s;
    }

    .widget-item:hover { border-color: var(--accent); }

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

    /* Mobile: stack nav horizontally above content */
    @media (max-width: 768px) {
      .settings-layout {
        grid-template-columns: 1fr;
      }

      .settings-nav {
        flex-direction: row;
        overflow-x: auto;
        position: static;
        padding: 0.35rem;
        gap: 0;
        -webkit-overflow-scrolling: touch;
      }

      .nav-item {
        font-size: 0.75rem;
        padding: 0.5rem 0.65rem;
      }

      .settings-page {
        padding: 1rem;
      }

      .settings-section {
        padding: 1rem;
      }

      .setting-item {
        flex-direction: column;
        align-items: flex-start;
      }

      .setting-select {
        width: 100%;
        min-width: 0;
      }

      .widget-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsPage {
  readonly lang = inject(LanguageService);
  private readonly layout = inject(LayoutService);

  readonly activeSection = signal<SettingsSection>('general');

  readonly sections: SectionMeta[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'vessel', label: 'Vessel', icon: 'anchor' },
    { id: 'display', label: 'Display', icon: 'sun' },
    { id: 'units', label: 'Units', icon: 'ruler' },
    { id: 'chart', label: 'Chart', icon: 'compass' },
    { id: 'alarms', label: 'Alarms', icon: 'alert-triangle' },
    { id: 'connection', label: 'Connection', icon: 'satellite' },
    { id: 'dashboard', label: 'Dashboard', icon: 'layers' },
    { id: 'data', label: 'Data', icon: 'download' },
    { id: 'experiments', label: 'Experiments', icon: 'activity' },
  ];

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

  trackByWidget(_index: number, def: { id: string }): string {
    return def.id;
  }

  onLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.lang.setLanguage(target.value as 'en' | 'es');
  }
}

