import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import {
  ChartSettingsService,
  type AisDisplayAge,
  type TrackDuration,
  type VesselTypeFilter,
} from '../../services/chart-settings.service';
import { PreferencesService, type SpeedUnit } from '../../../../core/services/preferences.service';

interface NavigateToPreset {
  label: string;
  lng: number;
  lat: number;
  zoom: number;
}

const NAVIGATE_PRESETS: NavigateToPreset[] = [
  { label: 'North Atlantic',   lng: -40.0,   lat: 45.0,   zoom: 4 },
  { label: 'Mediterranean',    lng: 15.0,    lat: 38.0,   zoom: 5 },
  { label: 'English Channel',  lng: -1.5,    lat: 50.2,   zoom: 7 },
  { label: 'Caribbean',        lng: -68.0,   lat: 17.5,   zoom: 5 },
  { label: 'Gulf of Mexico',   lng: -90.0,   lat: 25.0,   zoom: 5 },
  { label: 'Baltic Sea',       lng: 20.0,    lat: 58.0,   zoom: 5 },
  { label: 'South China Sea',  lng: 114.0,   lat: 12.0,   zoom: 5 },
  { label: 'Persian Gulf',     lng: 52.0,    lat: 26.5,   zoom: 6 },
];

const VESSEL_TYPE_LABELS: Record<VesselTypeFilter, string> = {
  cargo:     'Cargo',
  tanker:    'Tanker',
  passenger: 'Passenger',
  fishing:   'Fishing',
  sailing:   'Sailing',
  pleasure:  'Pleasure Craft',
  tug:       'Tug & Pilot',
  military:  'Military',
  hsc:       'High-Speed Craft',
  other:     'Other',
};

const VESSEL_TYPE_KEYS: VesselTypeFilter[] = [
  'cargo', 'tanker', 'passenger', 'fishing', 'sailing',
  'pleasure', 'tug', 'military', 'hsc', 'other',
];

