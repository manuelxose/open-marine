import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChartRemoteCatalogService,
  type AreaGeometry,
  type AreaSearchResult,
  type ChartCatalogSource,
  type ChartInstallationDiagnostics,
  type PackageManifest,
  type PackagePlan,
} from '../../../../data-access/chart/chart-remote-catalog.service';
import type { EngineChartSource } from '../../../../data-access/chart/chart-engine-api.service';

export type AreaSelectionMode = 'rectangle' | 'polygon' | 'viewport';

const RIA_VIGO_GEOMETRY: AreaGeometry = {
  type: 'Polygon',
  coordinates: [[
    [-9.05, 42.05],
    [-8.4, 42.05],
    [-8.4, 42.4],
    [-9.05, 42.4],
    [-9.05, 42.05],
  ]],
};

@Component({
  selector: 'app-chart-source-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="package-wizard" aria-label="Offline chart package wizard">
      <header class="wizard-head">
        <div>
          <h3>Create chart package</h3>
          <p>Choose one area. OMI composes legal official and supplementary layers without bulk-downloading prohibited tiles.</p>
        </div>
        <span class="step-badge">1 · Area</span>
      </header>

      <div class="mode-grid" role="group" aria-label="Area selection mode">
        <button type="button" [class.active]="mode() === 'search'" (click)="mode.set('search')">Search place</button>
        <button type="button" (click)="requestAreaSelection.emit('rectangle')">Draw rectangle</button>
        <button type="button" (click)="requestAreaSelection.emit('polygon')">Draw polygon</button>
        <button type="button" (click)="requestAreaSelection.emit('viewport')">Current view</button>
        <button type="button" [class.active]="mode() === 'coordinates'" (click)="mode.set('coordinates')">Coordinates</button>
      </div>

      @if (mode() === 'search') {
        <form class="search-row" (ngSubmit)="search()">
          <input
            type="search"
            name="areaQuery"
            [(ngModel)]="searchQuery"
            placeholder="Vigo, Cíes, A Coruña…"
            aria-label="Spanish place name"
          />
          <button class="primary" type="submit" [disabled]="searching() || searchQuery.trim().length < 2">
            {{ searching() ? 'Searching…' : 'Search' }}
          </button>
        </form>
        <button class="preset" type="button" (click)="useVigoPreset()">Use Ría de Vigo preset</button>
        @if (searchResults().length > 0) {
          <div class="result-list">
            @for (result of searchResults(); track result.id) {
              <button type="button" class="result" (click)="selectSearchResult(result)">
                <strong>{{ result.label }}</strong>
                <small>{{ result.type }} · {{ result.province || 'España' }}</small>
              </button>
            }
          </div>
        }
      }

      @if (mode() === 'coordinates') {
        <div class="coordinate-row">
          <label>West<input type="number" step="0.0001" [(ngModel)]="west" /></label>
          <label>South<input type="number" step="0.0001" [(ngModel)]="south" /></label>
          <label>East<input type="number" step="0.0001" [(ngModel)]="east" /></label>
          <label>North<input type="number" step="0.0001" [(ngModel)]="north" /></label>
          <button type="button" class="primary" (click)="applyCoordinates()">Use area</button>
        </div>
      }

      @if (geometry(); as area) {
        <article class="area-summary">
          <div>
            <strong>{{ areaLabel() }}</strong>
            <small>{{ vertexCount(area) }} vertices · {{ formatBounds(area) }}</small>
          </div>
          <div class="area-actions">
            <label>Margin
              <select [(ngModel)]="marginNm" (change)="applyMargin()">
                <option [ngValue]="0">None</option>
                <option [ngValue]="1">1 NM</option>
                <option [ngValue]="3">3 NM</option>
                <option [ngValue]="5">5 NM</option>
                <option [ngValue]="10">10 NM</option>
              </select>
            </label>
            <button type="button" (click)="previewArea.emit(bounds(area))">View</button>
            <button type="button" (click)="clearArea()">Clear</button>
          </div>
        </article>
      } @else {
        <p class="empty">Search for a place, draw on the chart, use the current viewport or enter coordinates.</p>
      }

      <div class="plan-form">
        <label>Package name<input type="text" [(ngModel)]="packageName" maxlength="80" /></label>
        <label>Profile
          <select [(ngModel)]="profile">
            <option value="recommended">Recommended for Spain</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>Storage budget
          <select [(ngModel)]="storageBudgetGb">
            <option [ngValue]="1">1 GB</option>
            <option [ngValue]="5">5 GB</option>
            <option [ngValue]="10">10 GB</option>
            <option [ngValue]="25">25 GB</option>
          </select>
        </label>
        <button type="button" class="primary plan-btn" [disabled]="!geometry() || planning()" (click)="calculatePlan()">
          {{ planning() ? 'Calculating…' : 'Review package' }}
        </button>
      </div>

      @if (plan(); as currentPlan) {
        <section class="plan">
          <header class="plan-head">
            <div>
              <span class="step-badge">2 · Review</span>
              <h4>{{ currentPlan.name }}</h4>
            </div>
            <div class="size">
              <strong>{{ formatBytes(currentPlan.estimatedBytes) }}</strong>
              <small>{{ formatBytes(currentPlan.availableBytes) }} free</small>
            </div>
          </header>

          <div class="layer-list">
            @for (layer of currentPlan.layers; track layer.id) {
              <article class="layer" [class.layer--required]="layer.required && layer.state !== 'ready'">
                <div class="layer-title">
                  <strong>{{ layer.label }}</strong>
                  <span [class.official]="layer.official">{{ layer.official ? 'Official' : 'Supplement' }}</span>
                </div>
                <small>{{ acquisitionLabel(layer.acquisition) }} · {{ layer.license }}</small>
                <small [class.warning]="layer.navigationUse === 'not-for-navigation' || layer.state === 'required'">
                  {{ layer.reason || navigationLabel(layer.navigationUse) }}
                </small>
              </article>
            }
          </div>

          @for (blocker of currentPlan.blockers; track blocker) {
            <p class="banner error">{{ blocker }}</p>
          }
          @for (warning of currentPlan.warnings; track warning) {
            <p class="banner warning">{{ warning }}</p>
          }
          @for (license of currentPlan.licenses; track license.id) {
            <p class="license">
              <strong>{{ license.label }}</strong>
              <span>{{ license.message }}</span>
              @if (license.url) { <a [href]="license.url" target="_blank" rel="noopener">Provider</a> }
            </p>
          }
          <button type="button" class="primary create-btn" [disabled]="!currentPlan.canCreate || creating()" (click)="createPackage()">
            {{ creating() ? 'Creating…' : 'Create and download permitted data' }}
          </button>
        </section>
      }

      @if (error()) {
        <p class="banner error">{{ error() }}</p>
      }

      <section class="installed">
        <header>
          <div>
            <span class="step-badge">3 · Packages</span>
            <h4>Installed areas</h4>
          </div>
          <button type="button" (click)="loadPackages()">Refresh</button>
        </header>
        @if (packages().length === 0) {
          <p class="empty">No area packages created yet.</p>
        }
        @for (item of packages(); track item.id) {
          <article class="package">
            <div class="package-main">
              <strong>{{ item.name }}</strong>
              <span class="state" [class.ready]="item.state === 'ready'" [class.failed]="item.state === 'failed'">
                {{ item.state }}
              </span>
              <small>{{ readyLayers(item) }} of {{ item.layers.length }} layers ready · {{ item.updatedAt | date: 'short' }}</small>
            </div>
            <div class="package-actions">
              <button type="button" [disabled]="!hasReadyChart(item)" (click)="selectPackage.emit(item)">Use package</button>
              <button type="button" (click)="viewArea.emit(item.bounds)">View</button>
              @if (item.state === 'failed' || item.state === 'incomplete') {
                <button type="button" (click)="repair(item)">Repair</button>
              }
              @if (item.state === 'downloading') {
                <button type="button" (click)="cancel(item)">Cancel</button>
              }
              <button type="button" class="danger" (click)="remove(item)">Delete manifest</button>
            </div>
            @for (layer of pendingImportLayers(item); track layer.id) {
              <div class="attach-row">
                <span><strong>{{ layer.label }}</strong><small>{{ layer.reason }}</small></span>
                <select
                  [ngModel]="attachSelections[attachmentKey(item.id, layer.id)] || ''"
                  (ngModelChange)="setAttachment(item.id, layer.id, $event)"
                  aria-label="Choose an imported local chart">
                  <option value="">Choose imported chart…</option>
                  @for (chart of compatibleCharts(layer.role); track chart.id) {
                    <option [value]="chart.id">{{ chart.label }} · {{ chart.kind }}</option>
                  }
                </select>
                <button
                  type="button"
                  [disabled]="!attachSelections[attachmentKey(item.id, layer.id)]"
                  (click)="attach(item, layer.id)">
                  Attach
                </button>
              </div>
            }
          </article>
        }
      </section>

      <details class="providers">
        <summary>Source availability and legal acquisition</summary>
        @for (source of sources(); track source.id) {
          <div>
            <strong>{{ source.name }}</strong>
            <span>{{ source.region }} · {{ source.availability }} · {{ source.enabled ? 'configured' : 'pending configuration' }}</span>
          </div>
        }
      </details>

      @if (installation(); as diagnostic) {
        <details class="providers">
          <summary>S-63 and conversion diagnostics</summary>
          <div>
            <strong>S-63 {{ diagnostic.s63.mode }}</strong>
            <span>{{ diagnostic.s63.ready ? 'Ready' : 'Pending requirements' }} · HW_ID {{ diagnostic.s63.hardwareId }}</span>
          </div>
          @for (blocker of diagnostic.s63.blockers; track blocker) {
            <p class="banner warning">{{ blocker }}</p>
          }
          @for (tool of diagnostic.tools; track tool.id) {
            <div>
              <strong>{{ tool.id }}</strong>
              <span>{{ tool.available ? 'Available' : 'Missing' }} · {{ tool.purpose }}</span>
            </div>
          }
        </details>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .package-wizard { display: flex; flex-direction: column; gap: var(--space-3); color: var(--gb-text-value); }
    h3, h4, p { margin: 0; }
    h3 { font-size: 1rem; }
    h4 { font-size: .86rem; margin-top: 3px; }
    button, input, select { min-height: 44px; font: inherit; }
    button { border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); background: var(--gb-bg-glass); color: var(--gb-text-value); cursor: pointer; padding: 0 var(--space-2); }
    button:hover, button.active { border-color: var(--gb-border-active); background: var(--gb-bg-glass-active); }
    button:disabled { opacity: .45; cursor: not-allowed; }
    button.primary { background: var(--gb-tick-reference); color: var(--gb-bg-canvas); border-color: transparent; font-weight: 650; }
    input, select { box-sizing: border-box; border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); background: var(--gb-bg-glass); color: var(--gb-text-value); padding: 0 var(--space-2); }
    label { display: flex; flex-direction: column; gap: 4px; font-size: .7rem; color: var(--gb-text-muted); text-transform: uppercase; letter-spacing: .06em; }
    .wizard-head, .plan-head, .installed > header { display: flex; justify-content: space-between; gap: var(--space-2); align-items: flex-start; }
    .wizard-head p { margin-top: 4px; font-size: .76rem; color: var(--gb-text-muted); max-width: 55ch; }
    .step-badge { flex: none; font-size: .65rem; letter-spacing: .06em; text-transform: uppercase; color: var(--gb-tick-reference); }
    .mode-grid { display: grid; grid-template-columns: repeat(5, minmax(92px, 1fr)); gap: var(--space-1); }
    .search-row { display: grid; grid-template-columns: 1fr auto; gap: var(--space-1); }
    .preset { align-self: flex-start; color: var(--gb-tick-reference); }
    .result-list { display: grid; gap: var(--space-1); }
    .result { text-align: left; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
    .result small, .empty, .layer small, .package small { color: var(--gb-text-muted); font-size: .7rem; }
    .coordinate-row { display: grid; grid-template-columns: repeat(4, 1fr) auto; gap: var(--space-1); align-items: end; }
    .area-summary { display: flex; justify-content: space-between; gap: var(--space-2); padding: var(--space-2); background: var(--gb-bg-glass-active); border: 1px solid var(--gb-border-active); border-radius: var(--radius-md); }
    .area-summary > div:first-child { display: flex; flex-direction: column; gap: 4px; }
    .area-summary small { color: var(--gb-text-muted); font: .68rem var(--font-mono, monospace); }
    .area-actions, .package-actions { display: flex; flex-wrap: wrap; gap: var(--space-1); align-items: end; }
    .area-actions label { min-width: 90px; }
    .plan-form { display: grid; grid-template-columns: minmax(160px, 1fr) minmax(140px, .7fr) minmax(110px, .5fr) auto; gap: var(--space-2); align-items: end; }
    .plan, .installed { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-lg); background: var(--gb-bg-glass); }
    .size { display: flex; flex-direction: column; text-align: right; font-family: var(--font-mono, monospace); }
    .size small { color: var(--gb-text-muted); font-size: .66rem; }
    .layer-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: var(--space-1); }
    .layer { display: flex; flex-direction: column; gap: 4px; padding: var(--space-2); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); background: var(--gb-bg-glass); }
    .layer--required { border-color: var(--gb-alarm-warning-border); }
    .layer-title { display: flex; justify-content: space-between; gap: var(--space-1); }
    .layer-title span, .state { font-size: .62rem; text-transform: uppercase; color: var(--gb-text-muted); }
    .layer-title span.official, .state.ready { color: var(--gb-data-good); }
    .state.failed { color: var(--gb-data-stale); }
    small.warning { color: var(--gb-data-warn); }
    .banner, .license { padding: var(--space-2); border-radius: var(--radius-sm); font-size: .72rem; }
    .banner.error { color: var(--gb-data-stale); background: var(--gb-alarm-emergency-bg); border: 1px solid var(--gb-alarm-emergency-border); }
    .banner.warning { color: var(--gb-data-warn); background: var(--gb-alarm-warning-bg); border: 1px solid var(--gb-alarm-warning-border); }
    .license { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-2); border: 1px solid var(--gb-border-panel); color: var(--gb-text-muted); }
    .license a { color: var(--gb-tick-reference); }
    .create-btn { align-self: flex-end; }
    .package { display: flex; justify-content: space-between; gap: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--gb-border-panel); }
    .package { flex-wrap: wrap; }
    .package-main { display: grid; grid-template-columns: auto auto; gap: 3px var(--space-2); }
    .package-main small { grid-column: 1 / -1; }
    button.danger { color: var(--gb-data-stale); border-color: var(--gb-alarm-emergency-border); }
    .attach-row { flex: 0 0 100%; display: grid; grid-template-columns: minmax(170px, 1fr) minmax(180px, 1fr) auto; align-items: center; gap: var(--space-1); padding: var(--space-1); background: var(--gb-bg-glass-active); border-radius: var(--radius-sm); }
    .attach-row span { display: flex; flex-direction: column; gap: 2px; }
    .attach-row small { color: var(--gb-text-muted); font-size: .66rem; }
    details.providers { font-size: .74rem; color: var(--gb-text-muted); }
    details.providers summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; }
    details.providers div { display: flex; justify-content: space-between; gap: var(--space-2); padding: var(--space-1) 0; border-top: 1px solid var(--gb-border-panel); }
    @media (max-width: 760px) {
      .mode-grid { grid-template-columns: repeat(2, 1fr); }
      .coordinate-row, .plan-form { grid-template-columns: repeat(2, 1fr); }
      .coordinate-row .primary, .plan-btn { grid-column: 1 / -1; }
      .area-summary, .package { flex-direction: column; }
      .attach-row { grid-template-columns: 1fr; }
    }
  `],
})
export class ChartSourceCatalogComponent implements OnChanges {
  private readonly catalog = inject(ChartRemoteCatalogService);

  @Input() selectedGeometry: AreaGeometry | null = null;
  @Output() requestAreaSelection = new EventEmitter<AreaSelectionMode>();
  @Output() viewArea = new EventEmitter<[number, number, number, number]>();
  @Output() previewArea = new EventEmitter<[number, number, number, number]>();
  @Output() packageChanged = new EventEmitter<void>();
  @Output() selectPackage = new EventEmitter<PackageManifest>();

  readonly mode = signal<'search' | 'coordinates'>('search');
  readonly geometry = signal<AreaGeometry | null>(null);
  readonly areaLabel = signal('Selected area');
  readonly searchResults = signal<AreaSearchResult[]>([]);
  readonly searching = signal(false);
  readonly planning = signal(false);
  readonly creating = signal(false);
  readonly plan = signal<PackagePlan | null>(null);
  readonly packages = signal<PackageManifest[]>([]);
  readonly sources = signal<ChartCatalogSource[]>([]);
  readonly installation = signal<ChartInstallationDiagnostics | null>(null);
  readonly localCharts = signal<EngineChartSource[]>([]);
  readonly error = signal<string | null>(null);

  searchQuery = '';
  packageName = 'Ría de Vigo';
  profile: 'recommended' | 'custom' = 'recommended';
  storageBudgetGb = 5;
  marginNm = 0;
  west = -9.05;
  south = 42.05;
  east = -8.4;
  north = 42.4;
  private geometryWithoutMargin: AreaGeometry | null = null;
  attachSelections: Record<string, string> = {};

  constructor() {
    this.loadPackages();
    this.catalog.listSources().subscribe({ next: (sources) => this.sources.set(sources), error: () => {} });
    this.catalog.installationDiagnostics().subscribe({ next: (diagnostic) => this.installation.set(diagnostic), error: () => {} });
    this.loadLocalCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedGeometry'] && this.selectedGeometry) {
      this.setGeometry(this.selectedGeometry, 'Drawn area');
    }
  }

  search(): void {
    const query = this.searchQuery.trim();
    if (query.length < 2 || this.searching()) return;
    this.searching.set(true);
    this.error.set(null);
    this.catalog.searchAreas(query).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.searching.set(false);
        if (results.length === 0) this.error.set('No Spanish places matched this search.');
      },
      error: (error) => {
        this.searching.set(false);
        this.error.set(this.message(error, 'CartoCiudad search is temporarily unavailable.'));
      },
    });
  }

  selectSearchResult(result: AreaSearchResult): void {
    this.packageName = result.label.split(',')[0]?.trim() || result.label;
    this.setGeometry(result.geometry, result.label);
    this.previewArea.emit(result.bounds);
  }

  useVigoPreset(): void {
    this.packageName = 'Ría de Vigo';
    this.setGeometry(RIA_VIGO_GEOMETRY, 'Ría de Vigo and approaches');
    this.previewArea.emit([-9.05, 42.05, -8.4, 42.4]);
  }

  applyCoordinates(): void {
    if (![this.west, this.south, this.east, this.north].every(Number.isFinite)
      || this.south >= this.north || this.west === this.east) {
      this.error.set('Enter valid west, south, east and north coordinates.');
      return;
    }
    this.setGeometry(rectangle([this.west, this.south, this.east, this.north]), 'Coordinate area');
  }

  applyMargin(): void {
    if (!this.geometryWithoutMargin) return;
    const baseBounds = this.bounds(this.geometryWithoutMargin);
    if (this.marginNm === 0) {
      this.geometry.set(this.geometryWithoutMargin);
      return;
    }
    const centerLat = (baseBounds[1] + baseBounds[3]) / 2;
    const latMargin = this.marginNm / 60;
    const lonMargin = latMargin / Math.max(0.2, Math.cos(centerLat * Math.PI / 180));
    this.geometry.set(rectangle([
      Math.max(-180, baseBounds[0] - lonMargin),
      Math.max(-85, baseBounds[1] - latMargin),
      Math.min(180, baseBounds[2] + lonMargin),
      Math.min(85, baseBounds[3] + latMargin),
    ]));
    this.plan.set(null);
  }

  clearArea(): void {
    this.geometry.set(null);
    this.geometryWithoutMargin = null;
    this.plan.set(null);
    this.marginNm = 0;
  }

  calculatePlan(): void {
    const geometry = this.geometry();
    if (!geometry || this.planning()) return;
    this.planning.set(true);
    this.error.set(null);
    this.catalog.planPackage({
      name: this.packageName.trim() || 'Offline chart area',
      geometry,
      profile: this.profile,
      storageBudgetBytes: this.storageBudgetGb * 1024 ** 3,
    }).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.planning.set(false);
      },
      error: (error) => {
        this.planning.set(false);
        this.error.set(this.message(error, 'The package plan could not be calculated.'));
      },
    });
  }

  createPackage(): void {
    const plan = this.plan();
    if (!plan?.canCreate || this.creating()) return;
    this.creating.set(true);
    this.catalog.createPackage(plan.id).subscribe({
      next: () => {
        this.creating.set(false);
        this.plan.set(null);
        this.loadPackages();
        this.packageChanged.emit();
      },
      error: (error) => {
        this.creating.set(false);
        this.error.set(this.message(error, 'The package could not be created.'));
      },
    });
  }

  loadPackages(): void {
    this.catalog.listPackages().subscribe({
      next: (packages) => this.packages.set(packages),
      error: () => this.packages.set([]),
    });
  }

  loadLocalCharts(): void {
    this.catalog.listLocalCharts().subscribe({
      next: (charts) => this.localCharts.set(charts.filter((chart) => chart.available && chart.id !== 'emodnet-bathymetry')),
      error: () => this.localCharts.set([]),
    });
  }

  repair(item: PackageManifest): void {
    this.catalog.repairPackage(item.id).subscribe({
      next: () => this.loadPackages(),
      error: (error) => this.error.set(this.message(error, 'Package repair failed.')),
    });
  }

  cancel(item: PackageManifest): void {
    this.catalog.cancelPackage(item.id).subscribe({
      next: () => this.loadPackages(),
      error: (error) => this.error.set(this.message(error, 'Package cancellation failed.')),
    });
  }

  remove(item: PackageManifest): void {
    this.catalog.deletePackage(item.id).subscribe({
      next: () => {
        this.loadPackages();
        this.packageChanged.emit();
      },
      error: (error) => this.error.set(this.message(error, 'Package manifest deletion failed.')),
    });
  }

  pendingImportLayers(item: PackageManifest) {
    return item.layers.filter((layer) =>
      layer.state !== 'ready'
      && (layer.acquisition === 'licensed-import' || layer.acquisition === 'manual-import'),
    );
  }

  compatibleCharts(role: string): EngineChartSource[] {
    if (role === 'official-enc' || role === 'coastline' || role === 'seamarks') {
      return this.localCharts().filter((chart) => chart.kind === 'vector');
    }
    return this.localCharts().filter((chart) => chart.kind === 'raster' || chart.kind === 'bathymetry');
  }

  attachmentKey(packageId: string, layerId: string): string {
    return `${packageId}:${layerId}`;
  }

  setAttachment(packageId: string, layerId: string, chartId: string): void {
    this.attachSelections = { ...this.attachSelections, [this.attachmentKey(packageId, layerId)]: chartId };
  }

  attach(item: PackageManifest, layerId: string): void {
    const key = this.attachmentKey(item.id, layerId);
    const chartId = this.attachSelections[key];
    if (!chartId) return;
    this.catalog.attachPackageLayer(item.id, layerId, chartId).subscribe({
      next: () => {
        const next = { ...this.attachSelections };
        delete next[key];
        this.attachSelections = next;
        this.loadPackages();
        this.packageChanged.emit();
      },
      error: (error) => this.error.set(this.message(error, 'The imported chart could not be attached.')),
    });
  }

  vertexCount(area: AreaGeometry): number {
    return Math.max(0, area.coordinates[0]?.length ?? 0) - 1;
  }

  bounds(area: AreaGeometry): [number, number, number, number] {
    const points = area.coordinates[0] ?? [];
    const lons = points.map((point) => point[0]!);
    const lats = points.map((point) => point[1]!);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  }

  formatBounds(area: AreaGeometry): string {
    return this.bounds(area).map((value) => value.toFixed(4)).join(', ');
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024 ** 2) return `${Math.ceil(bytes / 1024)} KB`;
    if (bytes < 1024 ** 3) return `${Math.ceil(bytes / 1024 ** 2)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }

  acquisitionLabel(value: string): string {
    return ({
      automatic: 'Automatic legal download',
      'licensed-import': 'Licensed import required',
      'manual-import': 'Guided legal import',
      'online-reference': 'Online reference only',
    } as Record<string, string>)[value] ?? value;
  }

  navigationLabel(value: string): string {
    return ({
      'official-source': 'Official source data',
      supplementary: 'Supplementary situational information',
      'not-for-navigation': 'Not suitable for navigation',
    } as Record<string, string>)[value] ?? value;
  }

  readyLayers(item: PackageManifest): number {
    return item.layers.filter((layer) => layer.state === 'ready').length;
  }

  hasReadyChart(item: PackageManifest): boolean {
    return item.layers.some((layer) => layer.state === 'ready' && Boolean(layer.chartId));
  }

  private setGeometry(geometry: AreaGeometry, label: string): void {
    this.geometryWithoutMargin = cloneGeometry(geometry);
    this.geometry.set(cloneGeometry(geometry));
    this.areaLabel.set(label);
    this.marginNm = 0;
    this.plan.set(null);
    const [west, south, east, north] = this.bounds(geometry);
    Object.assign(this, { west, south, east, north });
  }

  private message(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: unknown }; message?: unknown };
    return typeof candidate?.error?.message === 'string'
      ? candidate.error.message
      : typeof candidate?.message === 'string'
        ? candidate.message
        : fallback;
  }
}

const rectangle = (bounds: [number, number, number, number]): AreaGeometry => ({
  type: 'Polygon',
  coordinates: [[
    [bounds[0], bounds[1]],
    [bounds[2], bounds[1]],
    [bounds[2], bounds[3]],
    [bounds[0], bounds[3]],
    [bounds[0], bounds[1]],
  ]],
});

const cloneGeometry = (geometry: AreaGeometry): AreaGeometry => ({
  type: 'Polygon',
  coordinates: geometry.coordinates.map((ring) => ring.map((point) => [...point])),
});
