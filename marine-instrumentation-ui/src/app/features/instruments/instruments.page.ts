import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { InstrumentWidgetComponent } from './components/instrument-widget/instrument-widget.component';
import { InstrumentContainerComponent } from '../../ui/instruments/instrument-container/instrument-container.component';
import { CompassWidgetComponent } from '../../ui/instruments/compass-widget/compass-widget.component';
import { SpeedometerWidgetComponent } from '../../ui/instruments/speedometer-widget/speedometer-widget.component';
import { DepthGaugeWidgetComponent } from '../../ui/instruments/depth-gauge-widget/depth-gauge-widget.component';
import { DepthWidgetComponent } from '../../ui/instruments/depth-widget/depth-widget.component';
import { WindWidgetComponent } from '../../ui/instruments/wind-widget/wind-widget.component';
import { RudderWidgetComponent } from '../../ui/instruments/rudder-widget/rudder-widget.component';
import { EngineRpmWidgetComponent } from '../../ui/instruments/engine-rpm-widget/engine-rpm-widget.component';
import { TankWidgetComponent } from '../../ui/instruments/tank-widget/tank-widget.component';
import { BatteryWidgetComponent } from '../../ui/instruments/battery-widget/battery-widget.component';
import { MeteoWidgetComponent } from '../../ui/instruments/meteo-widget/meteo-widget.component';
import { CogInstrumentComponent } from '../../ui/instruments/cog-instrument/cog-instrument.component';
import { PositionInstrumentComponent } from '../../ui/instruments/position-instrument/position-instrument.component';
import { GpsStatusInstrumentComponent } from '../../ui/instruments/gps-status-instrument/gps-status-instrument.component';
import { AutopilotCompassComponent } from '../autopilot/components/autopilot-compass/autopilot-compass.component';
import {
  INSTRUMENT_CATALOG,
  INSTRUMENT_CATEGORIES,
  getInstrumentsByCategory,
  type InstrumentCategoryId,
  type InstrumentDefinition,
} from './data/instrument-catalog';
import {
  hasVisualWidget,
  getVisualWidgetType,
  type VisualWidgetType,
} from './data/visual-widget-map';

type CategoryFilter = 'all' | InstrumentCategoryId;

