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
  metadata?: Record<string, string>;
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

export interface EngineProviderDiagnostic {
  id: string;
  available: boolean;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
}

export interface EngineDiagnostics {
  status: string;
  weatherConfigured: boolean;
  environmentSync: {
    enabled: boolean;
    running: boolean;
    lastStartedAt?: string;
    lastCompletedAt?: string;
    lastError?: string;
    nextAttemptAt?: string;
  };
  xyzProviders: EngineProviderDiagnostic[];
  wmsProviders: EngineProviderDiagnostic[];
}

export interface EngineStorageStatus {
  totalBytes: number;
  availableBytes: number;
  reserveBytes: number;
  quotaBytes: number;
  evictableUsedBytes: number;
  pressure: boolean;
  categories: Array<{ id: 'tiles' | 'weather' | 'environment'; usedBytes: number; fileCount: number }>;
  lastPrunedAt?: string;
  lastFreedBytes?: number;
}

export interface EncHazardResponse {
  coverage: 'available' | 'unavailable';
  advisoryOnly: true;
  safetyDepthM: number;
  minDepthM: number | null;
  sector: GeoJSON.Feature<GeoJSON.Polygon>['geometry'];
  hazards: GeoJSON.FeatureCollection;
  evaluatedChartIds: string[];
  indexedChartCount: number;
}

export interface IhmFeatureInfoAttribute {
  label: string;
  acronym: string | null;
  value: string;
}

export interface IhmFeatureInfoFeature {
  title: string;
  objectClass: string | null;
  cell: string | null;
  kind: 'feature' | 'context';
  attributes: IhmFeatureInfoAttribute[];
  details: string;
}

export interface IhmFeatureInfoResponse {
  source: string;
  position: { longitude: number; latitude: number };
  features: IhmFeatureInfoFeature[];
  advisoryOnly: true;
  disclaimer: string;
}

export interface MarineMaskResponse extends GeoJSON.FeatureCollection {
  properties: {
    source: 'enc' | 'official-coast' | 'global-fallback';
    coverage: 'available' | 'fallback' | 'unavailable';
    chartIds: string[];
    precision: 'enc-vector' | 'coastal-fallback';
    fallbackUsed: boolean;
    advisoryOnly: true;
  };
}

export interface EncDepthOverlayResponse extends GeoJSON.FeatureCollection {
  properties: {
    coverage: 'available' | 'unavailable';
    chartIds: string[];
    safetyDepthM: number;
    advisoryOnly: true;
  };
}

@Injectable({ providedIn: 'root' })
export class ChartEngineApiService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly baseUrl = this.environment.chartEngineApiUrl.replace(/\/$/, '');

  health() {
    return this.http.get<{ status: string; service: string }>(`${this.baseUrl}/health`);
  }

  diagnostics() {
    return this.http.get<EngineDiagnostics>(`${this.baseUrl}/health/diagnostics`);
  }

  storageStatus() {
    return this.http.get<EngineStorageStatus>(`${this.baseUrl}/catalog/storage`);
  }

  pruneStorage() {
    return this.http.post<EngineStorageStatus>(`${this.baseUrl}/catalog/storage/prune`, {});
  }

  queryEncHazards(request: {
    chartIds: string[];
    position: { latitude: number; longitude: number };
    courseDeg: number;
    speedMps: number;
    draftM: number;
    underKeelClearanceM: number;
    safetyDepthM: number;
    lookAheadMinutes: number;
    corridorWidthM: number;
  }) {
    return this.http.post<EncHazardResponse>(`${this.baseUrl}/catalog/enc/hazards/query`, request);
  }

  ihmFeatureInfo(longitude: number, latitude: number, zoom: number) {
    return this.http.get<IhmFeatureInfoResponse>(`${this.baseUrl}/catalog/ihm/feature-info`, {
      params: { lng: longitude, lat: latitude, zoom },
    });
  }

  marineMask(params: { bbox: [number, number, number, number]; area?: GeoJSON.Polygon }) {
    return this.http.get<MarineMaskResponse>(`${this.baseUrl}/catalog/enc/marine-mask.geojson`, {
      params: {
        bbox: params.bbox.join(','),
        ...(params.area ? { area: JSON.stringify(params.area) } : {}),
      },
    });
  }

  encDepthOverlay(params: {
    bbox: [number, number, number, number];
    area?: GeoJSON.Polygon;
    safetyDepthM: number;
    layers: string[];
  }) {
    return this.http.get<EncDepthOverlayResponse>(`${this.baseUrl}/catalog/enc/depth-overlay.geojson`, {
      params: {
        bbox: params.bbox.join(','),
        safetyDepthM: params.safetyDepthM,
        layers: params.layers.join(','),
        ...(params.area ? { area: JSON.stringify(params.area) } : {}),
      },
    });
  }

  syncEnvironment() {
    return this.http.post<EngineDiagnostics['environmentSync']>(
      `${this.baseUrl}/environment/sync`,
      {},
    );
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
