import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, type IconName } from '../../shared/components/app-icon/app-icon.component';
import { LayoutService } from '../../core/services/layout.service';
import { DashboardLayoutService } from '../../features/dashboard/services/dashboard-layout.service';
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
      <!-- Sidebar -->
      <nav class="settings-sidebar" role="tablist" aria-label="Settings sections">
        <div class="settings-sidebar__section-label">Settings</div>
        @for (section of sections; track section.id) {
          <button
            class="settings-nav-item"
            [class.active]="activeSection() === section.id"
            (click)="activeSection.set(section.id)"
            role="tab"
            [attr.aria-selected]="activeSection() === section.id"
          >
            <app-icon [name]="section.icon" size="18"></app-icon>
            <span>{{ section.label }}</span>
          </button>
        }
      </nav>

      <!-- Content -->
      <div class="settings-content" role="tabpanel">
        @switch (activeSection()) {
          @case ('general') {
            <h2>General</h2>
            <p class="settings-subtitle">{{ 'settings.subtitle' | translate }}</p>
            <div class="settings-group">
              <div class="settings-group__title">Language</div>
              <div class="settings-row">
                <div>
                  <div class="settings-row__label">{{ 'settings.language.label' | translate }}</div>
                  <div class="settings-row__desc">{{ 'settings.language.description' | translate }}</div>
                </div>
                <div class="settings-row__control">
                  <select
                    [value]="(lang.lang$ | async)"
                    (change)="onLanguageChange($event)"
                    class="settings-select"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            </div>
          }
          @case ('vessel') {
            <h2>Vessel Profile</h2>
            <app-vessel-settings />
          }
          @case ('display') {
            <h2>Display</h2>
            <app-display-settings />
          }
          @case ('units') {
            <h2>Units</h2>
            <app-units-settings />
          }
          @case ('chart') {
            <h2>Chart</h2>
            <app-chart-settings />
          }
          @case ('alarms') {
            <h2>Alarms</h2>
            <app-alarm-settings />
          }
          @case ('connection') {
            <h2>Connection</h2>
            <app-connection-settings />
          }
          @case ('dashboard') {
            <h2>Dashboard</h2>
            <div class="settings-group">
              <div class="settings-group__title">Widget Visibility</div>
              @for (def of widgetDefs; track def.id) {
                <div class="settings-row">
                  <div>
                    <div class="settings-row__label">{{ def.title | translate }}</div>
                    <div class="settings-row__desc">{{ def.description | translate }}</div>
                  </div>
                  <div class="settings-row__control">
                    <button
                      (click)="toggleWidget(def.id)"
                      class="toggle-btn"
                      [class.active]="isWidgetVisible(def.id)"
                    >
                      <span class="toggle-slider"></span>
                    </button>
                  </div>
                </div>
              }
            </div>
            <button (click)="resetLayout()" class="reset-btn">
              {{ 'settings.widgets.reset' | translate }}
            </button>
          }
          @case ('data') {
            <h2>Data</h2>
            <app-data-settings />
          }
          @case ('experiments') {
            <h2>Experiments</h2>
            <app-experiments-settings />
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* ── Page shell ───────────────────────────────── */
    .settings-page {
      height: 100%;
      display: grid;
      grid-template-columns: 220px 1fr;
      overflow: hidden;
      background: var(--gb-bg-canvas);
    }

    /* ── Sidebar ──────────────────────────────────── */
    .settings-sidebar {
      background: var(--gb-bg-bezel);
      border-right: 1px solid var(--gb-border-panel);
      overflow-y: auto;
      padding: var(--space-4, 16px) var(--space-3, 12px);
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
    }

    .settings-sidebar__section-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--gb-text-muted);
      padding: var(--space-2, 8px) var(--space-2, 8px) var(--space-1, 4px);
      margin-top: var(--space-2, 8px);
    }

    .settings-nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      color: var(--gb-text-muted);
      transition: all 150ms ease;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8125rem;
      font-weight: 500;
      border: none;
      background: transparent;
      text-align: left;
      white-space: nowrap;
    }

    .settings-nav-item svg,
    .settings-nav-item app-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .settings-nav-item:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.04));
      color: var(--gb-text-value);
    }

    .settings-nav-item.active {
      background: rgba(74, 144, 217, 0.12);
      color: #4a90d9;
    }

    /* ── Content panel ────────────────────────────── */
    .settings-content {
      overflow-y: auto;
      padding: var(--space-5, 24px);
    }

    .settings-content h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gb-text-value);
      margin: 0 0 var(--space-1, 4px) 0;
    }

    .settings-subtitle {
      font-size: 0.8125rem;
      color: var(--gb-text-muted);
      margin-bottom: var(--space-5, 24px);
    }

    /* ── Settings group ───────────────────────────── */
    .settings-group {
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: var(--space-4, 16px);
    }

    .settings-group__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--gb-text-muted);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border-bottom: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-bezel);
    }

    /* ── Settings row ─────────────────────────────── */
    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      gap: var(--space-4, 16px);
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .settings-row:last-child { border-bottom: none; }

    .settings-row__label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gb-text-value);
    }

    .settings-row__desc {
      font-size: 0.75rem;
      color: var(--gb-text-muted);
      margin-top: 2px;
    }

    .settings-row__control {
      flex-shrink: 0;
    }

    .settings-select {
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      color: var(--gb-text-value);
      padding: 6px 28px 6px 12px;
      border-radius: 8px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      min-width: 140px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      transition: border-color 150ms ease;
    }

    .settings-select:focus,
    .settings-select:hover {
      outline: none;
      border-color: var(--gb-accent, #4a90d9);
    }

    /* ── Toggle switch ────────────────────────────── */
    .toggle-btn {
      position: relative;
      width: 40px;
      height: 22px;
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 999px;
      cursor: pointer;
      transition: all 200ms ease;
      flex-shrink: 0;
      padding: 0;
      overflow: hidden;
    }

    .toggle-btn:hover { border-color: var(--gb-text-muted); }

    .toggle-btn.active {
      background: var(--gb-accent, #4a90d9);
      border-color: var(--gb-accent, #4a90d9);
    }

    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: var(--gb-text-muted);
      border-radius: 50%;
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toggle-btn.active .toggle-slider {
      background: white;
      transform: translateX(18px);
    }

    /* ── Reset button ─────────────────────────────── */
    .reset-btn {
      margin-top: var(--space-4, 16px);
      width: 100%;
      background: transparent;
      border: 1px dashed var(--gb-border-panel);
      color: var(--gb-text-muted);
      padding: 10px;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .reset-btn:hover {
      background: rgba(240, 99, 82, 0.06);
      color: #f06352;
      border-color: #f06352;
    }

    /* ── Mobile: stack sidebar horizontally ────────── */
    @media (max-width: 768px) {
      .settings-page {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .settings-sidebar {
        flex-direction: row;
        overflow-x: auto;
        border-right: none;
        border-bottom: 1px solid var(--gb-border-panel);
        padding: var(--space-2, 8px) var(--space-3, 12px);
        gap: 2px;
        -webkit-overflow-scrolling: touch;
      }

      .settings-sidebar__section-label { display: none; }

      .settings-nav-item {
        font-size: 0.7rem;
        padding: 6px 10px;
      }

      .settings-content {
        padding: var(--space-3, 12px);
      }
    }
  `]
})
export class SettingsPage {
  readonly lang = inject(LanguageService);
  private readonly layout = inject(LayoutService);
  private readonly dashLayout = inject(DashboardLayoutService);

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

  /** Uses DashboardLayoutService to check visibility */
  isWidgetVisible(widgetId: string): boolean {
    const widget = this.dashLayout.getAllWidgets().find(w => w.id === widgetId);
    if (widget) return widget.visible;
    // Fallback to old LayoutService for non-dashboard widgets
    const config = this.layout.getSnapshot().widgets.find(w => w.id === widgetId);
    return config?.visible ?? false;
  }

  toggleWidget(widgetId: string) {
    // Try DashboardLayoutService first
    const dashWidgets = this.dashLayout.getAllWidgets();
    if (dashWidgets.some(w => w.id === widgetId)) {
      this.dashLayout.toggleWidget(widgetId);
    } else {
      this.layout.toggleWidget(widgetId);
    }
  }

  resetLayout() {
    this.dashLayout.reset();
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