@Component({
  selector: 'app-instruments-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    AppIconComponent,
    InstrumentWidgetComponent,
    InstrumentContainerComponent,
    CompassWidgetComponent,
    SpeedometerWidgetComponent,
    DepthGaugeWidgetComponent,
    DepthWidgetComponent,
    WindWidgetComponent,
    RudderWidgetComponent,
    EngineRpmWidgetComponent,
    TankWidgetComponent,
    BatteryWidgetComponent,
    MeteoWidgetComponent,
    CogInstrumentComponent,
    PositionInstrumentComponent,
    GpsStatusInstrumentComponent,
    AutopilotCompassComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="instruments-page">
      <!-- Toolbar -->
      <div class="instruments-toolbar">
        <div class="instruments-toolbar__left">
          <h1 class="instruments-toolbar__title">{{ 'instruments.page.title' | translate }}</h1>
          <p class="instruments-toolbar__subtitle">{{ 'instruments.page.subtitle' | translate }}</p>
        </div>
        <div class="instruments-toolbar__right">
          <span class="instruments-toolbar__stat">
            <span class="stat-value">{{ filteredInstruments().length }}</span>
            <span class="stat-label">instruments</span>
          </span>
        </div>
      </div>

      <!-- Category tabs -->
      <div class="category-tabs">
        <button
          class="category-tab"
          [class.active]="activeCategory() === 'all'"
          (click)="setCategory('all')"
          type="button"
        >
          All
          <span class="category-tab__count">{{ totalCount }}</span>
        </button>
        @for (cat of categories; track cat.id) {
          <button
            class="category-tab"
            [class.active]="activeCategory() === cat.id"
            (click)="setCategory(cat.id)"
            type="button"
          >
            <app-icon [name]="$any(cat.icon)" size="14" />
            {{ cat.label }}
            <span class="category-tab__count">{{ getCategoryCount(cat.id) }}</span>
          </button>
        }
      </div>

      <!-- Scrollable content -->
      <div class="instruments-content">
        <!-- Instruments grid -->
        <div class="instruments-grid">
          @for (instrument of filteredInstruments(); track instrument.id) {
            <app-instrument-container
              [title]="instrument.label"
              [instrumentId]="instrument.id"
              size="sm"
              [defaultView]="hasVisual(instrument.id) ? 'both' : 'numeric'"
              [attr.data-category]="instrument.category"
            >
              <!-- ══ Numeric slot ══ -->
              <omi-instrument-widget numeric [config]="instrument" [compact]="true" />

              <!-- ══ Visual slot ══ -->
              @switch (getVisualType(instrument.id)) {
                @case ('compass') { <app-compass-widget visual /> }
                @case ('speedometer') { <app-speedometer-widget visual /> }
                @case ('depth-gauge') { <app-depth-gauge-widget visual unit="m" /> }
                @case ('depth') { <app-depth-widget visual /> }
                @case ('wind') { <app-wind-widget visual /> }
                @case ('rudder') { <app-rudder-widget visual /> }
                @case ('engine-rpm') { <app-engine-rpm-widget visual /> }
                @case ('tank') { <app-tank-widget visual /> }
                @case ('battery') { <app-battery-widget visual /> }
                @case ('meteo') { <app-meteo-widget visual /> }
                @case ('cog') { <app-cog-instrument visual /> }
                @case ('position') { <app-position-instrument visual /> }
                @case ('gps-status') { <app-gps-status-instrument visual /> }
                @case ('autopilot-compass') { <app-autopilot-compass visual /> }
                @default { <omi-instrument-widget visual [config]="instrument" /> }
              }
            </app-instrument-container>
          }
        </div>

        <!-- Empty state -->
        @if (filteredInstruments().length === 0) {
          <div class="instruments-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
            </svg>
            <p>No instruments found in this category.</p>
          </div>
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

    .instruments-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background:
        radial-gradient(ellipse 100% 60% at 50% 0%, color-mix(in srgb, var(--gb-tick-reference) 8%, transparent), transparent 70%),
        radial-gradient(ellipse 80% 50% at 80% 100%, color-mix(in srgb, var(--gb-needle-secondary) 6%, transparent), transparent 60%),
        var(--gb-bg-canvas);
    }

    /* ── Toolbar ──────────────────────────────────── */
    .instruments-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3, 12px) var(--space-5, 24px);
      border-bottom: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-bezel);
      backdrop-filter: blur(var(--glass-blur, 16px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
      flex-shrink: 0;
      gap: var(--space-4, 16px);
      position: relative;
    }

    .instruments-toolbar::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--widget-shine), transparent);
      opacity: 0.5;
    }

    .instruments-toolbar__left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .instruments-toolbar__title {
      font-family: var(--font-family);
      font-size: 1rem;
      font-weight: 700;
      color: var(--gb-text-value);
      margin: 0;
      white-space: nowrap;
      position: relative;
    }

    .instruments-toolbar__title::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--widget-accent);
      border-radius: var(--radius-full, 999px);
    }

    .instruments-toolbar__subtitle {
      font-family: var(--font-family);
      font-size: 0.7rem;
      color: var(--gb-text-muted);
      margin: 0;
    }

    .instruments-toolbar__right {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
    }

    .instruments-toolbar__stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }

    .stat-value {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 1rem;
      font-weight: 700;
      color: var(--gb-text-value);
      line-height: 1;
    }

    .stat-label {
      font-family: var(--font-family);
      font-size: 0.55rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--gb-text-muted);
    }

    /* ── Category tabs ────────────────────────────── */
    .category-tabs {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      padding: var(--space-2, 8px) var(--space-5, 24px);
      background: var(--gb-bg-bezel);
      border-bottom: 1px solid var(--gb-border-panel);
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }

    .category-tabs::-webkit-scrollbar { display: none; }

    .category-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      min-height: 36px;
      font-family: var(--font-family);
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--gb-text-muted);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-full, 999px);
      cursor: pointer;
      white-space: nowrap;
      transition:
        color 150ms var(--gb-ease-data),
        background 150ms var(--gb-ease-data),
        border-color 150ms var(--gb-ease-data);
    }

    .category-tab:hover {
      color: var(--gb-text-value);
      background: var(--gb-bg-glass);
      border-color: var(--gb-border-panel);
    }

    .category-tab:focus-visible {
      outline: 2px solid var(--widget-accent);
      outline-offset: 2px;
    }

    .category-tab.active {
      color: var(--widget-accent);
      background: var(--gb-bg-glass-active);
      border-color: var(--gb-border-active);
    }

    .category-tab__count {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 0.6rem;
      font-weight: 700;
      color: var(--gb-text-muted);
      background: var(--gb-bg-glass);
      padding: 1px 6px;
      border-radius: var(--radius-full, 999px);
      line-height: 1.3;
    }

    .category-tab.active .category-tab__count {
      color: var(--widget-accent);
      background: var(--gb-bg-glass-active);
    }

    /* ── Scrollable content ───────────────────────── */
    .instruments-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: var(--gb-border-panel) transparent;
    }

    /* ── Instruments grid ─────────────────────────── */
    .instruments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-3, 12px);
      padding: var(--space-4, 16px) var(--space-5, 24px);
    }

    /* ── Empty state ──────────────────────────────── */
    .instruments-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: var(--space-8, 64px) var(--space-4, 16px);
      color: var(--gb-text-muted);
      opacity: 0.6;
    }

    .instruments-empty p {
      font-family: var(--font-family);
      font-size: 0.85rem;
      font-weight: 500;
      margin: 0;
    }

    /* ── Responsive ───────────────────────────────── */
    @media (max-width: 640px) {
      .instruments-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        padding: var(--space-3, 12px);
        gap: var(--space-2, 8px);
      }

      .instruments-toolbar {
        flex-wrap: wrap;
        padding: var(--space-2, 8px) var(--space-3, 12px);
        gap: var(--space-2, 8px);
      }

      .instruments-toolbar__title::before { display: none; }

      .category-tabs {
        padding: var(--space-2, 8px) var(--space-3, 12px);
      }

    }

    @media (min-width: 768px) and (max-width: 1199px) {
      .instruments-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      }
    }

    @media (min-width: 1200px) {
      .instruments-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
  `],
})
export class InstrumentsPage {
  /** All category metadata from the catalog */
  readonly categories = INSTRUMENT_CATEGORIES;

  /** Total catalog count */
  readonly totalCount = INSTRUMENT_CATALOG.length;

  /** Active category filter */
  readonly activeCategory = signal<CategoryFilter>('all');

  /** Filtered instruments based on active category */
  readonly filteredInstruments = computed<InstrumentDefinition[]>(() => {
    const cat = this.activeCategory();
    return cat === 'all'
      ? INSTRUMENT_CATALOG
      : getInstrumentsByCategory(cat);
  });

  /** Set the active category filter */
  setCategory(category: CategoryFilter): void {
    this.activeCategory.set(category);
  }

  /** Get instrument count for a category */
  getCategoryCount(category: InstrumentCategoryId): number {
    return getInstrumentsByCategory(category).length;
  }

  /** Check if an instrument has a dedicated visual widget */
  hasVisual(instrumentId: string): boolean {
    return hasVisualWidget(instrumentId);
  }

  /** Get the visual widget type for an instrument, or null */
  getVisualType(instrumentId: string): VisualWidgetType | null {
    return getVisualWidgetType(instrumentId);
  }
}
