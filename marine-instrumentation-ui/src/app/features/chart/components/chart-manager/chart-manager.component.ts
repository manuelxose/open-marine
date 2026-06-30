import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { ChartSourceCatalogComponent } from '../chart-source-catalog/chart-source-catalog.component';
import { toChartId, validateChartFile } from '../../utils/chart-import.util';
import type { ChartControlsVm, ChartImportKind, ChartImportRequestVm, ChartSourceOptionVm } from '../../types/chart-vm';

type ManagerSection = 'active' | 'download' | 'import';

/**
 * Consolidated chart management modal. Opens over the map as a wide dialog with a
 * side navigation: Active (choose displayed map/chart), Download (remote catalog),
 * Import (upload local charts). Styled with the map overlay / Glass Bridge tokens.
 */
@Component({
  selector: 'app-chart-manager',
  standalone: true,
  imports: [CommonModule, AppIconComponent, ChartSourceCatalogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="cm-overlay">
        <div class="cm-backdrop" (click)="close.emit()"></div>

        <div class="cm-dialog" role="dialog" aria-modal="true" aria-label="Chart manager">
          <header class="cm-header">
            <div class="cm-title">
              <app-icon name="map" [size]="18" />
              <h2>Chart manager</h2>
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
                (click)="section.set(s.id)"
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
                  <button
                    type="button"
                    class="source-card"
                    *ngFor="let source of baseSources(); trackBy: trackSource"
                    [class.is-active]="vm?.sourceId === source.id"
                    (click)="selectSource.emit(source.id)">
                    <span class="source-card__label">
                      {{ source.label }}
                      <span class="check" *ngIf="vm?.sourceId === source.id"><app-icon name="check" [size]="14" /></span>
                    </span>
                    <span class="source-card__meta">{{ sourceMeta(source) }}</span>
                    <span class="source-card__desc">{{ source.description ?? 'Built-in chart style.' }}</span>
                  </button>
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
                    </button>
                    <button type="button" class="danger-btn" title="Delete chart" (click)="deleteChart.emit(source.id)">
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </article>
                </div>
              </section>

              <!-- DOWNLOAD -->
              <section *ngSwitchCase="'download'" class="pane">
                <p class="pane__hint">Browse online providers and download charts or cache areas for offline use.</p>
                <app-chart-source-catalog />
              </section>

              <!-- IMPORT -->
              <section *ngSwitchCase="'import'" class="pane">
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
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cm-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-chart-modals);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
    }
    .cm-backdrop {
      position: absolute;
      inset: 0;
      background: color-mix(in srgb, var(--gb-bg-canvas) 65%, transparent);
      backdrop-filter: blur(2px);
    }
    .cm-dialog {
      position: relative;
      width: min(920px, 96vw);
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
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
      min-height: 34px; padding: 0 var(--space-2);
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
      min-height: 40px; padding: 0 var(--space-2);
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
    .source-card.is-active { border-color: var(--gb-tick-reference); background: var(--gb-bg-glass-active); }
    .source-card--local { flex-direction: row; align-items: stretch; gap: 0; padding: 0; }
    .source-card__main { flex: 1; display: flex; flex-direction: column; gap: 3px; text-align: left; padding: var(--space-2); background: transparent; border: none; color: inherit; cursor: pointer; }
    .source-card__main:disabled { opacity: 0.5; cursor: not-allowed; }
    .source-card__label { font-weight: 600; color: var(--gb-text-value); display: flex; align-items: center; gap: 6px; justify-content: space-between; }
    .check { color: var(--gb-tick-reference); display: inline-flex; }
    .source-card__meta { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gb-text-muted); }
    .source-card__desc { font-size: 0.76rem; color: var(--gb-text-muted); }
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

    @media (max-width: 640px) {
      .cm-body { flex-direction: column; }
      .cm-nav { flex-direction: row; flex-wrap: wrap; min-width: 0; border-right: none; border-bottom: 1px solid var(--gb-border-panel); }
      .cm-engine { margin: 0; }
    }
  `],
})
export class ChartManagerComponent {
  @Input() open = false;
  @Input() vm: ChartControlsVm | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() selectSource = new EventEmitter<string>();
  @Output() deleteChart = new EventEmitter<string>();
  @Output() refreshCatalog = new EventEmitter<void>();
  @Output() importChart = new EventEmitter<ChartImportRequestVm>();

  readonly section = signal<ManagerSection>('active');
  readonly sections: { id: ManagerSection; label: string; icon: 'layers' | 'download' | 'plus' }[] = [
    { id: 'active', label: 'Active', icon: 'layers' },
    { id: 'download', label: 'Download', icon: 'download' },
    { id: 'import', label: 'Import', icon: 'plus' },
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

  baseSources(): ChartSourceOptionVm[] {
    return this.vm?.baseChartSources ?? [];
  }

  localSources(): ChartSourceOptionVm[] {
    return this.vm?.localChartSources ?? [];
  }

  sourceMeta(source: ChartSourceOptionVm): string {
    return `${source.category === 'base' ? 'Built-in' : 'Local'} · ${source.kind}`;
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
