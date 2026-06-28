import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartRemoteCatalogService, type ChartCatalogSource, type ChartCatalogEntry } from '../../../../data-access/chart/chart-remote-catalog.service';

@Component({
  selector: 'app-chart-source-catalog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="catalog-panel">
      <h3>Chart Source Catalog</h3>
      
      @if (loading()) {
        <div class="loading">Loading catalog...</div>
      }
      
      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
      
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
      
      @if (selectedSource()) {
        <div class="charts-section">
          <h4>{{ selectedSource()!.name }} - Available Charts</h4>
          
          @if (chartsLoading()) {
            <div class="loading">Loading charts...</div>
          }
          
          <div class="charts-list">
            @for (chart of charts(); track chart.id) {
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-label">{{ chart.label }}</div>
                  <div class="chart-actions">
                    @if (canDownloadArea(chart)) {
                      <button class="btn-download" (click)="downloadArea(chart, $event)">Download Area</button>
                    }
                    @if (canDownloadEnc(chart)) {
                      <button class="btn-download" (click)="downloadEnc(chart, $event)">Download ENC</button>
                    }
                  </div>
                </div>
                <div class="chart-description">{{ chart.description }}</div>
                <div class="chart-meta">
                  <span>Format: {{ chart.format }}</span>
                  @if (chart.scale) {
                    <span>Scale: 1:{{ chart.scale | number }}</span>
                  }
                  @if (chart.minZoom !== undefined && chart.maxZoom !== undefined) {
                    <span>Zoom: {{ chart.minZoom }} - {{ chart.maxZoom }}</span>
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
      }
    </div>
  `,
  styles: [`
    .catalog-panel {
      padding: 16px;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      max-height: 80vh;
      overflow-y: auto;
    }
    h3 { margin: 0 0 12px; font-size: 1.1rem; color: #38bdf8; }
    h4 { margin: 16px 0 8px; font-size: 0.95rem; color: #7dd3fc; }
    .loading { color: #94a3b8; font-style: italic; padding: 8px 0; }
    .error { color: #ef4444; padding: 8px 0; }
    
    .sources-list { display: flex; flex-direction: column; gap: 8px; }
    .source-card {
      padding: 12px;
      background: #1e293b;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: border-color 0.2s;
    }
    .source-card:hover, .source-card.active { border-color: #38bdf8; }
    .source-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .source-name { font-weight: 600; color: #f1f5f9; }
    .source-region { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; }
    .source-description { font-size: 0.8rem; color: #cbd5e1; margin-bottom: 6px; }
    .source-meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .source-meta span { font-size: 0.7rem; padding: 2px 6px; background: #334155; border-radius: 4px; color: #94a3b8; }
    
    .charts-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid #334155; }
    .charts-list { display: flex; flex-direction: column; gap: 8px; }
    .chart-card {
      padding: 10px;
      background: #1e293b;
      border-radius: 6px;
      border-left: 3px solid #38bdf8;
    }
    .chart-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .chart-label { font-weight: 500; color: #f1f5f9; }
    .chart-actions { display: flex; gap: 6px; }
    .btn-download {
      padding: 4px 10px;
      background: #0ea5e9;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.7rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-download:hover { background: #0284c7; }
    .chart-description { font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; }
    .chart-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.7rem; color: #64748b; }
    .chart-bounds { font-size: 0.7rem; color: #64748b; margin-top: 4px; font-family: monospace; }
  `],
})
export class ChartSourceCatalogComponent {
  private readonly catalogService = inject(ChartRemoteCatalogService);

  readonly sources = signal<ChartCatalogSource[]>([]);
  readonly selectedSource = signal<ChartCatalogSource | null>(null);
  readonly charts = signal<ChartCatalogEntry[]>([]);
  readonly loading = signal(false);
  readonly chartsLoading = signal(false);
  readonly error = signal<string | null>(null);

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
    this.chartsLoading.set(true);
    this.charts.set([]);
    this.catalogService.listCharts(source.id).subscribe({
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

  canDownloadArea(chart: ChartCatalogEntry): boolean {
    return chart.format === 'wms-layer' || chart.format === 'xyz-tiles';
  }

  canDownloadEnc(chart: ChartCatalogEntry): boolean {
    return chart.format === 's57';
  }

  downloadArea(chart: ChartCatalogEntry, event: Event): void {
    event.stopPropagation();
    const id = `offline-${chart.providerId}-${chart.id}`;
    this.catalogService.downloadArea({
      id,
      label: `${chart.label} (Offline)`,
      providerId: chart.providerId,
      bbox: chart.bounds,
      minZoom: chart.minZoom ?? 4,
      maxZoom: chart.maxZoom ?? 16,
      description: `Offline tiles for ${chart.label}`,
    }).subscribe({
      next: (job) => {
        this.error.set(`Download started: ${job.label} (job ${job.id})`);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Download failed');
      },
    });
  }

  downloadEnc(chart: ChartCatalogEntry, event: Event): void {
    event.stopPropagation();
    const chartNumber = chart.id.replace('noaa-enc-', '');
    this.catalogService.downloadEnc({
      chartNumber,
      id: `noaa-enc-${chartNumber}`,
      label: chart.label,
    }).subscribe({
      next: (job) => {
        this.error.set(`ENC download started: ${job.label} (job ${job.id})`);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'ENC download failed');
      },
    });
  }
}
