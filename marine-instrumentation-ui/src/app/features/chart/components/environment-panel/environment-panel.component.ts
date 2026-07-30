import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnvironmentApiService, type EnvironmentalLayerDescriptor, type VigoTideDay } from '../../../../data-access/chart/environment-api.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { boundsContain, ChartSettingsService, type EnvironmentalLayerId } from '../../services/chart-settings.service';
import { prefetchMarineResources } from '../../services/marine-field-cache';
import type { ChartSourceOptionVm } from '../../types/chart-vm';

@Component({
  selector: 'app-environment-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="environment-panel" aria-label="Marine environment and tides">
      <header class="panel-header">
        <div><strong>Weather & sea</strong><span>Selected map area</span></div>
        <button type="button" class="close-btn" (click)="dismiss.emit()" aria-label="Close marine environment panel">&times;</button>
      </header>

      <p class="disclaimer">Recreational assistance only - not an ECDIS or a substitute for official charts.</p>

      <section>
        <div class="section-title">
          <strong>Map layer</strong>
          <button type="button" class="link-btn" (click)="refresh()">Refresh</button>
        </div>
        @if (loading()) { <p class="muted">Checking providers...</p> }
        @else if (error()) { <p class="status status--error">{{ error() }}</p> }
        @if (selectedDescriptor(); as selected) {
          @if (selected.validTimes.length > 0) {
            <label class="timeline-label" for="environment-time">Forecast time (UTC)</label>
            <select id="environment-time" [value]="settings.snapshot.environmentTime" (change)="setTime($event)">
              @for (time of selected.validTimes; track time) {
                <option [value]="time">{{ time | date: 'EEE d, HH:mm' : 'UTC' }}</option>
              }
            </select>
            <div class="timeline-controls" aria-label="Forecast playback">
              <button type="button" (click)="stepForecast(-1)" aria-label="Previous forecast frame">−1</button>
              <button type="button" (click)="togglePlayback()" [attr.aria-pressed]="playing()">
                {{ playing() ? 'Pause' : 'Play' }}
              </button>
              <button type="button" (click)="stepForecast(1)" aria-label="Next forecast frame">+1</button>
            </div>
          }
          <p class="attribution">{{ selected.attribution }}</p>
        }
        <div class="weather-area">
          <div>
            <strong>Weather area</strong>
            <small>{{ weatherBoundsLabel() }} · adaptive grid</small>
          </div>
          <label class="weather-area__field">
            <span>Saved zone</span>
            <select [value]="settings.snapshot.activeWeatherZoneId" (change)="activateZone($event)">
              @for (zone of settings.snapshot.weatherZones; track zone.id) {
                <option [value]="zone.id">{{ zone.name }}</option>
              }
            </select>
          </label>
          <div class="weather-area__edit">
            <input
              aria-label="Active weather zone name"
              [value]="activeZoneName()"
              maxlength="60"
              (change)="renameZone($event)">
            <button type="button"
              [disabled]="settings.snapshot.weatherZones.length <= 1"
              (click)="deleteActiveZone()">Delete</button>
          </div>
          <div class="weather-area__actions">
            <button type="button" (click)="requestAreaSelection.emit('viewport')">Current view</button>
            <button type="button" (click)="requestAreaSelection.emit('rectangle')">Draw area</button>
            <button type="button" (click)="requestAreaSelection.emit('polygon')">Polygon</button>
            <button type="button" (click)="useVigoArea()">Vigo</button>
          </div>
          <p class="compatibility-note">
            Dashed outline: effective marine coverage. Select it on the map to see whether it uses
            authorised vector ENC geometry or the less precise coastal fallback.
          </p>
        </div>
        @if (debugVariable(); as variable) {
          <div class="debug-grid">
            <div>
              <strong>Source grid</strong>
              <small>Physical/source nodes only · not the display sampling grid</small>
            </div>
            <button type="button"
              [class.debug-grid__toggle--active]="settings.snapshot.showMarineSourceGrid && settings.snapshot.marineDebugVariable === variable"
              [attr.aria-pressed]="settings.snapshot.showMarineSourceGrid && settings.snapshot.marineDebugVariable === variable"
              (click)="toggleSourceGrid(variable)">
              {{ settings.snapshot.showMarineSourceGrid && settings.snapshot.marineDebugVariable === variable ? 'ON' : 'OFF' }}
            </button>
          </div>
        }
        <div class="layer-list">
          <div class="layer-row layer-row--navigation" [class.layer-row--active]="activeLayer() === null && !currentsActive()">
            <button type="button" class="layer-select"
              [attr.aria-pressed]="activeLayer() === null && !currentsActive()"
              (click)="selectLayer(null)">
              <span class="selection-indicator" aria-hidden="true">
                @if (activeLayer() === null && !currentsActive()) { <span>✓</span> }
              </span>
              <span class="layer-name">Navigation only</span>
              <small>No environmental overlay</small>
            </button>
          </div>
          @for (layer of layers(); track layer.id) {
            <div class="layer-row"
              [class.layer-row--active]="isLayerActive(layer.id)"
              [class.layer-row--expanded]="legendLayer() === layer.id"
              [class.layer-row--unavailable]="!layerAvailableForArea(layer) || layer.id === 'bathymetry'">
              <button type="button" class="layer-select"
                [attr.aria-label]="layer.label"
                [attr.aria-pressed]="isLayerActive(layer.id)"
                [disabled]="!layerAvailableForArea(layer) || layer.id === 'bathymetry'"
                (click)="selectLayer(layer.id)">
                <span class="selection-indicator" aria-hidden="true">
                  @if (isLayerActive(layer.id)) { <span>✓</span> }
                </span>
                <span class="layer-name">{{ layer.label }}</span>
                <small [class.is-stale]="layer.state === 'stale'">{{ layer.state }} · {{ layer.unit }}</small>
              </button>
              <button type="button" class="info-btn"
                [class.info-btn--active]="legendLayer() === layer.id"
                [attr.aria-expanded]="legendLayer() === layer.id"
                [attr.aria-controls]="'layer-legend-' + layer.id"
                [attr.aria-label]="'Information about ' + layer.label"
                (click)="toggleLegend(layer.id); $event.stopPropagation()">i</button>
              @if (legendLayer() === layer.id) {
                <div class="layer-legend" [id]="'layer-legend-' + layer.id" role="note">
                  <div><strong>Provider</strong><span>{{ layer.provider }}</span></div>
                  <div><strong>Coverage</strong><span>{{ layerCompatibility(layer) }}</span></div>
                  <div><strong>Attribution</strong><span>{{ layer.attribution }}</span></div>
                  @if (layer.id === 'wind') {
                    <div><strong>Symbols</strong><span>Half barb 5 kn · full barb 10 kn · pennant 50 kn. Shaft points from the wind.</span></div>
                  }
                  @if (layer.message) {
                    <p class="layer-message">{{ layer.message }}</p>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="depth-safety">
          <label for="safety-depth">Safety depth</label>
          <input id="safety-depth" type="number" min="0.5" max="20" step="0.5"
            [value]="settings.snapshot.safetyDepth"
            [disabled]="!safetyDepthCompatible()"
            (change)="setSafetyDepth($event)" />
          <span>m</span>
          <button type="button" class="info-btn"
            [class.info-btn--active]="safetyLegendOpen()"
            [attr.aria-expanded]="safetyLegendOpen()"
            aria-controls="safety-depth-legend"
            aria-label="Information about safety depth"
            (click)="safetyLegendOpen.set(!safetyLegendOpen())">i</button>
        </div>
        @if (safetyLegendOpen()) {
          <div id="safety-depth-legend" class="layer-legend safety-legend" role="note">
            <p class="compatibility-note" [class.compatibility-note--active]="safetyDepthCompatible()">
              {{ safetyDepthCompatibilityText() }}
            </p>
            <p class="datum-warning">Chart/source datum applies. Tide predictions are not automatically added to soundings.</p>
          </div>
        }
      </section>

      <section class="tides">
        <div class="section-title">
          <strong>Vigo tides</strong>
          <span class="state" [class.is-stale]="tides()?.state === 'stale' || tideError()">
            {{ tides()?.state ?? (tideError() ? 'unavailable' : 'loading') }}
          </span>
        </div>
        @if (tides(); as day) {
          <div class="tide-strip">
            @for (event of day.events; track event.time) {
              <div class="tide-event">
                <span aria-hidden="true">{{ event.type === 'high' ? 'HIGH' : 'LOW' }}</span>
                <strong>{{ event.time }}</strong>
                <small>{{ event.heightMeters | number: '1.2-2' }} m</small>
              </div>
            }
          </div>
          <p class="attribution">{{ day.attribution }} / Europe-Madrid / {{ day.date }}</p>
        } @else if (tideError()) {
          <p class="status status--error">{{ tideError() }}</p>
        } @else {
          <p class="muted">Loading official Vigo tide extrema...</p>
        }
      </section>
    </aside>
  `,
  styles: [`
    :host { display: block; }
    .environment-panel { display: flex; flex-direction: column; width: min(390px, calc(100vw - 2 * var(--chart-edge-gap))); height: 100%; max-height: 100%; overflow: hidden; padding: var(--space-3); color: var(--gb-text-value); background: var(--chart-overlay-bg); border: 1px solid var(--chart-overlay-border); border-radius: var(--radius-lg); box-shadow: var(--chart-overlay-shadow); backdrop-filter: var(--chart-overlay-blur); }
    .panel-header, .section-title { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
    .panel-header div { display: grid; gap: var(--space-0); }
    .panel-header span, .muted, .attribution { color: var(--gb-text-muted); }
    .panel-header span { font-size: .72rem; }
    .close-btn, .link-btn { border: 0; background: transparent; color: var(--gb-text-muted); cursor: pointer; }
    .close-btn { font-size: 1.35rem; }
    .link-btn { color: var(--gb-tick-reference); }
    .disclaimer { margin: var(--space-2) 0; padding: var(--space-2); font-size: .7rem; color: var(--gb-data-warn); background: var(--gb-alarm-warning-bg); border: 1px solid var(--gb-alarm-warning-border); border-radius: var(--radius-md); }
    section + section { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--gb-border-panel); }
    section:not(.tides) { min-height: 0; overflow: auto; padding-right: var(--space-1); }
    .tides { flex: 0 0 auto; }
    .section-title { margin-bottom: var(--space-2); font-size: .8rem; }
    .weather-area { display: grid; gap: var(--space-2); margin-bottom: var(--space-2); padding: var(--space-2); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); }
    .weather-area > div:first-child { display: grid; gap: var(--space-0); }
    .weather-area small { color: var(--gb-text-muted); font-size: .64rem; }
    .weather-area__field { display: grid; gap: var(--space-0); color: var(--gb-text-muted); font-size: .64rem; }
    .weather-area__field select { margin-top: 0; }
    .weather-area__edit { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1); }
    .weather-area__edit input { min-width: 0; padding: var(--space-2); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); }
    .weather-area__edit button { min-height: 44px; padding: 0 var(--space-2); color: var(--gb-data-stale); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-full); }
    .weather-area__edit button:disabled { opacity: .4; }
    .weather-area__actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1); }
    .weather-area__actions button { min-height: 44px; padding: var(--space-1); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-full); cursor: pointer; font-size: .66rem; }
    .weather-area__actions button:hover { background: var(--gb-bg-glass-active); border-color: var(--gb-border-active); }
    .debug-grid { display: grid; grid-template-columns: minmax(0, 1fr) 64px; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); padding: var(--space-2); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); }
    .debug-grid > div { display: grid; gap: var(--space-0); }
    .debug-grid small { color: var(--gb-text-muted); font-size: .62rem; }
    .debug-grid button { min-height: 44px; color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-full); cursor: pointer; }
    .debug-grid .debug-grid__toggle--active { color: var(--gb-bg-canvas); background: var(--gb-tick-reference); border-color: var(--gb-border-active); }
    .layer-list { display: grid; gap: var(--space-1); }
    .layer-row { display: grid; grid-template-columns: minmax(0, 1fr) 44px; align-items: stretch; overflow: visible; background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-full); transition: border-color 120ms ease, background 120ms ease, border-radius 120ms ease; }
    .layer-row--navigation { grid-template-columns: minmax(0, 1fr); }
    .layer-row--expanded { border-radius: var(--radius-lg); }
    .layer-row:hover:not(.layer-row--unavailable), .layer-row--active { background: var(--gb-bg-glass-active); border-color: var(--gb-border-active); }
    .layer-row--unavailable .layer-select { opacity: .48; cursor: not-allowed; }
    .layer-select { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: var(--space-2); min-height: 48px; padding: var(--space-1) var(--space-2); text-align: left; color: var(--gb-text-value); background: transparent; border: 0; cursor: pointer; }
    .layer-select:focus-visible, .info-btn:focus-visible { outline: 2px solid var(--gb-border-active); outline-offset: -2px; }
    .layer-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .layer-select small { color: var(--gb-text-muted); white-space: nowrap; font-size: .65rem; }
    .selection-indicator { display: grid; place-items: center; width: 22px; height: 22px; color: var(--gb-bg-canvas); background: var(--gb-bg-face); border: 2px solid var(--gb-border-panel); border-radius: var(--radius-full); font-size: .72rem; font-weight: 800; }
    .layer-row--active .selection-indicator { background: var(--gb-tick-reference); border-color: var(--gb-border-active); }
    .info-btn { align-self: center; justify-self: center; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; color: var(--gb-text-muted); background: transparent; border: 1px solid var(--gb-border-panel); border-radius: var(--radius-full); cursor: pointer; font-family: var(--font-mono, monospace); font-weight: 700; }
    .info-btn:hover, .info-btn--active { color: var(--gb-text-value); background: var(--gb-bg-glass-active); border-color: var(--gb-border-active); }
    .layer-legend { grid-column: 1 / -1; display: grid; gap: var(--space-1); margin: 0 var(--space-2) var(--space-2); padding: var(--space-2); color: var(--gb-text-muted); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); font-size: .65rem; }
    .layer-legend > div { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: var(--space-2); }
    .layer-legend strong { color: var(--gb-text-unit); }
    .layer-legend p { margin: 0; }
    .layer-message { color: var(--gb-data-stale) !important; }
    .is-stale { color: var(--gb-data-stale) !important; }
    .timeline-label { display: block; margin-top: var(--space-2); font-size: .7rem; color: var(--gb-text-muted); }
    select { width: 100%; margin-top: var(--space-1); padding: var(--space-2); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); }
    .timeline-controls { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: var(--space-1); margin-top: var(--space-1); }
    .timeline-controls button { min-height: 44px; color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-full); cursor: pointer; }
    .timeline-controls button[aria-pressed="true"] { color: var(--gb-bg-canvas); background: var(--gb-tick-reference); border-color: var(--gb-border-active); }
    .depth-safety { display: grid; grid-template-columns: 1fr 70px auto 44px; align-items: center; gap: var(--space-1); margin-top: var(--space-2); font-size: .7rem; }
    .depth-safety input { width: 100%; padding: var(--space-1); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); }
    .depth-safety input:disabled { opacity: .48; cursor: not-allowed; }
    .compatibility-note { margin: var(--space-1) 0 0; font-size: .62rem; color: var(--gb-data-warn); }
    .compatibility-note--active { color: var(--gb-data-good); }
    .datum-warning { margin: var(--space-1) 0 0; font-size: .62rem; color: var(--gb-data-warn); }
    .safety-legend { margin-top: var(--space-1); }
    .tide-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-1); }
    .tide-event { display: grid; justify-items: center; gap: 2px; padding: var(--space-2) var(--space-1); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); }
    .tide-event > span { font-size: .55rem; color: var(--gb-tick-reference); }
    .tide-event small { color: var(--gb-text-unit); }
    .state, .attribution, .status, .muted { font-size: .66rem; }
    .attribution { margin: var(--space-2) 0 0; }
    .status--error { color: var(--gb-data-stale); }
    @media (max-width: 700px) { .environment-panel { width: calc(100vw - 2 * var(--chart-edge-gap)); } }
  `],
})
export class EnvironmentPanelComponent {
  @Input() activeMapSource: ChartSourceOptionVm | null = null;
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly safetyDepthChange = new EventEmitter<number>();
  @Output() readonly requestAreaSelection = new EventEmitter<'viewport' | 'rectangle' | 'polygon'>();
  private readonly api = inject(EnvironmentApiService);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly destroyRef = inject(DestroyRef);
  readonly settings = inject(ChartSettingsService);
  readonly layers = signal<EnvironmentalLayerDescriptor[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly tides = signal<VigoTideDay | null>(null);
  readonly tideError = signal<string | null>(null);
  readonly activeLayer = signal<EnvironmentalLayerId | null>(this.detectActiveLayer());
  readonly currentsActive = signal(this.settings.snapshot.showCurrents);
  readonly legendLayer = signal<EnvironmentalLayerId | null>(null);
  readonly safetyLegendOpen = signal(false);
  readonly playing = signal(false);
  private playbackTimer: ReturnType<typeof setInterval> | null = null;
  readonly selectedDescriptor = computed(() => {
    const selected = this.activeLayer() ?? (this.currentsActive() ? 'currents' : null);
    return this.layers().find((layer) => layer.id === selected) ?? null;
  });
  readonly debugVariable = computed<'wind' | 'waves' | 'currents' | null>(() => {
    const selected = this.activeLayer() ?? (this.currentsActive() ? 'currents' : null);
    return selected === 'wind' || selected === 'waves' || selected === 'currents' ? selected : null;
  });

  constructor() {
    this.api.layers$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((layers) => this.layers.set(layers));
    this.api.loading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => this.loading.set(loading));
    this.api.error$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => this.error.set(error));
    this.refresh();
    this.destroyRef.onDestroy(() => this.stopPlayback());
  }

  refresh(): void {
    this.api.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.loadTides();
  }

  selectLayer(layer: EnvironmentalLayerId | null): void {
    const descriptor = this.layers().find((candidate) => candidate.id === layer);
    if (descriptor && !this.layerAvailableForArea(descriptor)) return;
    if (layer === 'currents') {
      this.settings.selectEnvironmentalLayer(layer);
      this.currentsActive.set(this.settings.snapshot.showCurrents);
      return;
    }
    if (layer !== null && this.activeLayer() === layer) {
      this.settings.clearThematicEnvironmentalLayer();
      this.activeLayer.set(null);
      this.currentsActive.set(this.settings.snapshot.showCurrents);
      return;
    }
    this.settings.selectEnvironmentalLayer(layer);
    this.activeLayer.set(layer);
    this.currentsActive.set(this.settings.snapshot.showCurrents);
    const selectedDescriptor = descriptor ?? null;
    if (selectedDescriptor?.validTimes[0]) this.settings.setEnvironmentTime(selectedDescriptor.validTimes[0]);
  }

  toggleLegend(layer: EnvironmentalLayerId): void {
    this.legendLayer.update((current) => current === layer ? null : layer);
  }

  toggleSourceGrid(variable: 'wind' | 'waves' | 'currents'): void {
    const active = this.settings.snapshot.showMarineSourceGrid
      && this.settings.snapshot.marineDebugVariable === variable;
    this.settings.setMarineSourceGrid(!active, variable);
  }

  isLayerActive(layer: EnvironmentalLayerId): boolean {
    return layer === 'currents' ? this.currentsActive() : this.activeLayer() === layer;
  }

  setTime(event: Event): void {
    this.settings.setEnvironmentTime((event.target as HTMLSelectElement).value);
    this.prefetchAdjacent();
  }

  togglePlayback(): void {
    if (this.playbackTimer) {
      this.stopPlayback();
      return;
    }
    const times = this.selectedDescriptor()?.validTimes ?? [];
    if (times.length < 2) return;
    this.playing.set(true);
    this.playbackTimer = setInterval(() => this.stepForecast(1), 1100);
    this.prefetchAdjacent();
  }

  stepForecast(delta: -1 | 1): void {
    const times = this.selectedDescriptor()?.validTimes ?? [];
    if (times.length === 0) return;
    const current = Math.max(0, times.indexOf(this.settings.snapshot.environmentTime));
    const next = (current + delta + times.length) % times.length;
    this.settings.setEnvironmentTime(times[next]!);
    this.prefetchAdjacent();
  }

  useVigoArea(): void {
    this.settings.useVigoWeatherZone();
  }

  activateZone(event: Event): void {
    this.settings.activateWeatherZone((event.target as HTMLSelectElement).value);
  }

  renameZone(event: Event): void {
    this.settings.renameWeatherZone(
      this.settings.snapshot.activeWeatherZoneId,
      (event.target as HTMLInputElement).value,
    );
  }

  deleteActiveZone(): void {
    this.settings.deleteWeatherZone(this.settings.snapshot.activeWeatherZoneId);
  }

  activeZoneName(): string {
    return this.settings.snapshot.weatherZones
      .find((zone) => zone.id === this.settings.snapshot.activeWeatherZoneId)?.name ?? '';
  }

  weatherBoundsLabel(): string {
    const [west, south, east, north] = this.settings.snapshot.weatherBounds;
    return `${south.toFixed(2)}–${north.toFixed(2)}° N · ${Math.abs(west).toFixed(2)}–${Math.abs(east).toFixed(2)}° W`;
  }

  setSafetyDepth(event: Event): void {
    this.safetyDepthChange.emit(Number((event.target as HTMLInputElement).value));
  }

  safetyDepthCompatible(): boolean {
    return true;
  }

  safetyDepthCompatibilityText(): string {
    return 'Applied to the independent ENC depth overlay, including above RasterENC. Without an authorised vector ENC index the overlay reports coverage unavailable and does not infer safe water.';
  }

  layerCompatibility(layer: EnvironmentalLayerDescriptor): string {
    if (!this.layerAvailableForArea(layer) && layer.coverage) {
      return 'The saved weather area is outside this provider coverage. Select or draw an area fully inside its coverage.';
    }
    if (layer.compatibilityNote) {
      return layer.compatibilityNote;
    }
    const kinds = layer.compatibleMapKinds?.join(', ') ?? 'raster, vector and bathymetry';
    const zoom = Number.isFinite(layer.minZoom) && Number.isFinite(layer.maxZoom)
      ? ` · zoom ${layer.minZoom}-${layer.maxZoom}`
      : '';
    return `Works on ${kinds} maps${zoom}`;
  }

  layerAvailableForArea(layer: EnvironmentalLayerDescriptor): boolean {
    return layer.available
      && (!layer.coverage || boundsContain(layer.coverage, this.settings.snapshot.weatherBounds));
  }

  private loadTides(): void {
    this.tideError.set(null);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    this.api.getVigoTides(date).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (day) => this.tides.set(day),
      error: () => this.tideError.set('Official tide service unavailable and no cached prediction exists.'),
    });
  }

  private stopPlayback(): void {
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    this.playbackTimer = null;
    this.playing.set(false);
  }

  private prefetchAdjacent(): void {
    const descriptor = this.selectedDescriptor();
    if (!descriptor || !['wind', 'waves', 'currents'].includes(descriptor.id)) return;
    const times = descriptor.validTimes;
    const current = Math.max(0, times.indexOf(this.settings.snapshot.environmentTime));
    const adjacent = [times[current - 1], times[current + 1]].filter((time): time is string => Boolean(time));
    if (adjacent.length === 0) return;
    const base = `${this.environment.chartEngineApiUrl.replace(/\/$/, '')}/api/marine`;
    const [west, south, east, north] = this.settings.snapshot.weatherBounds;
    const variable = descriptor.id === 'wind' ? 'wind' : descriptor.id;
    const urls = adjacent.map((time) => {
      const params = new URLSearchParams({
        west: String(west),
        south: String(south),
        east: String(east),
        north: String(north),
        time,
        source: 'auto',
      });
      return `${base}/${variable}?${params.toString()}`;
    });
    void prefetchMarineResources(urls);
  }

  private detectActiveLayer(): EnvironmentalLayerId | null {
    const s = this.settings.snapshot;
    if (s.showTemperature) return 'seaTemperature';
    if (s.showAirTemperature) return 'airTemperature';
    if (s.showWindSpeed) return 'wind';
    if (s.showWaves) return 'waves';
    if (s.showPrecipitation) return 'precipitation';
    if (s.showClouds) return 'clouds';
    if (s.showPressure) return 'pressure';
    return null;
  }
}
