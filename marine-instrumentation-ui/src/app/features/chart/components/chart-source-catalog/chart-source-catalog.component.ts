import { Component, DestroyRef, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, switchMap, takeWhile } from 'rxjs';
import {
  ChartRemoteCatalogService,
  type AreaEstimate,
  type ChartCatalogEntry,
  type ChartCatalogSource,
  type AreaDownloadProgress,
} from '../../../../data-access/chart/chart-remote-catalog.service';
import { outsideZoneTicker } from '../../../../shared/rxjs/outside-zone-ticker';

interface DownloadJobVm {
  jobId: string;
  chartId: string;
  label: string;
  kind: 'area' | 'chart';
  status: string;
  error?: string;
  progress?: AreaDownloadProgress;
}

@Component({
  selector: 'app-chart-source-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="catalog-panel">
      <h3>Chart Source Catalog</h3>

      @if (loading()) {
        <div class="loading">Loading catalog...</div>
      }

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      <div class="catalog-layout">
        <div class="sources-list">
        @for (source of sources(); track source.id) {
          <div class="source-card" [class.active]="selectedSource()?.id === source.id" (click)="selectSource(source)">
            <div class="source-header">
              <span class="source-name">{{ source.name }}</span>
              <span class="source-region">{{ source.region }}</span>
            </div>
            <div class="source-description">{{ source.description }}</div>
            <div class="source-meta">
              <span class="source-kind">{{ source.kind }}</span>
              <span class="source-availability">{{ source.availability }}</span>
              @if (source.minZoom !== undefined && source.maxZoom !== undefined) {
                <span class="source-zoom">z{{ source.minZoom }}-{{ source.maxZoom }}</span>
              }
            </div>
          </div>
        }
        </div>

        <div class="charts-col">
        @if (selectedSource()) {
        <div class="charts-section">
          <h4>{{ selectedSource()!.name }} - Available Charts</h4>

          <div class="area-filter">
            <input
              type="text"
              [(ngModel)]="bboxText"
              placeholder="Filter by area: minLon,minLat,maxLon,maxLat"
            />
            <button class="btn-secondary" (click)="applyAreaFilter()">Filter</button>
            @if (bboxText) {
              <button class="btn-secondary" (click)="clearAreaFilter()">Clear</button>
            }
          </div>

          @if (chartsLoading()) {
            <div class="loading">Loading charts...</div>
          }

          <div class="charts-list">
            @for (chart of charts(); track chart.id) {
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-label">
                    {{ chart.label }}
                    @if (chart.status) {
                      <span class="badge" [class]="'badge-' + chart.status">{{ statusLabel(chart.status) }}</span>
                    }
                  </div>
                  <div class="chart-actions">
                    @if (canDownloadEnc(chart)) {
                      <button class="btn-download" (click)="downloadChart(chart, $event)">Download ENC</button>
                    }
                    @if (canDownloadArea(chart)) {
                      <button class="btn-secondary" (click)="estimateArea(chart, $event)">Estimate</button>
                    }
                  </div>
                </div>

                @if (estimates()[chart.id]; as est) {
                  <div class="estimate">
                    <span>{{ est.totalTiles | number }} tiles · ~{{ est.estimatedSizeMb }} MB</span>
                    @if (est.warning) {
                      <span class="estimate-warning">{{ est.warning }}</span>
                    }
                    <button class="btn-download" (click)="downloadArea(chart, $event)">Confirm download</button>
                  </div>
                }

                <div class="chart-description">{{ chart.description }}</div>
                <div class="chart-meta">
                  <span>Format: {{ chart.format }}</span>
                  @if (chart.scale) {
                    <span>Scale: 1:{{ chart.scale | number }}</span>
                  }
                  @if (chart.lastUpdated) {
                    <span>Updated: {{ chart.lastUpdated | date: 'yyyy-MM-dd' }}</span>
                  }
                </div>
                <div class="chart-bounds">
                  Bounds: {{ chart.bounds[0].toFixed(2) }}, {{ chart.bounds[1].toFixed(2) }}
                  -> {{ chart.bounds[2].toFixed(2) }}, {{ chart.bounds[3].toFixed(2) }}
                </div>
              </div>
            }
          </div>
        </div>
        } @else {
          <div class="charts-empty">Select a provider on the left to see its charts.</div>
        }
        </div>
      </div>

      @if (jobs().length > 0) {
        <div class="jobs-section">
          <h4>Download jobs</h4>
          <div class="jobs-list">
            @for (job of jobs(); track job.jobId) {
              <div class="job-row">
                <div class="job-head">
                  <strong>{{ job.label }}</strong>
                  <span class="badge" [class]="'badge-' + job.status">{{ job.status }}</span>
                </div>
                @if (job.progress) {
                  <small>
                    {{ job.progress.downloadedTiles | number }} / {{ job.progress.totalTiles | number }} tiles
                    (z{{ job.progress.currentZoom }}, {{ job.progress.failedTiles }} failed)
                  </small>
                }
                @if (job.error) {
                  <small class="error">{{ job.error }}</small>
                }
                @if (job.kind === 'area' && (job.status === 'queued' || job.status === 'running')) {
                  <button class="btn-secondary" (click)="cancelJob(job)">Cancel</button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .catalog-panel {
      padding: var(--space-2);
      color: var(--gb-text-value);
      max-height: 70vh;
      overflow-y: auto;
    }
    h3 { margin: 0 0 var(--space-2); font-size: 0.95rem; color: var(--gb-text-value); }
    h4 { margin: var(--space-3) 0 var(--space-1); font-size: 0.82rem; color: var(--gb-text-value); }
    .loading { color: var(--gb-text-muted); font-style: italic; padding: var(--space-1) 0; }
    .error { color: var(--gb-data-stale); padding: var(--space-1) 0; }

    .sources-list { display: flex; flex-direction: column; gap: var(--space-1); }
    .source-card {
      padding: var(--space-2);
      background: var(--gb-bg-glass);
      border-radius: var(--radius-md);
      cursor: pointer;
      border: 1px solid var(--gb-border-panel);
      transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
    }
    .source-card:hover { border-color: var(--gb-border-active); }
    .source-card.active { border-color: var(--gb-tick-reference); background: var(--gb-bg-glass-active); }
    .source-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .source-name { font-weight: 600; color: var(--gb-text-value); }
    .source-region { font-size: 0.7rem; color: var(--gb-text-muted); text-transform: uppercase; }
    .source-description { font-size: 0.78rem; color: var(--gb-text-muted); margin-bottom: 6px; }
    .source-meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .source-meta span { font-size: 0.68rem; padding: 2px 6px; background: var(--gb-bg-glass-active); border-radius: var(--radius-sm); color: var(--gb-text-muted); }

    .area-filter { display: flex; gap: 6px; margin: var(--space-2) 0; }
    .area-filter input {
      flex: 1;
      padding: 6px 8px;
      background: var(--gb-bg-glass);
      border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-sm);
      color: var(--gb-text-value);
      font-size: 0.75rem;
    }

    .catalog-layout { display: flex; gap: var(--space-3); align-items: flex-start; }
    .catalog-layout .sources-list { flex: 0 0 200px; max-width: 220px; }
    .charts-col { flex: 1; min-width: 0; }
    .charts-empty { font-size: 0.8rem; color: var(--gb-text-muted); font-style: italic; padding: var(--space-2); }
    .catalog-layout .charts-section { margin-top: 0; padding-top: 0; border-top: none; }
    @media (max-width: 720px) {
      .catalog-layout { flex-direction: column; }
      .catalog-layout .sources-list { flex-basis: auto; max-width: none; width: 100%; }
    }

    .charts-section { margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--gb-border-panel); }
    .charts-list { display: flex; flex-direction: column; gap: var(--space-1); }
    .chart-card {
      padding: var(--space-2);
      background: var(--gb-bg-glass);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--gb-tick-reference);
    }
    .chart-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .chart-label { font-weight: 500; color: var(--gb-text-value); display: flex; align-items: center; gap: 8px; }
    .chart-actions { display: flex; gap: 6px; }
    .btn-download {
      padding: 4px 10px;
      background: var(--gb-tick-reference);
      color: var(--gb-bg-canvas);
      border: none;
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      cursor: pointer;
      transition: filter var(--duration-fast) var(--ease-out);
    }
    .btn-download:hover { filter: brightness(1.1); }
    .btn-secondary {
      padding: 4px 10px;
      background: var(--gb-bg-glass-active);
      color: var(--gb-text-value);
      border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      cursor: pointer;
    }
    .btn-secondary:hover { border-color: var(--gb-border-active); }
    .chart-description { font-size: 0.74rem; color: var(--gb-text-muted); margin-bottom: 4px; }
    .chart-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.7rem; color: var(--gb-text-muted); }
    .chart-bounds { font-size: 0.7rem; color: var(--gb-text-muted); margin-top: 4px; font-family: var(--font-mono, monospace); }

    .estimate {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      margin: 6px 0; padding: 6px 8px; background: var(--gb-bg-glass-active); border-radius: var(--radius-sm); font-size: 0.72rem;
    }
    .estimate-warning { color: var(--gb-data-warn); }

    .badge {
      font-size: 0.62rem; padding: 1px 6px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.03em;
      background: var(--gb-bg-glass-active); color: var(--gb-text-muted);
    }
    .badge-new { background: var(--gb-arc-normal); color: var(--gb-tick-reference); }
    .badge-installed, .badge-completed, .badge-available { background: var(--gb-arc-normal); color: var(--gb-data-good); }
    .badge-outdated { background: var(--gb-arc-warning); color: var(--gb-data-warn); }
    .badge-failed { background: var(--gb-alarm-emergency-bg); color: var(--gb-data-stale); }
    .badge-online-only { background: var(--gb-bg-glass-active); color: var(--gb-text-muted); }
    .badge-running, .badge-queued { background: var(--gb-arc-warning); color: var(--gb-data-warn); }

    .jobs-section { margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--gb-border-panel); }
    .jobs-list { display: flex; flex-direction: column; gap: var(--space-1); }
    .job-row { padding: var(--space-2); background: var(--gb-bg-glass); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 4px; }
    .job-head { display: flex; justify-content: space-between; align-items: center; }
    .job-row small { font-size: 0.7rem; color: var(--gb-text-muted); }
  `],
})
export class ChartSourceCatalogComponent {
  private readonly catalogService = inject(ChartRemoteCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  readonly sources = signal<ChartCatalogSource[]>([]);
  readonly selectedSource = signal<ChartCatalogSource | null>(null);
  readonly charts = signal<ChartCatalogEntry[]>([]);
  readonly loading = signal(false);
  readonly chartsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly estimates = signal<Record<string, AreaEstimate>>({});
  readonly jobs = signal<DownloadJobVm[]>([]);

  bboxText = '';

  constructor() {
    this.loadSources();
  }

  private loadSources(): void {
    this.loading.set(true);
    this.catalogService.listSources().subscribe({
      next: (sources) => {
        this.sources.set(sources);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load catalog');
        this.loading.set(false);
      },
    });
  }

  selectSource(source: ChartCatalogSource): void {
    this.selectedSource.set(source);
    this.estimates.set({});
    this.reloadCharts();
  }

  applyAreaFilter(): void {
    this.reloadCharts();
  }

  clearAreaFilter(): void {
    this.bboxText = '';
    this.reloadCharts();
  }

  private reloadCharts(): void {
    const source = this.selectedSource();
    if (!source) {
      return;
    }
    this.chartsLoading.set(true);
    this.charts.set([]);
    this.catalogService.listCharts(source.id, this.parseBbox()).subscribe({
      next: (charts) => {
        this.charts.set(charts);
        this.chartsLoading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load charts');
        this.chartsLoading.set(false);
      },
    });
  }

  private parseBbox(): [number, number, number, number] | undefined {
    const parts = this.bboxText.split(',').map((p) => Number.parseFloat(p.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
    }
    return undefined;
  }

  canDownloadArea(chart: ChartCatalogEntry): boolean {
    return chart.format === 'wms-layer' || chart.format === 'xyz-tiles';
  }

  canDownloadEnc(chart: ChartCatalogEntry): boolean {
    return chart.format === 's57';
  }

  statusLabel(status: string): string {
    return status === 'online-only' ? 'online' : status;
  }

  estimateArea(chart: ChartCatalogEntry, event: Event): void {
    event.stopPropagation();
    this.catalogService
      .estimateDownload({
        bbox: chart.bounds,
        minZoom: chart.minZoom ?? 4,
        maxZoom: chart.maxZoom ?? 12,
      })
      .subscribe({
        next: (est) => this.estimates.update((map) => ({ ...map, [chart.id]: est })),
        error: (err) => this.error.set(err instanceof Error ? err.message : 'Estimate failed'),
      });
  }

  downloadArea(chart: ChartCatalogEntry, event: Event): void {
    event.stopPropagation();
    const tileProviderId = chart.tileProviderId ?? chart.providerId;
    const id = `offline-${tileProviderId}-${chart.id}`;
    this.catalogService
      .downloadArea({
        id,
        label: `${chart.label} (Offline)`,
        providerId: tileProviderId,
        bbox: chart.bounds,
        minZoom: chart.minZoom ?? 4,
        maxZoom: chart.maxZoom ?? 12,
        description: `Offline tiles for ${chart.label}`,
        ...(chart.wmsLayer ? { layers: chart.wmsLayer } : {}),
      })
      .subscribe({
        next: (job) => {
          this.estimates.update((map) => {
            const next = { ...map };
            delete next[chart.id];
            return next;
          });
          this.trackJob({ jobId: job.id, chartId: id, label: job.label, kind: 'area', status: job.status });
        },
        error: (err) => this.error.set(err instanceof Error ? err.message : 'Download failed'),
      });
  }

  downloadChart(chart: ChartCatalogEntry, event: Event): void {
    event.stopPropagation();
    const id = chart.id;
    this.catalogService
      .downloadChart({
        providerId: chart.providerId,
        chartId: chart.id,
        id,
        label: chart.label,
      })
      .subscribe({
        next: (job) => this.trackJob({ jobId: job.id, chartId: chart.id, label: job.label, kind: 'chart', status: job.status }),
        error: (err) => this.error.set(err instanceof Error ? err.message : 'ENC download failed'),
      });
  }

  cancelJob(job: DownloadJobVm): void {
    this.catalogService.cancelDownload(job.chartId).subscribe({
      next: () => this.updateJob(job.jobId, { status: 'failed', error: 'Cancelled' }),
      error: (err) => this.error.set(err instanceof Error ? err.message : 'Cancel failed'),
    });
  }

  private trackJob(job: DownloadJobVm): void {
    this.jobs.update((list) => [job, ...list.filter((j) => j.jobId !== job.jobId)]);
    this.pollJob(job);
  }

  private pollJob(job: DownloadJobVm): void {
    let progressSub: Subscription | null = null;
    outsideZoneTicker(this.zone, 1500, { emitInsideAngular: false })
      .pipe(
        switchMap(() => this.catalogService.getJob(job.jobId)),
        takeWhile((j) => j.status === 'queued' || j.status === 'running', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (j) => {
          const patch: Partial<DownloadJobVm> = { status: j.status };
          if (j.error !== undefined) {
            patch.error = j.error;
          }
          this.updateJob(job.jobId, patch);
          if (job.kind === 'area' && (j.status === 'queued' || j.status === 'running')) {
            progressSub?.unsubscribe();
            progressSub = this.catalogService.getAreaProgress(job.chartId).subscribe({
              next: (p) => this.updateJob(job.jobId, { progress: p }),
              error: () => {},
            });
          } else {
            progressSub?.unsubscribe();
            // Refresh statuses once a job settles so badges reflect the new state.
            this.reloadCharts();
          }
        },
        error: () => this.updateJob(job.jobId, { status: 'failed', error: 'Lost connection to job' }),
      });
  }

  private updateJob(jobId: string, patch: Partial<DownloadJobVm>): void {
    this.jobs.update((list) => list.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j)));
  }
}
