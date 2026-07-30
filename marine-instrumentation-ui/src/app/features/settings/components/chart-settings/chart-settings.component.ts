import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChartSettingsService,
  VESSEL_TYPE_KEYS,
  VESSEL_TYPE_LABELS,
  type EncLayerConfig,
  type WindVectorSource,
} from '../../../chart/services/chart-settings.service';
import { ChartFacadeService } from '../../../chart/services/chart-facade.service';
import { AppToggleComponent } from '../../../../shared/components/app-toggle/app-toggle.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-chart-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppToggleComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="chartSettingsService.settings$ | async as s">
      <h2>Chart</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Auto-center</span>
          <span class="setting-description">Center chart on vessel position when moving.</span>
        </div>
        <app-toggle [ngModel]="s.autoCenter" (ngModelChange)="chartSettingsService.toggleAutoCenter()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Track History</span>
          <span class="setting-description">Show the vessel track line on the chart.</span>
        </div>
        <app-toggle [ngModel]="s.showTrack" (ngModelChange)="chartSettingsService.toggleTrack()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Course Vector</span>
          <span class="setting-description">Display projected course-over-ground vector.</span>
        </div>
        <app-toggle [ngModel]="s.showVector" (ngModelChange)="chartSettingsService.toggleVector()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">True Wind Indicator</span>
          <span class="setting-description">Show true wind direction arrow on chart.</span>
        </div>
        <app-toggle [ngModel]="s.showTrueWind" (ngModelChange)="chartSettingsService.toggleTrueWind()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Range Rings</span>
          <span class="setting-description">Show concentric range rings around the vessel.</span>
        </div>
        <app-toggle [ngModel]="s.showRangeRings" (ngModelChange)="chartSettingsService.toggleRangeRings()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">OpenSeaMap Overlay</span>
          <span class="setting-description">Show seamark / navigational aid overlay tiles.</span>
        </div>
        <app-toggle [ngModel]="s.showOpenSeaMap" (ngModelChange)="chartSettingsService.toggleOpenSeaMap()"></app-toggle>
      </div>

      <h3 class="settings-subtitle">ENC</h3>

      <div
        class="setting-item setting-item--stack"
        *ngIf="chartFacade.encLayerAvailability$ | async as encAvailability">
        <div class="setting-info">
          <span class="setting-label">ENC Chart Layers</span>
          <span class="setting-description">
            Configure semantic nautical layers shown in ENC mode.
          </span>
          <span
            class="setting-description enc-compatibility"
            [class.enc-compatibility--active]="encAvailability.supported">
            {{ encAvailability.message }}
          </span>
          <span class="setting-description">
            Depth areas, contours and hazards can also be overlaid on RasterENC when an authorised
            vector ENC index is installed.
          </span>
        </div>

        <div class="setting-item-inline">
          <div class="setting-info">
            <span class="setting-label">Safety depth (m)</span>
            <span class="setting-description">Areas shallower than this threshold are highlighted.</span>
          </div>
          <span class="line-label">{{ s.safetyDepth | number: '1.1-1' }}m</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="20"
          step="0.5"
          class="setting-slider"
          [ngModel]="s.safetyDepth"
          (ngModelChange)="setSafetyDepth($event)" />

        <div class="grid-two">
          <div class="setting-item-inline">
            <span class="line-label">Depth areas</span>
            <app-toggle [ngModel]="s.encLayers.showDepthAreas" (ngModelChange)="toggleEncLayer('showDepthAreas')"></app-toggle>
          </div>
          <div class="setting-item-inline">
            <span class="line-label">Depth contours</span>
            <app-toggle [ngModel]="s.encLayers.showDepthContours" (ngModelChange)="toggleEncLayer('showDepthContours')"></app-toggle>
          </div>
          <div class="setting-item-inline">
            <span class="line-label">Buoys & signals</span>
            <app-toggle [disabled]="!encAvailability.supported" [ngModel]="s.encLayers.showBuoys" (ngModelChange)="toggleEncLayer('showBuoys')"></app-toggle>
          </div>
          <div class="setting-item-inline">
            <span class="line-label">Hazards</span>
            <app-toggle [ngModel]="s.encLayers.showHazards" (ngModelChange)="toggleEncLayer('showHazards')"></app-toggle>
          </div>
          <div class="setting-item-inline">
            <span class="line-label">Anchorages</span>
            <app-toggle [disabled]="!encAvailability.supported" [ngModel]="s.encLayers.showAnchorages" (ngModelChange)="toggleEncLayer('showAnchorages')"></app-toggle>
          </div>
          <div class="setting-item-inline">
            <span class="line-label">Traffic separation</span>
            <app-toggle [disabled]="!encAvailability.supported" [ngModel]="s.encLayers.showTSS" (ngModelChange)="toggleEncLayer('showTSS')"></app-toggle>
          </div>
          <div class="setting-item-inline">
            <span class="line-label">Lights</span>
            <app-toggle [disabled]="!encAvailability.supported" [ngModel]="s.encLayers.showLights" (ngModelChange)="toggleEncLayer('showLights')"></app-toggle>
          </div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">AIS Targets</span>
          <span class="setting-description">Show other vessels from AIS data.</span>
        </div>
        <app-toggle [ngModel]="s.showAisTargets" (ngModelChange)="chartSettingsService.toggleAisTargets()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">AIS Labels</span>
          <span class="setting-description">Display vessel name labels on AIS targets.</span>
        </div>
        <app-toggle [ngModel]="s.showAisLabels" (ngModelChange)="chartSettingsService.toggleAisLabels()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Lines</span>
          <span class="setting-description">Draw closest point of approach lines to AIS targets.</span>
        </div>
        <app-toggle [ngModel]="s.showCpaLines" (ngModelChange)="chartSettingsService.toggleCpaLines()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{{ 'settings.vessel_enrichment' | translate }}</span>
          <span class="setting-description">{{ 'settings.vessel_enrichment_desc' | translate }}</span>
        </div>
        <app-toggle
          [ngModel]="s.enableVesselEnrichment"
          (ngModelChange)="chartSettingsService.toggleVesselEnrichment()">
        </app-toggle>
      </div>

      <div class="setting-item setting-item--stack">
        <div class="setting-info">
          <span class="setting-label">AIS Vessel Types</span>
          <span class="setting-description">Show/hide categories and configure each category color on chart.</span>
        </div>

        <div class="setting-actions">
          <button type="button" class="text-btn" (click)="chartSettingsService.setAllVesselTypes(true)">Show all</button>
          <button type="button" class="text-btn" (click)="chartSettingsService.setAllVesselTypes(false)">Hide all</button>
          <button type="button" class="text-btn" (click)="chartSettingsService.resetVesselTypeColors()">Reset colors</button>
        </div>

        <div class="vessel-type-grid">
          <div class="vessel-type-row" *ngFor="let type of vesselTypeKeys">
            <label class="vessel-type-toggle">
              <input
                type="checkbox"
                [checked]="s.visibleVesselTypes.includes(type)"
                (change)="chartSettingsService.toggleVesselType(type)" />
              <span class="vessel-swatch" [style.background]="s.vesselTypeColors[type]"></span>
              <span>{{ vesselTypeLabels[type] }}</span>
            </label>
            <input
              type="color"
              class="vessel-color-input"
              [value]="s.vesselTypeColors[type]"
              (input)="chartSettingsService.setVesselTypeColor(type, $any($event.target).value)"
              [attr.aria-label]="'Set color for ' + vesselTypeLabels[type]" />
          </div>
        </div>
      </div>

      <h3 class="settings-subtitle">Vessel</h3>

      <div class="setting-item setting-item--stack">
        <div class="setting-info">
          <span class="setting-label">Own Vessel Icon Size</span>
          <span class="setting-description">Scale of your own vessel marker on chart.</span>
        </div>
        <div class="chip-row">
          <button
            type="button"
            class="chip-btn"
            *ngFor="let option of iconSizeOptions"
            [class.chip-btn--active]="s.ownVesselIconScale === option.value"
            (click)="chartSettingsService.setOwnVesselIconScale(option.value)">
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="setting-item setting-item--stack">
        <div class="setting-item-inline">
          <div class="setting-info">
            <span class="setting-label">Fixed Location Mode</span>
            <span class="setting-description">Use static coordinates instead of live GPS updates.</span>
          </div>
          <app-toggle
            [ngModel]="s.fixedLocationMode"
            (ngModelChange)="chartSettingsService.setFixedLocationMode($event)">
          </app-toggle>
        </div>
        <div class="grid-two">
          <label class="inline-field">
            <span>Latitude</span>
            <input
              type="number"
              step="0.000001"
              [disabled]="!s.fixedLocationMode"
              [ngModel]="s.fixedLocationLat"
              (ngModelChange)="chartSettingsService.setFixedLocation(toNullableNumber($event), s.fixedLocationLon)" />
          </label>
          <label class="inline-field">
            <span>Longitude</span>
            <input
              type="number"
              step="0.000001"
              [disabled]="!s.fixedLocationMode"
              [ngModel]="s.fixedLocationLon"
              (ngModelChange)="chartSettingsService.setFixedLocation(s.fixedLocationLat, toNullableNumber($event))" />
          </label>
        </div>
      </div>

      <div class="setting-item setting-item--stack">
        <div class="setting-info">
          <span class="setting-label">Vessel Lines</span>
          <span class="setting-description">Configure heading, COG, wind vectors and chart zoom thresholds.</span>
        </div>

        <div class="setting-item-inline">
          <span class="line-label">Heading Line</span>
          <app-toggle
            [ngModel]="s.showHeadingLine"
            (ngModelChange)="chartSettingsService.setShowHeadingLine($event)">
          </app-toggle>
        </div>

        <div class="grid-two">
          <label class="inline-field">
            <span>Heading Line (min)</span>
            <input
              type="number"
              min="1"
              max="120"
              [ngModel]="s.headingLineMinutes"
              (ngModelChange)="chartSettingsService.setHeadingLineMinutes(toNumber($event, s.headingLineMinutes))" />
          </label>
          <label class="inline-field">
            <span>COG Line (min)</span>
            <input
              type="number"
              min="1"
              max="120"
              [ngModel]="s.cogLineMinutes"
              (ngModelChange)="chartSettingsService.setCogLineMinutes(toNumber($event, s.cogLineMinutes))" />
          </label>
        </div>

        <div class="setting-item-inline">
          <span class="line-label">Laylines</span>
          <app-toggle
            [ngModel]="s.showLaylines"
            (ngModelChange)="chartSettingsService.setShowLaylines($event)">
          </app-toggle>
        </div>

        <div class="grid-two">
          <label class="inline-field">
            <span>Layline Angle (deg)</span>
            <input
              type="number"
              min="10"
              max="80"
              [ngModel]="s.laylineAngleDeg"
              (ngModelChange)="chartSettingsService.setLaylineAngleDeg(toNumber($event, s.laylineAngleDeg))" />
          </label>
          <label class="inline-field">
            <span>Wind / Track Min Zoom</span>
            <input
              type="number"
              min="0"
              max="24"
              [ngModel]="s.windTrackMinZoom"
              (ngModelChange)="chartSettingsService.setWindTrackMinZoom(toNumber($event, s.windTrackMinZoom))" />
          </label>
        </div>

        <div class="setting-item-inline">
          <span class="line-label">True/Apparent Wind Source</span>
          <div class="chip-row">
            <button
              type="button"
              class="chip-btn"
              *ngFor="let source of windVectorSourceOptions"
              [class.chip-btn--active]="s.windVectorSource === source.value"
              (click)="chartSettingsService.setWindVectorSource(source.value)">
              {{ source.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="setting-item setting-item--stack">
        <div class="setting-item-inline">
          <div class="setting-info">
            <span class="setting-label">Range Rings</span>
            <span class="setting-description">Circles around own ship for quick distance estimation.</span>
          </div>
          <app-toggle
            [ngModel]="s.showRangeRings"
            (ngModelChange)="chartSettingsService.toggleRangeRings()">
          </app-toggle>
        </div>

        <div class="grid-three">
          <label class="inline-field">
            <span>Count</span>
            <input
              type="number"
              min="1"
              max="12"
              [ngModel]="s.rangeRingCount"
              (ngModelChange)="chartSettingsService.setRangeRingCount(toNumber($event, s.rangeRingCount))" />
          </label>
          <label class="inline-field">
            <span>Step (NM)</span>
            <input
              type="number"
              min="0.05"
              step="0.05"
              [ngModel]="s.rangeRingStepNm"
              (ngModelChange)="chartSettingsService.setRangeRingStepNm(toNumber($event, s.rangeRingStepNm))" />
          </label>
          <label class="inline-field">
            <span>Min Zoom</span>
            <input
              type="number"
              min="0"
              max="24"
              [ngModel]="s.rangeRingsMinZoom"
              (ngModelChange)="chartSettingsService.setRangeRingsMinZoom(toNumber($event, s.rangeRingsMinZoom))" />
          </label>
        </div>
      </div>

      <h3 class="settings-subtitle">Other Vessels</h3>

      <div class="setting-item setting-item--stack">
        <div class="setting-info">
          <span class="setting-label">AIS Rendering</span>
          <span class="setting-description">Control target visibility, icon size and stale cleanup windows.</span>
        </div>

        <div class="grid-three">
          <label class="inline-field">
            <span>AIS Icon Scale</span>
            <input
              type="number"
              min="0.4"
              max="2"
              step="0.05"
              [ngModel]="s.aisTargetIconScale"
              (ngModelChange)="chartSettingsService.setAisTargetIconScale(toNumber($event, s.aisTargetIconScale))" />
          </label>
          <label class="inline-field">
            <span>Inactive After (min)</span>
            <input
              type="number"
              min="1"
              max="120"
              [ngModel]="s.aisInactiveAfterMinutes"
              (ngModelChange)="chartSettingsService.setAisInactiveAfterMinutes(toNumber($event, s.aisInactiveAfterMinutes))" />
          </label>
          <label class="inline-field">
            <span>Remove After (min)</span>
            <input
              type="number"
              min="1"
              max="240"
              [ngModel]="s.aisRemoveAfterMinutes"
              (ngModelChange)="chartSettingsService.setAisRemoveAfterMinutes(toNumber($event, s.aisRemoveAfterMinutes))" />
          </label>
        </div>

        <div class="setting-item-inline">
          <span class="line-label">Hide Moored</span>
          <app-toggle
            [ngModel]="s.hideMooredTargets"
            (ngModelChange)="chartSettingsService.setHideMooredTargets($event)">
          </app-toggle>
        </div>
        <div class="setting-item-inline">
          <span class="line-label">Hide Anchored</span>
          <app-toggle
            [ngModel]="s.hideAnchoredTargets"
            (ngModelChange)="chartSettingsService.setHideAnchoredTargets($event)">
          </app-toggle>
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

    .settings-subtitle {
      margin: var(--space-4) 0 var(--space-2) 0;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--gb-text-muted);
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .setting-item--stack {
      align-items: flex-start;
      flex-direction: column;
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

    .setting-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .text-btn {
      border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-surface, transparent);
      color: var(--gb-text-muted);
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm, 6px);
      cursor: pointer;
    }

    .text-btn:hover {
      color: var(--gb-text-value);
      border-color: var(--gb-text-muted);
    }

    .vessel-type-grid {
      width: 100%;
      display: grid;
      gap: var(--space-2);
      margin-top: var(--space-1);
    }

    .vessel-type-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
    }

    .vessel-type-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--gb-text-value);
    }

    .vessel-swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      border: 1px solid color-mix(in srgb, var(--gb-bg-canvas) 20%, transparent);
      flex-shrink: 0;
    }

    .vessel-color-input {
      width: 2rem;
      height: 1.5rem;
      border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-sm, 6px);
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    .setting-item-inline {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .line-label {
      font-size: 0.8125rem;
      color: var(--gb-text-value);
    }

    .chip-row {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .chip-btn {
      border: 1px solid var(--gb-border-panel);
      background: color-mix(in srgb, var(--gb-bg-surface, transparent) 85%, transparent);
      color: var(--gb-text-muted);
      font-size: 0.75rem;
      padding: 0.375rem 0.625rem;
      border-radius: var(--radius-sm, 6px);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .chip-btn--active {
      color: var(--gb-text-value);
      border-color: color-mix(in srgb, var(--gb-needle-secondary) 55%, var(--gb-border-panel));
      background: color-mix(in srgb, var(--gb-needle-secondary) 20%, transparent);
    }

    .grid-two {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
    }

    .grid-three {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-2);
    }

    .inline-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--gb-text-muted);
    }

    .inline-field input {
      border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-sm, 6px);
      background: color-mix(in srgb, var(--gb-bg-surface, transparent) 90%, transparent);
      color: var(--gb-text-value);
      padding: 0.35rem 0.45rem;
      font-size: 0.75rem;
      outline: none;
    }

    .inline-field input:focus {
      border-color: color-mix(in srgb, var(--gb-needle-secondary) 60%, var(--gb-border-panel));
    }

    .inline-field input:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .setting-slider {
      width: 100%;
      accent-color: var(--gb-needle-secondary);
    }

    .setting-slider:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .enc-compatibility {
      color: var(--gb-alarm-warning);
    }

    .enc-compatibility--active {
      color: var(--gb-data-ok);
    }

    @media (max-width: 960px) {
      .grid-two,
      .grid-three {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ChartSettingsComponent {
  readonly chartSettingsService = inject(ChartSettingsService);
  readonly chartFacade = inject(ChartFacadeService);
  readonly vesselTypeKeys = VESSEL_TYPE_KEYS;
  readonly vesselTypeLabels = VESSEL_TYPE_LABELS;
  readonly iconSizeOptions = [
    { label: 'S', value: 0.75 },
    { label: 'M', value: 0.9 },
    { label: 'L', value: 1.15 },
    { label: 'XL', value: 1.4 },
  ];
  readonly windVectorSourceOptions: { label: string; value: WindVectorSource }[] = [
    { label: 'True Wind', value: 'true' },
    { label: 'Apparent Wind', value: 'apparent' },
  ];

  toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = this.toNumber(value, Number.NaN);
    return Number.isFinite(parsed) ? parsed : null;
  }

  setSafetyDepth(value: unknown): void {
    const current = this.chartSettingsService.snapshot.safetyDepth;
    const depth = this.toNumber(value, current);
    this.chartFacade.setSafetyDepth(depth);
  }

  toggleEncLayer(key: keyof EncLayerConfig): void {
    const current = this.chartSettingsService.snapshot.encLayers;
    this.chartFacade.updateEncLayers({ [key]: !current[key] });
  }
}
