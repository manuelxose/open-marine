import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { ChartSourceCatalogComponent, type AreaSelectionMode } from '../chart-source-catalog/chart-source-catalog.component';
import { EnvironmentPanelComponent } from '../environment-panel/environment-panel.component';
import { ChartSettingsComponent } from '../../../settings/components/chart-settings/chart-settings.component';
import { toChartId, validateChartFile } from '../../utils/chart-import.util';
import type { ChartControlsVm, ChartImportKind, ChartImportRequestVm, ChartSourceOptionVm } from '../../types/chart-vm';
import { ChartEngineApiService, EngineDiagnostics, EngineStorageStatus } from '../../../../data-access/chart/chart-engine-api.service';
import type { AreaGeometry } from '../../../../data-access/chart/chart-remote-catalog.service';

export type ManagerSection = 'active' | 'navigation' | 'environment' | 'offline' | 'diagnostics';

/**
 * Consolidated chart management modal. Opens over the map as a wide dialog with a
 * side navigation: Active (choose displayed map/chart), Download (remote catalog),
 * Import (upload local charts). Styled with the map overlay / Glass Bridge tokens.
 */
@Component({
  selector: 'app-chart-manager',
  standalone: true,
  imports: [
    CommonModule,
    AppIconComponent,
    ChartSourceCatalogComponent,
    ChartSettingsComponent,
    EnvironmentPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="cm-overlay">
        <div class="cm-dialog" role="dialog" aria-modal="false" aria-label="Chart manager">
          <header class="cm-header">
            <div class="cm-title">
              <app-icon name="map" [size]="18" />
              <h2>Maps and layers</h2>
            </div>
            <div class="cm-header-actions">
              <button type="button" class="cm-text-btn" (click)="refreshCatalog.emit()">Refresh</button>
              <button type="button" class="cm-icon-btn" title="Close" (click)="close.emit()">
                <app-icon name="close" [size]="16" />
              </button>
            </div>
          </header>

          <div class="cm-body">
            <aside class="cm-nav" role="tablist" aria-label="Chart manager sections">
              <button
                type="button"
                class="cm-nav-btn"
                *ngFor="let s of sections"
                [class.is-active]="section() === s.id"
                (click)="selectSection(s.id)"
                role="tab"
                [attr.aria-selected]="section() === s.id">
                <app-icon [name]="s.icon" [size]="16" />
                <span>{{ s.label }}</span>
              </button>

              <div class="cm-engine" [class.is-online]="vm?.chartEngineOnline">
                <span class="cm-dot"></span>
                {{ vm?.chartEngineOnline ? 'Engine online' : 'Engine offline' }}
              </div>
            </aside>

            <div class="cm-content" [ngSwitch]="section()">
              <!-- ACTIVE -->
              <section *ngSwitchCase="'active'" class="pane">
                <p class="pane__hint">Choose which base map or chart is shown on the map.</p>

                <h4 class="pane__title">Base maps</h4>
                <div class="source-grid">
                  <article
                    class="source-card"
                    *ngFor="let source of baseSources(); trackBy: trackSource"
                    [class.is-active]="vm?.sourceId === source.id">
                    <button
                      type="button"
                      class="source-card__main"
                      [disabled]="!source.available"
                      [title]="source.available ? source.description ?? source.label : source.reason ?? 'Source unavailable'"
                      (click)="selectSource.emit(source.id)">
                      <span class="source-card__label">
                        {{ source.label }}
                        <span class="check" *ngIf="vm?.sourceId === source.id"><app-icon name="check" [size]="14" /></span>
                      </span>
                      <span class="source-card__meta">{{ sourceMeta(source) }}</span>
                      <span class="source-card__desc">{{ source.description ?? 'Built-in chart style.' }}</span>
                      <span class="source-card__state" [class.is-unavailable]="!source.available">
                        {{ source.available ? 'Available' : (source.reason ?? 'Unavailable') }}
                      </span>
                    </button>
                    <button
                      *ngIf="source.bounds"
                      type="button"
                      class="coverage-btn"
                      (click)="viewCoverage.emit(source.bounds)">
                      View coverage
                    </button>
                  </article>
                </div>

                <h4 class="pane__title">Local charts</h4>
                <div class="empty" *ngIf="localSources().length === 0">
                  {{ vm?.chartEngineOnline ? 'No local charts yet — use Import to add some.' : 'Start the chart engine to list local charts.' }}
                </div>
                <div class="source-grid">
                  <article
                    class="source-card source-card--local"
                    *ngFor="let source of localSources(); trackBy: trackSource"
                    [class.is-active]="vm?.sourceId === source.id">
                    <button type="button" class="source-card__main" [disabled]="!source.available" (click)="selectSource.emit(source.id)">
                      <span class="source-card__label">
                        {{ source.label }}
                        <span class="check" *ngIf="vm?.sourceId === source.id"><app-icon name="check" [size]="14" /></span>
                      </span>
                      <span class="source-card__meta">{{ sourceMeta(source) }}</span>
                      <span class="source-card__desc">{{ source.description ?? 'Local chart source.' }}</span>
                      <span class="source-card__state" [class.is-unavailable]="!source.available">
                        {{ source.available ? 'Installed' : (source.reason ?? 'Incomplete') }}
                        <ng-container *ngIf="source.minZoom !== undefined && source.maxZoom !== undefined"> · zoom {{ source.minZoom }}–{{ source.maxZoom }}</ng-container>
                      </span>
                    </button>
                    <button
                      *ngIf="source.bounds"
                      type="button"
                      class="coverage-btn"
                      (click)="viewCoverage.emit(source.bounds)">
                      View coverage
                    </button>
                    <button type="button" class="danger-btn" title="Delete chart" (click)="deleteChart.emit(source.id)">
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </article>
                </div>
              </section>

              <section *ngSwitchCase="'navigation'" class="pane pane--settings">
                <p class="pane__hint">Navigation, vessel, ENC and AIS layers. These controls are the single source of truth for the map.</p>
                <app-chart-settings />
              </section>

              <section *ngSwitchCase="'environment'" class="pane pane--environment">
                <p class="pane__hint">Weather overlays for a selected map area, marine models and Vigo tides. Quick forecasts remain available from the separate Weather button.</p>
                <div class="environment-layout">
                  <app-environment-panel
                    [activeMapSource]="activeSource()"
                    (dismiss)="close.emit()"
                    (safetyDepthChange)="safetyDepthChange.emit($event)"
                    (requestAreaSelection)="requestWeatherAreaSelection.emit($event)"
                  />
                </div>
              </section>

              <section *ngSwitchCase="'offline'" class="pane">
                <p class="pane__hint">Installed charts, legal downloads and local imports. Remote providers only use their normal runtime cache.</p>
                <app-chart-source-catalog
                  [selectedGeometry]="selectedPackageGeometry"
                  (requestAreaSelection)="requestAreaSelection.emit($event)"
                  (viewArea)="viewCoverage.emit($event)"
                  (previewArea)="previewArea.emit($event)"
                  (packageChanged)="refreshCatalog.emit()"
                  (selectPackage)="selectPackage.emit($event)"
                />
                <h4 class="pane__title">Import a legal local chart</h4>
                <p class="pane__hint">Upload legal local chart data to the chart engine.</p>

                <div class="banner banner--warn" *ngIf="!vm?.chartEngineOnline">
                  <app-icon name="warning" [size]="16" />
                  <span>The chart engine is offline. Start it to enable imports.</span>
                </div>

                <div class="import-meta">
                  <label class="field">
                    <span>Chart label</span>
                    <input type="text" [value]="importLabel" (input)="onLabelInput($any($event.target).value)" placeholder="Rias Baixas raster" />
                  </label>
                  <label class="field">
                    <span>Chart id</span>
                    <input type="text" [value]="importId" (input)="importId = $any($event.target).value" placeholder="rias-baixas-raster" />
                  </label>
                  <label class="field">
                    <span>MBTiles type</span>
                    <select [value]="importChartKind" (change)="importChartKind = $any($event.target).value">
                      <option value="raster">Raster</option>
                      <option value="vector">Vector ENC</option>
                    </select>
                  </label>
                </div>

                <div class="import-rows">
                  <div class="import-row" *ngFor="let opt of importOptions">
                    <div class="import-row__info">
                      <strong>{{ opt.title }}</strong>
                      <span class="import-row__file" [class.has-file]="selectedFiles[opt.kind]">{{ selectedFileName(opt.kind) }}</span>
                    </div>
                    <div class="import-row__actions">
                      <label class="file-btn">
                        <input type="file" [accept]="opt.accept" (change)="onFileSelected(opt.kind, $event)" />
                        Choose
                      </label>
                      <button
                        class="primary-btn"
                        type="button"
                        [disabled]="!vm?.chartEngineOnline || !selectedFiles[opt.kind]"
                        (click)="submitImport(opt.kind)">
                        {{ opt.action }}
                      </button>
                    </div>
                  </div>
                </div>

                <p class="banner banner--error" *ngIf="importError"><app-icon name="error" [size]="16" /><span>{{ importError }}</span></p>
                <p class="banner banner--ok" *ngIf="importNotice"><app-icon name="check" [size]="16" /><span>{{ importNotice }}</span></p>

                <h4 class="pane__title">Jobs</h4>
                <div class="empty" *ngIf="!vm || vm.chartJobs.length === 0">No import jobs yet.</div>
                <div class="jobs">
                  <article class="job" *ngFor="let job of vm?.chartJobs ?? []" [class.is-failed]="job.status === 'failed'">
                    <div class="job__head">
                      <strong>{{ job.label }}</strong>
                      <span class="badge" [class]="'badge-' + job.status">{{ job.status }}</span>
                    </div>
                    <small>{{ job.kind }} · {{ job.chartId }}</small>
                    <small class="err" *ngIf="job.error">{{ job.error }}</small>
                  </article>
                </div>
              </section>

              <section *ngSwitchCase="'diagnostics'" class="pane">
                <p class="pane__hint">Map engine and source diagnostics. Errors are kept bounded and never interrupt navigation overlays.</p>
                <div class="banner" [class.banner--ok]="vm?.chartEngineOnline" [class.banner--warn]="!vm?.chartEngineOnline">
                  <app-icon [name]="vm?.chartEngineOnline ? 'check' : 'warning'" [size]="16" />
                  <span>{{ vm?.chartEngineOnline ? 'Chart engine online' : (vm?.chartEngineMessage || 'Chart engine offline') }}</span>
                </div>
                <div class="banner banner--warn" *ngIf="diagnosticsLoading()">Loading provider diagnostics…</div>
                <div class="banner banner--error" *ngIf="diagnosticsError()">
                  <app-icon name="warning" [size]="16" />
                  <span>{{ diagnosticsError() }} <button type="button" class="retry-btn" (click)="loadDiagnostics()">Retry</button></span>
                </div>
                @if (diagnostics(); as details) {
                  <div class="diagnostic-summary">
                    <article class="job">
                      <div class="job__head"><strong>OpenWeatherMap</strong><span class="badge" [class.badge-completed]="details.weatherConfigured" [class.badge-failed]="!details.weatherConfigured">{{ details.weatherConfigured ? 'configured' : 'credentials missing' }}</span></div>
                    </article>
                    <article class="job">
                      <div class="job__head">
                        <strong>Copernicus Marine</strong>
                        <span class="badge" [class.badge-completed]="details.environmentSync.enabled && !details.environmentSync.lastError" [class.badge-failed]="!details.environmentSync.enabled || details.environmentSync.lastError">{{ copernicusState(details) }}</span>
                      </div>
                      <small *ngIf="details.environmentSync.lastCompletedAt">Last synchronized {{ details.environmentSync.lastCompletedAt | date: 'medium' }}</small>
                      <small class="err" *ngIf="details.environmentSync.lastError">{{ details.environmentSync.lastError }}</small>
                      <button
                        type="button"
                        class="retry-btn"
                        [disabled]="!details.environmentSync.enabled || details.environmentSync.running || copernicusSyncing()"
                        (click)="runCopernicusSync()">
                        {{ copernicusSyncing() ? 'Synchronizing…' : 'Sync now' }}
                      </button>
                    </article>
                  </div>
                  @if (storage(); as disk) {
                    <article class="job storage-card" [class.is-failed]="disk.pressure">
                      <div class="job__head">
                        <strong>Local cache storage</strong>
                        <span class="badge" [class.badge-completed]="!disk.pressure" [class.badge-failed]="disk.pressure">
                          {{ disk.pressure ? 'cleanup required' : 'controlled' }}
                        </span>
                      </div>
                      <progress [value]="disk.evictableUsedBytes" [max]="disk.quotaBytes"></progress>
                      <small>{{ formatBytes(disk.evictableUsedBytes) }} of {{ formatBytes(disk.quotaBytes) }} cache · {{ formatBytes(disk.availableBytes) }} free</small>
                      <small>
                        @for (category of disk.categories; track category.id) {
                          <span>{{ category.id }} {{ formatBytes(category.usedBytes) }} · </span>
                        }
                      </small>
                      <button type="button" class="retry-btn" [disabled]="storageCleaning()" (click)="cleanStorage()">
                        {{ storageCleaning() ? 'Cleaning…' : 'Clean cache' }}
                      </button>
                    </article>
                  }
                  <p class="err" *ngIf="storageError()">{{ storageError() }}</p>
                  <h4 class="pane__title">Remote providers</h4>
                  <div class="jobs">
                    <article class="job" *ngFor="let provider of providers(details)" [class.is-failed]="provider.lastError && !provider.lastSuccessAt">
                      <div class="job__head">
                        <strong>{{ provider.id }}</strong>
                        <span class="badge" [class.badge-completed]="provider.available && !provider.lastError" [class.badge-failed]="!provider.available || provider.lastError">{{ provider.available ? (provider.lastError ? 'degraded' : 'available') : 'unavailable' }}</span>
                      </div>
                      <small *ngIf="provider.lastSuccessAt">Last success {{ provider.lastSuccessAt | date: 'medium' }}</small>
                      <small class="err" *ngIf="provider.lastError">{{ provider.lastError }}</small>
                    </article>
                  </div>
                }
                <div class="empty" *ngIf="!vm || vm.mapErrors.length === 0">No map errors recorded in this session.</div>
                <div class="jobs">
                  <article class="job is-failed" *ngFor="let error of vm?.mapErrors ?? []">
                    <div class="job__head">
                      <strong>{{ error.sourceId || 'MapLibre' }}</strong>
                      <small>{{ error.timestamp | date: 'HH:mm:ss' }}</small>
                    </div>
                    <small class="err">{{ error.message }}</small>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cm-overlay {
      position: fixed;
      top: calc(var(--chart-top-controls-offset) + 2px);
      left: calc(var(--chart-edge-gap) + 52px);
      z-index: var(--z-chart-modals);
      width: min(560px, calc(100vw - var(--chart-edge-gap) - 64px));
      max-height: calc(100vh - var(--chart-top-controls-offset) - var(--chart-edge-gap));
      pointer-events: none;
    }
    .cm-dialog {
      position: relative;
      width: 100%;
      max-height: inherit;
      display: flex;
      flex-direction: column;
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
      pointer-events: auto;
      color: var(--gb-text-value);
      animation: cm-pop var(--duration-normal) var(--ease-out) both;
    }
    @keyframes cm-pop { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: none; } }

    .cm-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-3);
      border-bottom: 1px solid var(--gb-border-panel);
    }
    .cm-title { display: flex; align-items: center; gap: var(--space-2); color: var(--gb-tick-reference); }
    .cm-title h2 { margin: 0; font-size: 1rem; color: var(--gb-text-value); }
    .cm-header-actions { display: flex; gap: var(--space-1); }
    .cm-icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 34px; height: 34px;
      background: var(--gb-bg-glass); color: var(--gb-text-muted);
      border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm);
      cursor: pointer; transition: color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
    }
    .cm-icon-btn:hover { color: var(--gb-text-value); border-color: var(--gb-border-active); }
    .cm-text-btn {
      min-height: 44px; padding: 0 var(--space-2);
      background: var(--gb-bg-glass); color: var(--gb-text-muted);
      border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm);
      font-size: 0.74rem; cursor: pointer;
    }
    .cm-text-btn:hover { color: var(--gb-text-value); border-color: var(--gb-border-active); }

    .cm-body { display: flex; min-height: 0; flex: 1; }
    .cm-nav {
      display: flex; flex-direction: column; gap: 4px;
      padding: var(--space-2);
      min-width: 156px;
      border-right: 1px solid var(--gb-border-panel);
    }
    .cm-nav-btn {
      display: flex; align-items: center; gap: var(--space-2);
      min-height: 44px; padding: 0 var(--space-2);
      background: transparent; color: var(--gb-text-muted);
      border: none; border-radius: var(--radius-sm);
      font-size: 0.82rem; text-align: left; cursor: pointer;
      transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
    }
    .cm-nav-btn:hover { color: var(--gb-text-value); background: var(--gb-bg-glass); }
    .cm-nav-btn.is-active { background: var(--gb-bg-glass-active); color: var(--gb-tick-reference); box-shadow: inset 0 0 0 1px var(--gb-border-active); }
    .cm-engine {
      margin-top: auto; display: flex; align-items: center; gap: 6px;
      padding: var(--space-2); font-size: 0.7rem; color: var(--gb-text-muted);
    }
    .cm-dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--gb-data-stale); }
    .cm-engine.is-online .cm-dot { background: var(--gb-data-good); }

    .cm-content { flex: 1; min-width: 0; overflow: auto; padding: var(--space-3); }
    .pane { display: flex; flex-direction: column; gap: var(--space-2); }
    .pane__hint { margin: 0; font-size: 0.8rem; color: var(--gb-text-muted); }
    .pane__title { margin: var(--space-2) 0 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--gb-text-muted); }
    .empty { font-size: 0.82rem; color: var(--gb-text-muted); font-style: italic; }

    .source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-2); }
    .source-card {
      display: flex; flex-direction: column; gap: 3px;
      text-align: left; padding: var(--space-2);
      background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-md); color: inherit; cursor: pointer;
      transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
    }
    .source-card:hover { border-color: var(--gb-border-active); }
    .source-card:disabled { opacity: .5; cursor: not-allowed; }
    .source-card.is-active { border-color: var(--gb-tick-reference); background: var(--gb-bg-glass-active); }
    .source-card--local { flex-direction: row; align-items: stretch; gap: 0; padding: 0; }
    .source-card__main { flex: 1; display: flex; flex-direction: column; gap: 3px; text-align: left; padding: var(--space-2); background: transparent; border: none; color: inherit; cursor: pointer; }
    .source-card__main:disabled { opacity: 0.5; cursor: not-allowed; }
    .source-card__label { font-weight: 600; color: var(--gb-text-value); display: flex; align-items: center; gap: 6px; justify-content: space-between; }
    .check { color: var(--gb-tick-reference); display: inline-flex; }
    .source-card__meta { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gb-text-muted); }
    .source-card__desc { font-size: 0.76rem; color: var(--gb-text-muted); }
    .source-card__state { font-size: .66rem; color: var(--gb-data-good); }
    .source-card__state.is-unavailable { color: var(--gb-data-stale); }
    .coverage-btn { min-height: 32px; padding: var(--space-1) var(--space-2); color: var(--gb-tick-reference); background: transparent; border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); cursor: pointer; }
    .environment-layout { display: block; }
    .environment-layout app-environment-panel { min-width: 0; }
    .pane--settings app-chart-settings { display: block; max-width: 820px; }
    .danger-btn {
      display: inline-flex; align-items: center; justify-content: center;
      margin: var(--space-2); padding: 0 var(--space-2); min-width: 36px;
      background: var(--gb-alarm-emergency-bg); color: var(--gb-data-stale);
      border: 1px solid var(--gb-alarm-emergency-border); border-radius: var(--radius-sm); cursor: pointer;
    }

    .import-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-2); }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 0.72rem; color: var(--gb-text-muted); }
    .field input, .field select {
      min-height: 36px; padding: 0 var(--space-2);
      background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-sm); color: var(--gb-text-value); font-size: 0.82rem;
    }
    .import-rows { display: flex; flex-direction: column; gap: var(--space-2); }
    .import-row {
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
      padding: var(--space-2); background: var(--gb-bg-glass);
      border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md);
    }
    .import-row__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .import-row__info strong { font-size: 0.82rem; color: var(--gb-text-value); }
    .import-row__file { font-size: 0.72rem; color: var(--gb-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .import-row__file.has-file { color: var(--gb-data-good); }
    .import-row__actions { display: flex; gap: var(--space-1); flex-shrink: 0; }
    .file-btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 34px; padding: 0 var(--space-2); font-size: 0.74rem;
      background: var(--gb-bg-glass-active); border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-sm); color: var(--gb-text-value); cursor: pointer;
    }
    .file-btn input[type=file] { display: none; }
    .primary-btn {
      min-height: 34px; padding: 0 var(--space-3); font-size: 0.74rem;
      background: var(--gb-tick-reference); color: var(--gb-bg-canvas);
      border: none; border-radius: var(--radius-sm); cursor: pointer;
    }
    .primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .banner {
      display: flex; align-items: center; gap: var(--space-2);
      margin: 0; padding: var(--space-2); font-size: 0.78rem;
      border-radius: var(--radius-sm); border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-glass); color: var(--gb-text-value);
    }
    .banner--warn { background: var(--gb-alarm-warning-bg); border-color: var(--gb-alarm-warning-border); color: var(--gb-data-warn); }
    .banner--error { background: var(--gb-alarm-emergency-bg); border-color: var(--gb-alarm-emergency-border); color: var(--gb-data-stale); }
    .banner--ok { background: var(--gb-arc-normal); border-color: var(--gb-border-active); color: var(--gb-data-good); }

    .jobs { display: flex; flex-direction: column; gap: var(--space-1); }
    .job { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); }
    .job.is-failed { border-color: var(--gb-alarm-emergency-border); }
    .job__head { display: flex; justify-content: space-between; align-items: center; }
    .job strong { font-size: 0.8rem; color: var(--gb-text-value); }
    .job small { font-size: 0.7rem; color: var(--gb-text-muted); }
    .job small.err { color: var(--gb-data-stale); }
    .badge { font-size: 0.62rem; padding: 1px 6px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.03em; background: var(--gb-bg-glass-active); color: var(--gb-text-muted); }
    .badge-completed { background: var(--gb-arc-normal); color: var(--gb-data-good); }
    .badge-failed { background: var(--gb-alarm-emergency-bg); color: var(--gb-data-stale); }
    .badge-running, .badge-queued { background: var(--gb-arc-warning); color: var(--gb-data-warn); }
    .diagnostic-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-2); }
    .storage-card { margin-top: var(--space-2); gap: var(--space-1); }
    .storage-card progress { width: 100%; height: 10px; accent-color: var(--gb-tick-reference); }
    .retry-btn { margin-left: var(--space-1); color: inherit; background: transparent; border: 0; text-decoration: underline; cursor: pointer; }

    @media (max-width: 640px) {
      .cm-overlay {
        top: calc(var(--chart-top-controls-offset) + 48px);
        left: var(--chart-edge-gap);
        width: calc(100vw - (var(--chart-edge-gap) * 2));
        max-height: calc(100vh - var(--chart-top-controls-offset) - 58px);
      }
      .cm-body { flex-direction: column; }
      .cm-nav { flex-direction: row; flex-wrap: wrap; min-width: 0; border-right: none; border-bottom: 1px solid var(--gb-border-panel); }
      .cm-engine { margin: 0; }
      .environment-layout { grid-template-columns: 1fr; }
    }
  `],
})
export class ChartManagerComponent implements OnChanges {
  private readonly chartEngineApi = inject(ChartEngineApiService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input() open = false;
  @Input() vm: ChartControlsVm | null = null;
  @Input() startSection: ManagerSection = 'active';
  @Input() selectedPackageGeometry: AreaGeometry | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() selectSource = new EventEmitter<string>();
  @Output() deleteChart = new EventEmitter<string>();
  @Output() refreshCatalog = new EventEmitter<void>();
  @Output() importChart = new EventEmitter<ChartImportRequestVm>();
  @Output() viewCoverage = new EventEmitter<[number, number, number, number]>();
  @Output() previewArea = new EventEmitter<[number, number, number, number]>();
  @Output() safetyDepthChange = new EventEmitter<number>();
  @Output() requestAreaSelection = new EventEmitter<AreaSelectionMode>();
  @Output() requestWeatherAreaSelection = new EventEmitter<'viewport' | 'rectangle' | 'polygon'>();
  @Output() selectPackage = new EventEmitter<import('../../../../data-access/chart/chart-remote-catalog.service').PackageManifest>();

  readonly section = signal<ManagerSection>('active');
  readonly diagnostics = signal<EngineDiagnostics | null>(null);
  readonly diagnosticsLoading = signal(false);
  readonly diagnosticsError = signal<string | null>(null);
  readonly copernicusSyncing = signal(false);
  readonly storage = signal<EngineStorageStatus | null>(null);
  readonly storageCleaning = signal(false);
  readonly storageError = signal<string | null>(null);
  readonly sections: { id: ManagerSection; label: string; icon: 'layers' | 'download' | 'plus' | 'compass' | 'sun' | 'activity' }[] = [
    { id: 'active', label: 'Base maps', icon: 'layers' },
    { id: 'navigation', label: 'Navigation', icon: 'compass' },
    { id: 'environment', label: 'Weather & sea', icon: 'sun' },
    { id: 'offline', label: 'Offline charts', icon: 'download' },
    { id: 'diagnostics', label: 'Diagnostics', icon: 'activity' },
  ];

  readonly importOptions: { kind: ChartImportKind; title: string; accept: string; action: string }[] = [
    { kind: 'mbtiles', title: 'MBTiles', accept: '.mbtiles', action: 'Import' },
    { kind: 'raster', title: 'GeoTIFF / KAP', accept: '.tif,.tiff,.kap', action: 'Convert' },
    { kind: 's57', title: 'Open S-57 .000', accept: '.000', action: 'Convert' },
  ];

  importId = '';
  importLabel = '';
  importChartKind: 'raster' | 'vector' = 'raster';
  importError: string | null = null;
  importNotice: string | null = null;
  selectedFiles: Partial<Record<ChartImportKind, File>> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true || changes['startSection']) {
      this.section.set(this.startSection);
    }
    if (changes['open']?.currentValue === true && this.section() === 'diagnostics') {
      this.loadDiagnostics();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close.emit();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close.emit();
    }
  }

  selectSection(section: ManagerSection): void {
    this.section.set(section);
    if (section === 'diagnostics') {
      this.loadDiagnostics();
    }
  }

  loadDiagnostics(): void {
    if (!this.vm?.chartEngineOnline || this.diagnosticsLoading()) return;
    this.diagnosticsLoading.set(true);
    this.diagnosticsError.set(null);
    this.chartEngineApi.diagnostics().subscribe({
      next: (diagnostics) => {
        this.diagnostics.set(diagnostics);
        this.diagnosticsLoading.set(false);
      },
      error: () => {
        this.diagnosticsLoading.set(false);
        this.diagnosticsError.set('Provider diagnostics could not be loaded.');
      },
    });
    this.loadStorage();
  }

  loadStorage(): void {
    this.storageError.set(null);
    this.chartEngineApi.storageStatus().subscribe({
      next: (storage) => this.storage.set(storage),
      error: () => this.storageError.set('Storage usage could not be loaded.'),
    });
  }

  cleanStorage(): void {
    if (this.storageCleaning()) return;
    this.storageCleaning.set(true);
    this.storageError.set(null);
    this.chartEngineApi.pruneStorage().subscribe({
      next: (storage) => {
        this.storage.set(storage);
        this.storageCleaning.set(false);
      },
      error: () => {
        this.storageCleaning.set(false);
        this.storageError.set('Cache cleanup failed.');
      },
    });
  }

  formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** index).toFixed(index >= 3 ? 1 : 0)} ${units[index]}`;
  }

  runCopernicusSync(): void {
    if (this.copernicusSyncing()) return;
    this.copernicusSyncing.set(true);
    this.chartEngineApi.syncEnvironment().subscribe({
      next: (environmentSync) => {
        const current = this.diagnostics();
        if (current) this.diagnostics.set({ ...current, environmentSync });
        this.copernicusSyncing.set(false);
        this.refreshCatalog.emit();
      },
      error: () => {
        this.copernicusSyncing.set(false);
        this.diagnosticsError.set('Copernicus synchronization could not be started.');
        this.loadDiagnostics();
      },
    });
  }

  providers(diagnostics: EngineDiagnostics) {
    return [...diagnostics.xyzProviders, ...diagnostics.wmsProviders];
  }

  copernicusState(diagnostics: EngineDiagnostics): string {
    if (!diagnostics.environmentSync.enabled) return 'disabled';
    if (diagnostics.environmentSync.running) return 'synchronizing';
    if (diagnostics.environmentSync.lastError) return 'failed';
    return diagnostics.environmentSync.lastCompletedAt ? 'available' : 'pending';
  }

  baseSources(): ChartSourceOptionVm[] {
    return this.vm?.baseChartSources ?? [];
  }

  localSources(): ChartSourceOptionVm[] {
    return this.vm?.localChartSources ?? [];
  }

  activeSource(): ChartSourceOptionVm | null {
    return this.vm?.chartSources.find((source) => source.id === this.vm?.sourceId) ?? null;
  }

  sourceMeta(source: ChartSourceOptionVm): string {
    return `${source.offline ? 'Offline' : source.category === 'base' ? 'Online' : 'Local'} · ${source.kind}`;
  }

  trackSource(_index: number, source: ChartSourceOptionVm): string {
    return source.id;
  }

  selectedFileName(kind: ChartImportKind): string {
    return this.selectedFiles[kind]?.name ?? 'No file selected';
  }

  onLabelInput(value: string): void {
    this.importLabel = value;
    if (!this.importId) {
      this.importId = toChartId(value);
    }
  }

  onFileSelected(kind: ChartImportKind, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    this.importError = null;
    this.importNotice = null;
    if (!file) {
      return;
    }
    const validationError = validateChartFile(kind, file);
    if (validationError) {
      this.importError = validationError;
      input!.value = '';
      return;
    }
    this.selectedFiles = { ...this.selectedFiles, [kind]: file };
    if (!this.importLabel) {
      this.importLabel = file.name.replace(/\.[^.]+$/, '');
    }
    if (!this.importId) {
      this.importId = toChartId(this.importLabel);
    }
  }

  submitImport(kind: ChartImportKind): void {
    this.importNotice = null;
    if (!this.vm?.chartEngineOnline) {
      this.importError = 'Chart engine is offline.';
      return;
    }
    const file = this.selectedFiles[kind];
    const label = this.importLabel.trim();
    const id = toChartId(this.importId || label);
    if (!file || !label || !id) {
      this.importError = 'Select a file and provide a chart label and id.';
      return;
    }
    if (id.length < 2) {
      this.importError = 'Chart id must be at least 2 characters.';
      return;
    }
    const validationError = validateChartFile(kind, file);
    if (validationError) {
      this.importError = validationError;
      return;
    }
    this.importError = null;
    this.importChart.emit({
      kind,
      file,
      id,
      label,
      ...(kind === 'mbtiles' ? { chartKind: this.importChartKind } : {}),
    });
    this.importNotice = `Import queued for "${label}". Track it under Jobs.`;
    this.selectedFiles = { ...this.selectedFiles, [kind]: undefined } as Partial<Record<ChartImportKind, File>>;
  }
}
