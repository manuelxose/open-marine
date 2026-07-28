import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnvironmentApiService, type EnvironmentalLayerDescriptor, type VigoTideDay } from '../../../../data-access/chart/environment-api.service';
import { ChartSettingsService, type EnvironmentalLayerId } from '../../services/chart-settings.service';

@Component({
  selector: 'app-environment-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="environment-panel" aria-label="Marine environment and tides">
      <header class="panel-header">
        <div><strong>Ria de Vigo</strong><span>Marine environment</span></div>
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
          }
          <p class="attribution">{{ selected.attribution }}</p>
        }
        <div class="layer-grid">
          <button type="button" class="layer-btn" [class.layer-btn--active]="activeLayer() === null" (click)="selectLayer(null)">
            Navigation only
          </button>
          @for (layer of layers(); track layer.id) {
            <button type="button" class="layer-btn"
              [class.layer-btn--active]="isLayerActive(layer.id)"
              [disabled]="!layer.available || layer.id === 'bathymetry'"
              [title]="layer.message ?? layer.attribution" (click)="selectLayer(layer.id)">
              <span>{{ layer.label }}</span>
              <small>{{ layer.provider }}</small>
              <small [class.is-stale]="layer.state === 'stale'">{{ layer.state }} / {{ layer.unit }}</small>
              @if (layer.message) { <small class="layer-message">{{ layer.message }}</small> }
            </button>
          }
        </div>

        <div class="depth-safety">
          <label for="safety-depth">Safety depth</label>
          <input id="safety-depth" type="number" min="0.5" max="20" step="0.5"
            [value]="settings.snapshot.safetyDepth" (change)="setSafetyDepth($event)" />
          <span>m</span>
        </div>
        <p class="datum-warning">Chart/source datum applies. Tide predictions are not automatically added to soundings.</p>
      </section>

      <section class="tides">
        <div class="section-title">
          <strong>Vigo tides</strong>
          <span class="state" [class.is-stale]="tides()?.state === 'stale'">{{ tides()?.state ?? 'loading' }}</span>
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
    .layer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1); }
    .layer-btn { display: grid; gap: 2px; padding: var(--space-2); text-align: left; color: var(--gb-text-value); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); cursor: pointer; }
    .layer-btn:hover:not(:disabled), .layer-btn--active { background: var(--gb-bg-glass-active); border-color: var(--gb-border-active); }
    .layer-btn:disabled { opacity: .48; cursor: not-allowed; }
    .layer-btn small { color: var(--gb-text-muted); }
    .layer-message { color: var(--gb-data-stale) !important; }
    .is-stale { color: var(--gb-data-stale) !important; }
    .timeline-label { display: block; margin-top: var(--space-2); font-size: .7rem; color: var(--gb-text-muted); }
    select { width: 100%; margin-top: var(--space-1); padding: var(--space-2); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); }
    .depth-safety { display: grid; grid-template-columns: 1fr 70px auto; align-items: center; gap: var(--space-1); margin-top: var(--space-2); font-size: .7rem; }
    .depth-safety input { width: 100%; padding: var(--space-1); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); }
    .datum-warning { margin: var(--space-1) 0 0; font-size: .62rem; color: var(--gb-data-warn); }
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
  @Output() readonly dismiss = new EventEmitter<void>();
  private readonly api = inject(EnvironmentApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly settings = inject(ChartSettingsService);
  readonly layers = signal<EnvironmentalLayerDescriptor[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly tides = signal<VigoTideDay | null>(null);
  readonly tideError = signal<string | null>(null);
  readonly activeLayer = signal<EnvironmentalLayerId | null>(this.detectActiveLayer());
  readonly currentsActive = signal(this.settings.snapshot.showCurrents);
  readonly selectedDescriptor = computed(() => this.layers().find((layer) => layer.id === this.activeLayer()) ?? null);

  constructor() {
    this.api.layers$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((layers) => this.layers.set(layers));
    this.api.loading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => this.loading.set(loading));
    this.api.error$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => this.error.set(error));
    this.refresh();
    this.loadTides();
  }

  refresh(): void { this.api.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(); }

  selectLayer(layer: EnvironmentalLayerId | null): void {
    this.settings.selectEnvironmentalLayer(layer);
    if (layer === 'currents') {
      this.currentsActive.set(this.settings.snapshot.showCurrents);
    } else {
      this.activeLayer.set(layer);
      if (layer === null) this.currentsActive.set(false);
    }
    const descriptor = this.layers().find((candidate) => candidate.id === layer) ?? null;
    if (descriptor?.validTimes[0]) this.settings.setEnvironmentTime(descriptor.validTimes[0]);
  }

  isLayerActive(layer: EnvironmentalLayerId): boolean {
    return layer === 'currents' ? this.currentsActive() : this.activeLayer() === layer;
  }

  setTime(event: Event): void { this.settings.setEnvironmentTime((event.target as HTMLSelectElement).value); }

  setSafetyDepth(event: Event): void {
    this.settings.setSafetyDepth(Number((event.target as HTMLInputElement).value));
  }

  private loadTides(): void {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    this.api.getVigoTides(date).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (day) => this.tides.set(day),
      error: () => this.tideError.set('Official tide service unavailable and no cached prediction exists.'),
    });
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
