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

export interface ChartCatalogEntry {
  id: string;
  providerId: string;
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
}

export interface EncDownloadRequest {
  chartNumber: string;
  id: string;
  label: string;
  description?: string;
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

  listCharts(providerId: string) {
    return this.http.get<{ charts: ChartCatalogEntry[] }>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(providerId)}/charts`,
    ).pipe(
      map(({ charts }) => charts),
    );
  }

  downloadArea(request: AreaDownloadRequest) {
    return this.http.post<{ id: string; status: string; chartId: string; label: string }>(
      `${this.baseUrl}/catalog/download/area`,
      request,
    );
  }

  downloadEnc(request: EncDownloadRequest) {
    return this.http.post<{ id: string; status: string; chartId: string; label: string }>(
      `${this.baseUrl}/catalog/download/enc`,
      request,
    );
  }
}
