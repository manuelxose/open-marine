import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/app-environment.token';

export interface ChartCatalogSource {
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
}

export type RemoteChartStatus = 'new' | 'installed' | 'outdated' | 'failed' | 'online-only';

export interface ChartCatalogEntry {
  id: string;
  providerId: string;
  tileProviderId?: string;
  label: string;
  description?: string;
  scale?: number;
  bounds: [number, number, number, number];
  minZoom?: number;
  maxZoom?: number;
  format: string;
  downloadUrl?: string;
  sizeBytes?: number;
  lastUpdated?: string;
  status?: RemoteChartStatus;
  wmsLayer?: string;
}

export interface AreaDownloadRequest {
  id: string;
  label: string;
  providerId: string;
  bbox: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  description?: string;
  attribution?: string;
  layers?: string;
}

export interface ChartDownloadRequest {
  providerId: string;
  chartId: string;
  id: string;
  label: string;
  expectedSha256?: string;
  description?: string;
}

export interface AreaEstimateRequest {
  bbox: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
}

export interface AreaEstimate {
  totalTiles: number;
  estimatedSizeMb: number;
  warning?: string;
}

export interface ChartDownloadJob {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  chartId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface AreaDownloadProgress {
  totalTiles: number;
  downloadedTiles: number;
  skippedTiles: number;
  failedTiles: number;
  currentZoom: number;
}

@Injectable({ providedIn: 'root' })
export class ChartRemoteCatalogService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly baseUrl = this.environment.chartEngineApiUrl.replace(/\/$/, '');

  listSources() {
    return this.http.get<{ sources: ChartCatalogSource[] }>(`${this.baseUrl}/catalog/sources`).pipe(
      map(({ sources }) => sources),
    );
  }

  getSource(providerId: string) {
    return this.http.get<ChartCatalogSource>(`${this.baseUrl}/catalog/sources/${encodeURIComponent(providerId)}`);
  }

  listCharts(providerId: string, bbox?: [number, number, number, number]) {
    const url = `${this.baseUrl}/catalog/sources/${encodeURIComponent(providerId)}/charts`;
    const options = bbox ? { params: { bbox: bbox.join(',') } } : {};
    return this.http.get<{ charts: ChartCatalogEntry[] }>(url, options).pipe(
      map(({ charts }) => charts),
    );
  }

  downloadArea(request: AreaDownloadRequest) {
    return this.http.post<ChartDownloadJob>(`${this.baseUrl}/catalog/download/area`, request);
  }

  /** Download a catalog chart (e.g. NOAA ENC) by its catalog chartId. */
  downloadChart(request: ChartDownloadRequest) {
    return this.http.post<ChartDownloadJob>(`${this.baseUrl}/catalog/download/chart`, request);
  }

  /** Estimate tiles/size for an area download before starting it. */
  estimateDownload(request: AreaEstimateRequest) {
    return this.http.post<AreaEstimate>(`${this.baseUrl}/catalog/download/estimate`, request);
  }

  /** Poll an engine job by id (shared with imports). */
  getJob(jobId: string) {
    return this.http.get<ChartDownloadJob>(`${this.baseUrl}/charts/jobs/${encodeURIComponent(jobId)}`);
  }

  /** Latest progress for a running area download, keyed by its chart id. */
  getAreaProgress(chartId: string) {
    return this.http.get<AreaDownloadProgress>(
      `${this.baseUrl}/catalog/download/${encodeURIComponent(chartId)}/progress`,
    );
  }

  /** Cancel a running area download by its chart id. */
  cancelDownload(chartId: string) {
    return this.http.post<{ cancelled: boolean }>(
      `${this.baseUrl}/catalog/download/${encodeURIComponent(chartId)}/cancel`,
      {},
    );
  }
}
