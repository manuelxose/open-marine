export interface AreaGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export type PackageProfile = 'recommended' | 'custom';
export type PackageState =
  | 'planning'
  | 'downloading'
  | 'incomplete'
  | 'ready'
  | 'outdated'
  | 'expired'
  | 'failed';
export type PackageLayerState =
  | 'pending'
  | 'required'
  | 'downloading'
  | 'ready'
  | 'warning'
  | 'failed';

export interface LicenseRequirement {
  id: string;
  label: string;
  status: 'accepted' | 'pending' | 'external-action';
  url?: string;
  message: string;
}

export interface PackageLayerPlan {
  id: string;
  providerId: string;
  label: string;
  role: 'official-enc' | 'bathymetry' | 'coastline' | 'seamarks' | 'fallback';
  official: boolean;
  required: boolean;
  acquisition: 'automatic' | 'licensed-import' | 'manual-import' | 'online-reference';
  state: PackageLayerState;
  reason?: string;
  bounds: [number, number, number, number];
  minZoom?: number;
  maxZoom?: number;
  estimatedBytes?: number;
  attribution: string;
  license: string;
  navigationUse: 'official-source' | 'supplementary' | 'not-for-navigation';
  jobId?: string;
  chartId?: string;
}

export interface PackagePlan {
  id: string;
  name: string;
  geometry: AreaGeometry;
  bounds: [number, number, number, number];
  profile: PackageProfile;
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

export interface PackageManifest extends Omit<PackagePlan, 'canCreate' | 'blockers' | 'warnings'> {
  state: PackageState;
  version: number;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  lastCheckedAt?: string;
  error?: string;
  warnings: string[];
  disclaimer: string;
}

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

