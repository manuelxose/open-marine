import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/app-environment.token';
import type { EngineChartSource } from './chart-engine-api.service';

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

export interface AreaGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export type PackageState = 'planning' | 'downloading' | 'incomplete' | 'ready' | 'outdated' | 'expired' | 'failed';

export interface AreaSearchResult {
  id: string;
  label: string;
  type: string;
  municipality?: string;
  province?: string;
  center: [number, number];
  bounds: [number, number, number, number];
  geometry: AreaGeometry;
  source: 'cartociudad';
}

export interface PackageLayerPlan {
  id: string;
  providerId: string;
  label: string;
  role: 'official-enc' | 'bathymetry' | 'coastline' | 'seamarks' | 'fallback';
  official: boolean;
  required: boolean;
  acquisition: 'automatic' | 'licensed-import' | 'manual-import' | 'online-reference';
  state: 'pending' | 'required' | 'downloading' | 'ready' | 'warning' | 'failed';
  reason?: string;
  bounds: [number, number, number, number];
  minZoom?: number;
  maxZoom?: number;
  estimatedBytes?: number;
  attribution: string;
  license: string;
  navigationUse: 'official-source' | 'supplementary' | 'not-for-navigation';
  chartId?: string;
}

export interface LicenseRequirement {
  id: string;
  label: string;
  status: 'accepted' | 'pending' | 'external-action';
  url?: string;
  message: string;
}

export interface PackagePlan {
  id: string;
  name: string;
  geometry: AreaGeometry;
  bounds: [number, number, number, number];
  profile: 'recommended' | 'custom';
  layers: PackageLayerPlan[];
  licenses: LicenseRequirement[];
  estimatedBytes: number;
  storageBudgetBytes: number;
  availableBytes: number;
  minimumFreeBytes: number;
  canCreate: boolean;
  blockers: string[];
  warnings: string[];
  createdAt: string;
}

export interface PackageManifest extends Omit<PackagePlan, 'canCreate' | 'blockers'> {
  state: PackageState;
  version: number;
  updatedAt: string;
  activatedAt?: string;
  error?: string;
  disclaimer: string;
}

export interface ChartInstallationDiagnostics {
  tools: Array<{ id: string; available: boolean; purpose: string; requiredFor: string[] }>;
  storage: {
    path: string;
    totalBytes: number;
    availableBytes: number;
    writable: boolean;
    recommendedMedium: string;
  };
  s63: {
    installationId: string;
    hardwareId: string;
    userPermit: string | null;
    mode: 'pending-oem' | 'test' | 'production';
    ready: boolean;
    blockers: string[];
  };
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

  searchAreas(query: string) {
    return this.http.post<{ results: AreaSearchResult[] }>(`${this.baseUrl}/catalog/areas/search`, { query }).pipe(
      map(({ results }) => results),
    );
  }

  planPackage(request: {
    name: string;
    geometry: AreaGeometry;
    profile: 'recommended' | 'custom';
    storageBudgetBytes: number;
    selectedProviderIds?: string[];
  }) {
    return this.http.post<PackagePlan>(`${this.baseUrl}/catalog/package-plans`, request);
  }

  createPackage(planId: string) {
    return this.http.post<PackageManifest>(`${this.baseUrl}/catalog/packages`, { planId });
  }

  listPackages() {
    return this.http.get<{ packages: PackageManifest[] }>(`${this.baseUrl}/catalog/packages`).pipe(
      map(({ packages }) => packages),
    );
  }

  repairPackage(packageId: string) {
    return this.http.post<PackageManifest>(
      `${this.baseUrl}/catalog/packages/${encodeURIComponent(packageId)}/repair`,
      {},
    );
  }

  cancelPackage(packageId: string) {
    return this.http.post<PackageManifest>(
      `${this.baseUrl}/catalog/packages/${encodeURIComponent(packageId)}/cancel`,
      {},
    );
  }

  deletePackage(packageId: string) {
    return this.http.delete<void>(`${this.baseUrl}/catalog/packages/${encodeURIComponent(packageId)}`);
  }

  installationDiagnostics() {
    return this.http.get<ChartInstallationDiagnostics>(`${this.baseUrl}/catalog/installation`);
  }

  listLocalCharts() {
    return this.http.get<{ charts: EngineChartSource[] }>(`${this.baseUrl}/charts`).pipe(
      map(({ charts }) => charts),
    );
  }

  attachPackageLayer(packageId: string, layerId: string, chartId: string) {
    return this.http.post<PackageManifest>(
      `${this.baseUrl}/catalog/packages/${encodeURIComponent(packageId)}/layers/${encodeURIComponent(layerId)}/attach`,
      { chartId },
    );
  }
}