@Component({
  selector: 'app-map-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-panel" *ngIf="chartSettings.settings$ | async as s">
      <!-- Header -->
      <div class="panel-header">
        <span class="panel-title">Map Settings</span>
        <button class="panel-close" (click)="closePanel.emit()" aria-label="Close">
          <app-icon name="x" [size]="14" />
        </button>
      </div>

      <div class="panel-body">
        <!-- ═══ AIS SETTINGS ═══ -->
        <section class="section" [class.section--open]="openSection() === 'ais'">
          <button class="section-header" (click)="toggleSection('ais')">
            <app-icon name="ais" [size]="14" />
            <span>AIS Settings</span>
            <app-icon [name]="openSection() === 'ais' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'ais'">
            <div class="field">
              <label class="field-label">Display positions updated within</label>
              <div class="chip-group">
                <button
                  *ngFor="let opt of aisAgeOptions"
                  class="chip"
                  [class.chip--active]="s.aisDisplayAge === opt.value"
                  (click)="chartSettings.setAisDisplayAge(opt.value)">
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field-label">Show targets</label>
              <div class="toggle-row">
                <span>AIS Targets</span>
                <button class="toggle-btn" [class.active]="s.showAisTargets" (click)="chartSettings.toggleAisTargets()">
                  <span class="toggle-slider"></span>
                </button>
              </div>
              <div class="toggle-row">
                <span>AIS Labels</span>
                <button class="toggle-btn" [class.active]="s.showAisLabels" (click)="chartSettings.toggleAisLabels()">
                  <span class="toggle-slider"></span>
                </button>
              </div>
              <div class="toggle-row">
                <span>CPA Lines</span>
                <button class="toggle-btn" [class.active]="s.showCpaLines" (click)="chartSettings.toggleCpaLines()">
                  <span class="toggle-slider"></span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══ VESSEL FILTERS ═══ -->
        <section class="section" [class.section--open]="openSection() === 'vessels'">
          <button class="section-header" (click)="toggleSection('vessels')">
            <app-icon name="vessel" [size]="14" />
            <span>Vessel Filters</span>
            <app-icon [name]="openSection() === 'vessels' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'vessels'">
            <div class="field">
              <div class="field-actions">
                <button class="link-btn" (click)="chartSettings.setAllVesselTypes(true)">All</button>
                <span class="field-actions__sep">·</span>
                <button class="link-btn" (click)="chartSettings.setAllVesselTypes(false)">None</button>
              </div>
              <div class="vessel-grid">
                <label
                  *ngFor="let vt of vesselTypeKeys"
                  class="vessel-check"
                  [class.vessel-check--active]="s.visibleVesselTypes.includes(vt)">
                  <input
                    type="checkbox"
                    [checked]="s.visibleVesselTypes.includes(vt)"
                    (change)="chartSettings.toggleVesselType(vt)"
                    class="vessel-check__input" />
                  <span class="vessel-check__indicator"></span>
                  <span class="vessel-check__label">{{ vesselTypeLabels[vt] }}</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══ TRACK SETTINGS ═══ -->
        <section class="section" [class.section--open]="openSection() === 'track'">
          <button class="section-header" (click)="toggleSection('track')">
            <app-icon name="track" [size]="14" />
            <span>Track Settings</span>
            <app-icon [name]="openSection() === 'track' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'track'">
            <div class="field">
              <label class="field-label">Past track duration</label>
              <div class="chip-group">
                <button
                  *ngFor="let opt of trackDurationOptions"
                  class="chip"
                  [class.chip--active]="s.trackDuration === opt.value"
                  (click)="chartSettings.setTrackDuration(opt.value)">
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="toggle-row">
              <span>Show track line</span>
              <button class="toggle-btn" [class.active]="s.showTrack" (click)="chartSettings.toggleTrack()">
                <span class="toggle-slider"></span>
              </button>
            </div>
            <div class="toggle-row">
              <span>Course vector</span>
              <button class="toggle-btn" [class.active]="s.showVector" (click)="chartSettings.toggleVector()">
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ MAP LAYERS ═══ -->
        <section class="section" [class.section--open]="openSection() === 'layers'">
          <button class="section-header" (click)="toggleSection('layers')">
            <app-icon name="layers" [size]="14" />
            <span>Map Layers</span>
            <app-icon [name]="openSection() === 'layers' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'layers'">
            <div class="toggle-row">
              <span>OpenSeaMap overlay</span>
              <button class="toggle-btn" [class.active]="s.showOpenSeaMap" (click)="chartSettings.toggleOpenSeaMap()">
                <span class="toggle-slider"></span>
              </button>
            </div>
            <div class="toggle-row">
              <span>True wind indicator</span>
              <button class="toggle-btn" [class.active]="s.showTrueWind" (click)="chartSettings.toggleTrueWind()">
                <span class="toggle-slider"></span>
              </button>
            </div>
            <div class="toggle-row">
              <span>Range rings</span>
              <button class="toggle-btn" [class.active]="s.showRangeRings" (click)="chartSettings.toggleRangeRings()">
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ WEATHER OVERLAYS ═══ -->
        <section class="section" [class.section--open]="openSection() === 'weather'">
          <button class="section-header" (click)="toggleSection('weather')">
            <app-icon name="thermometer" [size]="14" />
            <span>Weather Overlays</span>
            <app-icon [name]="openSection() === 'weather' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'weather'">
            <div class="toggle-row">
              <span>Sea temperature</span>
              <button class="toggle-btn" [class.active]="s.showTemperature" (click)="chartSettings.toggleTemperature()">
                <span class="toggle-slider"></span>
              </button>
            </div>
            <div class="toggle-row">
              <span>Wind speed</span>
              <button class="toggle-btn" [class.active]="s.showWindSpeed" (click)="chartSettings.toggleWindSpeed()">
                <span class="toggle-slider"></span>
              </button>
            </div>
            <div class="toggle-row">
              <span>Wave height</span>
              <button class="toggle-btn" [class.active]="s.showWaves" (click)="chartSettings.toggleWaves()">
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ NAVIGATE TO ═══ -->
        <section class="section" [class.section--open]="openSection() === 'navigate'">
          <button class="section-header" (click)="toggleSection('navigate')">
            <app-icon name="locate" [size]="14" />
            <span>Navigate To</span>
            <app-icon [name]="openSection() === 'navigate' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'navigate'">
            <div class="navigate-grid">
              <button
                *ngFor="let preset of navigatePresets"
                class="navigate-btn"
                (click)="navigateTo.emit({ lng: preset.lng, lat: preset.lat, zoom: preset.zoom })">
                {{ preset.label }}
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ UNITS ═══ -->
        <section class="section" [class.section--open]="openSection() === 'units'">
          <button class="section-header" (click)="toggleSection('units')">
            <app-icon name="speedometer" [size]="14" />
            <span>Time & Units</span>
            <app-icon [name]="openSection() === 'units' ? 'chevron-up' : 'chevron-down'" [size]="12" />
          </button>
          <div class="section-body" *ngIf="openSection() === 'units'" >
            <div class="field" *ngIf="prefs.prefs$ | async as p">
              <label class="field-label">Speed units</label>
              <div class="chip-group">
                <button
                  *ngFor="let opt of speedUnitOptions"
                  class="chip"
                  [class.chip--active]="p.speedUnit === opt.value"
                  (click)="prefs.setSpeedUnit(opt.value)">
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="field" *ngIf="prefs.prefs$ | async as p">
              <label class="field-label">Depth units</label>
              <div class="chip-group">
                <button
                  class="chip"
                  [class.chip--active]="p.depthUnit === 'm'"
                  (click)="prefs.setDepthUnit('m')">
                  meters
                </button>
                <button
                  class="chip"
                  [class.chip--active]="p.depthUnit === 'ft'"
                  (click)="prefs.setDepthUnit('ft')">
                  feet
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    // ═══════════════════════════════════════════════
    // PANEL SHELL
    // ═══════════════════════════════════════════════

    .settings-panel {
      width: 300px;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
      color: var(--gb-text-value);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--border-default);
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .panel-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: transparent;
      border: none;
      color: var(--gb-text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm, 4px);
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 70%, transparent);
        color: var(--gb-text-value);
      }
    }

    .panel-body {
      overflow-y: auto;
      flex: 1;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--gb-text-muted) 30%, transparent) transparent;
    }

    // ═══════════════════════════════════════════════
    // ACCORDION SECTIONS
    // ═══════════════════════════════════════════════

    .section {
      border-bottom: 1px solid color-mix(in srgb, var(--border-default) 50%, transparent);

      &:last-child { border-bottom: none; }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: none;
      color: var(--gb-text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 40%, transparent);
        color: var(--gb-text-value);
      }

      > span { flex: 1; text-align: left; }

      > app-icon:last-child {
        opacity: 0.4;
        transition: opacity var(--duration-fast);
      }
    }

    .section--open .section-header {
      color: var(--gb-text-value);

      > app-icon:last-child { opacity: 0.7; }
    }

    .section-body {
      padding: 0 var(--space-3) var(--space-3);
      animation: section-expand 0.2s var(--ease-out) both;
    }

    @keyframes section-expand {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    // ═══════════════════════════════════════════════
    // FIELDS & CHIPS
    // ═══════════════════════════════════════════════

    .field {
      margin-bottom: var(--space-3);

      &:last-child { margin-bottom: 0; }
    }

    .field-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--gb-text-muted);
      margin-bottom: var(--space-1);
      letter-spacing: 0.01em;
    }

    .field-actions {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin-bottom: var(--space-2);

      &__sep {
        color: var(--gb-text-muted);
        opacity: 0.4;
      }
    }

    .link-btn {
      background: none;
      border: none;
      color: var(--gb-needle-secondary);
      font-size: 0.6875rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;

      &:hover { text-decoration: underline; }
    }

    .chip-group {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .chip {
      padding: 4px 10px;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--gb-text-muted);
      background: color-mix(in srgb, var(--bg-surface-secondary) 50%, transparent);
      border: 1px solid color-mix(in srgb, var(--border-default) 40%, transparent);
      border-radius: 100px;
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 80%, transparent);
        color: var(--gb-text-value);
      }

      &--active {
        background: color-mix(in srgb, var(--gb-needle-secondary) 18%, transparent);
        border-color: color-mix(in srgb, var(--gb-needle-secondary) 40%, transparent);
        color: var(--gb-needle-secondary);
        font-weight: 600;
      }
    }

    // ═══════════════════════════════════════════════
    // TOGGLES
    // ═══════════════════════════════════════════════

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 0.75rem;
      color: var(--gb-text-value);

      > span { flex: 1; }
    }

    .toggle-btn {
      position: relative;
      width: 36px;
      height: 20px;
      background: color-mix(in srgb, var(--bg-surface-secondary) 80%, transparent);
      border: 1px solid var(--border-default);
      border-radius: 10px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all var(--duration-fast) var(--ease-out);
      padding: 0;

      &.active {
        background: color-mix(in srgb, var(--gb-needle-secondary) 30%, transparent);
        border-color: color-mix(in srgb, var(--gb-needle-secondary) 50%, transparent);
      }
    }

    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      background: var(--gb-text-muted);
      border-radius: 50%;
      transition: all var(--duration-fast) var(--ease-out);

      .toggle-btn.active & {
        transform: translateX(16px);
        background: var(--gb-needle-secondary);
      }
    }

    // ═══════════════════════════════════════════════
    // VESSEL FILTER GRID
    // ═══════════════════════════════════════════════

    .vessel-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .vessel-check {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      font-size: 0.6875rem;
      color: var(--gb-text-muted);
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 50%, transparent);
      }

      &--active {
        color: var(--gb-text-value);
      }

      &__input {
        display: none;
      }

      &__indicator {
        width: 12px;
        height: 12px;
        border: 1.5px solid var(--border-default);
        border-radius: 3px;
        flex-shrink: 0;
        transition: all var(--duration-fast) var(--ease-out);
        position: relative;
      }

      &--active &__indicator {
        background: var(--gb-needle-secondary);
        border-color: var(--gb-needle-secondary);

        &::after {
          content: '';
          position: absolute;
          top: 1px;
          left: 3px;
          width: 4px;
          height: 6px;
          border: solid var(--bg-app);
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
        }
      }

      &__label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    // ═══════════════════════════════════════════════
    // NAVIGATE TO GRID
    // ═══════════════════════════════════════════════

    .navigate-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .navigate-btn {
      padding: 6px 8px;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--gb-text-muted);
      background: color-mix(in srgb, var(--bg-surface-secondary) 40%, transparent);
      border: 1px solid color-mix(in srgb, var(--border-default) 30%, transparent);
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      text-align: left;
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: color-mix(in srgb, var(--gb-needle-secondary) 12%, transparent);
        border-color: color-mix(in srgb, var(--gb-needle-secondary) 30%, transparent);
        color: var(--gb-needle-secondary);
      }

      &:active {
        transform: scale(0.97);
      }
    }

    // ═══════════════════════════════════════════════
    // RESPONSIVE
    // ═══════════════════════════════════════════════

    @media (max-width: 768px) {
      .settings-panel {
        width: 100%;
        max-height: 60vh;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      }
    }
  `],
})
export class MapSettingsPanelComponent {
  @Output() closePanel = new EventEmitter<void>();
  @Output() navigateTo = new EventEmitter<{ lng: number; lat: number; zoom?: number }>();

  readonly chartSettings = inject(ChartSettingsService);
  readonly prefs = inject(PreferencesService);

  readonly openSection = signal<string | null>('ais');

  readonly navigatePresets = NAVIGATE_PRESETS;
  readonly vesselTypeLabels = VESSEL_TYPE_LABELS;
  readonly vesselTypeKeys = VESSEL_TYPE_KEYS;

  readonly aisAgeOptions: { label: string; value: AisDisplayAge }[] = [
    { label: '1 hour',  value: '1h'  },
    { label: '24 hours', value: '24h' },
  ];

  readonly trackDurationOptions: { label: string; value: TrackDuration }[] = [
    { label: '1 day',   value: '1d'  },
    { label: '7 days',  value: '7d'  },
    { label: '90 days', value: '90d' },
  ];

  readonly speedUnitOptions: { label: string; value: SpeedUnit }[] = [
    { label: 'knots', value: 'kn'   },
    { label: 'm/s',   value: 'm/s'  },
    { label: 'km/h',  value: 'km/h' },
  ];

  toggleSection(section: string): void {
    this.openSection.set(this.openSection() === section ? null : section);
  }
}
