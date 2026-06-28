import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/app-environment.token';

export type EngineChartKind = 'raster' | 'vector' | 'bathymetry';
export type EngineChartJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type EngineChartImportKind = 'mbtiles' | 'raster' | 's57';

export interface EngineChartSource {
  id: string;
  label: string;
  kind: EngineChartKind;
  description?: string;
  attribution?: string;
  minZoom?: number;
  maxZoom?: number;
  tileUrl?: string;
  styleUrl?: string;
  available: boolean;
}

export interface EngineChartJob {
  id: string;
  kind: EngineChartImportKind;
  status: EngineChartJobStatus;
  chartId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: EngineChartSource;
}

@Injectable({ providedIn: 'root' })
export class ChartEngineApiService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly baseUrl = this.environment.chartEngineApiUrl.replace(/\/$/, '');

  health() {
    return this.http.get<{ status: string; service: string }>(`${this.baseUrl}/health`);
  }

  listCharts() {
    return this.http.get<{ charts: EngineChartSource[] }>(`${this.baseUrl}/charts`).pipe(
      map(({ charts }) => ({ charts: charts.map((chart) => this.normalizeChartUrl(chart)) })),
    );
  }

  importChart(kind: EngineChartImportKind, request: {
    file: File;
    id: string;
    label: string;
    chartKind?: Extract<EngineChartKind, 'raster' | 'vector'>;
  }) {
    const form = new FormData();
    form.append('file', request.file);
    form.append('id', request.id);
    form.append('label', request.label);
    if (kind === 'mbtiles') {
      form.append('kind', request.chartKind ?? 'raster');
    }
    return this.http.post<EngineChartJob>(`${this.baseUrl}/charts/import/${kind}`, form);
  }

  getJob(jobId: string) {
    return this.http.get<EngineChartJob>(`${this.baseUrl}/charts/jobs/${encodeURIComponent(jobId)}`);
  }

  deleteChart(chartId: string) {
    return this.http.delete<void>(`${this.baseUrl}/charts/${encodeURIComponent(chartId)}`);
  }

  listCatalogSources() {
    return this.http.get<{ sources: Array<{
      id: string;
      name: string;
      description: string;
      region: string;
      kind: string;
      availability: string;
      attribution: string;
      minZoom?: number;
      maxZoom?: number;
      enabled: boolean;
    }> }>(`${this.baseUrl}/catalog/sources`);
  }

  getCatalogSource(providerId: string) {
    return this.http.get<{
      id: string;
      name: string;
      description: string;
      region: string;
      kind: string;
      availability: string;
      attribution: string;
      license: string;
      endpoints: Record<string, string>;
      minZoom?: number;
      maxZoom?: number;
      enabled: boolean;
    }>(`${this.baseUrl}/catalog/sources/${encodeURIComponent(providerId)}`);
  }

  private normalizeChartUrl(chart: EngineChartSource): EngineChartSource {
    const tileUrl = chart.tileUrl?.replace(/^https?:\/\/localhost:8088/i, this.baseUrl);
    const styleUrl = chart.styleUrl?.replace(/^https?:\/\/localhost:8088/i, this.baseUrl);
    return {
      ...chart,
      ...(tileUrl ? { tileUrl } : {}),
      ...(styleUrl ? { styleUrl } : {}),
    };
  }
}
