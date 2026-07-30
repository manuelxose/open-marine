export type MarineVariable = 'wind' | 'waves' | 'currents';
export type BoundingBox = [west: number, south: number, east: number, north: number];
export type ProviderHealth = 'available' | 'degraded' | 'unavailable' | 'stale';
export type FieldQuality = 'high' | 'medium' | 'low' | 'unknown';
export type DirectionConvention = 'vector-to' | 'meteorological-from' | 'oceanographic-from';

export interface MarineFieldMetadata {
  provider: string;
  product: string;
  model: string;
  datasetId: string;
  runTime: string | null;
  validTime: string;
  forecastLeadTimeHours: number | null;
  retrievedAt: string;
  sourceResolution: {
    value: number | null;
    unit: 'm' | 'km' | 'degree';
    approximateMeters: number | null;
    label: string;
  };
  sourceTemporalResolutionMinutes: number | null;
  boundingBox: BoundingBox;
  coordinateReferenceSystem: 'EPSG:4326';
  isForecast: boolean;
  isAnalysis: boolean;
  isObservation: boolean;
  isInterpolated: boolean;
  quality: FieldQuality;
  coverage: 'complete' | 'partial' | 'point';
  variables: string[];
  directionConvention: DirectionConvention;
  sourceUrl?: string;
  license?: string;
  attribution?: string;
  observedAt?: string;
  temporalInterpolation?: {
    method: 'linear';
    before: string;
    after: string;
    weight: number;
  };
}

export interface MarinePointGrid {
  kind: 'points';
  nodeCount: number;
  longitude: number[];
  latitude: number[];
  /** Component arrays align with longitude/latitude. null means NO DATA, never calm. */
  components: Record<string, Array<number | null>>;
}

export interface MarineRegularGrid {
  kind: 'regular';
  width: number;
  height: number;
  nodeCount: number;
  origin: [longitude: number, latitude: number];
  spacing: [longitudeDegrees: number, latitudeDegrees: number];
  components: Record<string, Array<number | null>>;
}

export interface MarineField {
  variable: MarineVariable;
  metadata: MarineFieldMetadata;
  dataGrid: MarinePointGrid | MarineRegularGrid;
  renderGrid: null;
}

export interface ProviderCandidate {
  providerId: string;
  providerLabel: string;
  variable: MarineVariable;
  health: ProviderHealth;
  coversViewport: boolean;
  spatialResolutionMeters: number | null;
  temporalResolutionMinutes: number | null;
  ageMinutes: number | null;
  coastalSuitability: number;
  observation: boolean;
  missingVariables: string[];
  latencyMs: number | null;
  score?: number;
  reasons?: string[];
}

export interface ProviderDecision {
  selected: string | null;
  candidates: ProviderCandidate[];
  reasons: string[];
}

export interface MarineFieldResponse {
  field: MarineField;
  decision: ProviderDecision;
}

export interface MarineFieldRequest {
  variable: MarineVariable;
  bbox: BoundingBox;
  time: string;
  source: string;
  currentConditions: boolean;
}

export interface FieldSample {
  value: Record<string, number | null>;
  position: { latitude: number; longitude: number };
  time: string;
  spatialInterpolation: 'bilinear-regular-grid' | 'idw-four-source-nodes';
  temporalInterpolation: 'none' | 'linear-between-source-frames';
  nearestSourceDistanceKm: number;
  metadata: MarineFieldMetadata;
}
