import type {
  FieldSample,
  MarineField,
  MarineFieldRequest,
  MarineFieldResponse,
  MarineVariable,
  ProviderCandidate,
  ProviderDecision,
} from '../domain/marine-field.js';
import { geodesicDistanceKm } from '../domain/marine-math.js';
import { MarineProviderError, type MarineProvider } from './marine-provider.js';
import { ModelSelector } from './model-selector.js';
import { ProviderRegistry } from './provider-registry.js';

export class MarineEnvironmentEngine {
  private readonly inflight = new Map<string, Promise<MarineFieldResponse>>();

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly selector = new ModelSelector(),
  ) {}

  providers(): Array<{ id: string; label: string; variables: readonly MarineVariable[] }> {
    return this.registry.list().map(({ id, label, variables }) => ({ id, label, variables }));
  }

  async getField(request: MarineFieldRequest): Promise<MarineFieldResponse> {
    const key = JSON.stringify(request);
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const pending = this.resolveField(request).finally(() => this.inflight.delete(key));
    this.inflight.set(key, pending);
    return pending;
  }

  sample(field: MarineField, latitude: number, longitude: number): FieldSample {
    const coordinates = this.coordinates(field);
    if (coordinates.length === 0) throw new MarineProviderError('NO_DATA', 'Field contains no source nodes');
    const interpolation = field.dataGrid.kind === 'regular'
      ? regularGridWeights(field.dataGrid, latitude, longitude)
      : pointGridWeights(coordinates, latitude, longitude);
    const value = Object.fromEntries(Object.entries(field.dataGrid.components).map(([name, values]) => [
      name,
      weightedValue(values, interpolation.weights, isCircularComponent(name)),
    ]));
    return {
      value,
      position: { latitude, longitude },
      time: field.metadata.validTime,
      spatialInterpolation: interpolation.method,
      temporalInterpolation: field.metadata.temporalInterpolation
        ? 'linear-between-source-frames'
        : 'none',
      nearestSourceDistanceKm: Number(interpolation.nearestDistanceKm.toFixed(3)),
      metadata: field.metadata,
    };
  }

  private async resolveField(request: MarineFieldRequest): Promise<MarineFieldResponse> {
    const providers = this.registry.forVariable(request.variable)
      .filter((provider) => request.source === 'auto' || provider.id === request.source);
    if (providers.length === 0) throw new MarineProviderError('NO_DATA', `No provider registered for ${request.variable}`);
    const candidates = await Promise.all(providers.map(async (provider) => {
      try {
        return await provider.describe(request);
      } catch {
        return this.unavailableCandidate(provider, request.variable);
      }
    }));
    const describedCandidates = candidates.filter((candidate) => candidate.health !== 'unavailable');
    if (describedCandidates.length > 0 && describedCandidates.every((candidate) => !candidate.coversViewport)) {
      throw new MarineProviderError('NO_COVERAGE', `No ${request.variable} provider covers the selected area`);
    }
    const initial = this.selector.rank(candidates, request.currentConditions);
    const failures: string[] = [];
    for (const candidate of initial.candidates) {
      if (candidate.health === 'unavailable' || !candidate.coversViewport || candidate.missingVariables.length > 0) continue;
      const provider = providers.find((item) => item.id === candidate.providerId);
      if (!provider) continue;
      try {
        const field = await provider.getField(request);
        const decision: ProviderDecision = {
          ...initial,
          selected: provider.id,
          reasons: [
            `${provider.label} supplied the selected physical field`,
            ...(candidate.reasons ?? []),
            ...failures,
          ],
        };
        return { field, decision };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failures.push(`${provider.label} rejected: ${reason}`);
      }
    }
    throw new MarineProviderError('NO_DATA', failures.join('; ') || initial.reasons.join('; '));
  }

  private unavailableCandidate(provider: MarineProvider, variable: MarineVariable): ProviderCandidate {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      variable,
      health: 'unavailable',
      coversViewport: false,
      spatialResolutionMeters: null,
      temporalResolutionMinutes: null,
      ageMinutes: null,
      coastalSuitability: 0,
      observation: false,
      missingVariables: [],
      latencyMs: null,
    };
  }

  private coordinates(field: MarineField): Array<{ latitude: number; longitude: number }> {
    const grid = field.dataGrid;
    if (grid.kind === 'points') {
      return grid.longitude.map((longitude, index) => ({
        longitude,
        latitude: grid.latitude[index]!,
      }));
    }
    return Array.from({ length: grid.nodeCount }, (_, index) => ({
      longitude: grid.origin[0] + (index % grid.width) * grid.spacing[0],
      latitude: grid.origin[1] + Math.floor(index / grid.width) * grid.spacing[1],
    }));
  }
}

interface SpatialWeights {
  method: FieldSample['spatialInterpolation'];
  weights: Array<{ index: number; weight: number }>;
  nearestDistanceKm: number;
}

const regularGridWeights = (
  grid: Extract<MarineField['dataGrid'], { kind: 'regular' }>,
  latitude: number,
  longitude: number,
): SpatialWeights => {
  const fractionalX = (longitude - grid.origin[0]) / grid.spacing[0];
  const fractionalY = (latitude - grid.origin[1]) / grid.spacing[1];
  const left = Math.max(0, Math.min(grid.width - 1, Math.floor(fractionalX)));
  const bottom = Math.max(0, Math.min(grid.height - 1, Math.floor(fractionalY)));
  const right = Math.min(grid.width - 1, left + 1);
  const top = Math.min(grid.height - 1, bottom + 1);
  const x = Math.max(0, Math.min(1, fractionalX - left));
  const y = Math.max(0, Math.min(1, fractionalY - bottom));
  const merged = new Map<number, number>();
  for (const item of [
    { index: bottom * grid.width + left, weight: (1 - x) * (1 - y) },
    { index: bottom * grid.width + right, weight: x * (1 - y) },
    { index: top * grid.width + left, weight: (1 - x) * y },
    { index: top * grid.width + right, weight: x * y },
  ]) merged.set(item.index, (merged.get(item.index) ?? 0) + item.weight);
  const coordinates = [...merged.keys()].map((index) => ({
    index,
    longitude: grid.origin[0] + (index % grid.width) * grid.spacing[0],
    latitude: grid.origin[1] + Math.floor(index / grid.width) * grid.spacing[1],
  }));
  return {
    method: 'bilinear-regular-grid',
    weights: [...merged].map(([index, weight]) => ({ index, weight })),
    nearestDistanceKm: Math.min(...coordinates.map((point) =>
      geodesicDistanceKm(latitude, longitude, point.latitude, point.longitude))),
  };
};

const pointGridWeights = (
  coordinates: Array<{ latitude: number; longitude: number }>,
  latitude: number,
  longitude: number,
): SpatialWeights => {
  const nearest = coordinates.map((coordinate, index) => ({
    index,
    distance: geodesicDistanceKm(latitude, longitude, coordinate.latitude, coordinate.longitude),
  })).sort((left, right) => left.distance - right.distance).slice(0, 4);
  if (nearest[0]!.distance < 0.001) {
    return {
      method: 'idw-four-source-nodes',
      weights: [{ index: nearest[0]!.index, weight: 1 }],
      nearestDistanceKm: nearest[0]!.distance,
    };
  }
  const raw = nearest.map((item) => ({ ...item, weight: 1 / Math.max(0.001, item.distance ** 2) }));
  const total = raw.reduce((sum, item) => sum + item.weight, 0);
  return {
    method: 'idw-four-source-nodes',
    weights: raw.map(({ index, weight }) => ({ index, weight: weight / total })),
    nearestDistanceKm: nearest[0]!.distance,
  };
};

const weightedValue = (
  values: Array<number | null>,
  weights: Array<{ index: number; weight: number }>,
  circular: boolean,
): number | null => {
  const available = weights.flatMap(({ index, weight }) => {
    const value = values[index];
    return value === null || !Number.isFinite(value) ? [] : [{ value, weight }];
  });
  if (available.length === 0) return null;
  const total = available.reduce((sum, item) => sum + item.weight, 0);
  if (circular) {
    const sine = available.reduce((sum, item) => sum + Math.sin(item.value * Math.PI / 180) * item.weight, 0);
    const cosine = available.reduce((sum, item) => sum + Math.cos(item.value * Math.PI / 180) * item.weight, 0);
    return (Math.atan2(sine / total, cosine / total) * 180 / Math.PI + 360) % 360;
  }
  return available.reduce((sum, item) => sum + item.value * item.weight, 0) / total;
};

const isCircularComponent = (name: string): boolean =>
  name.toLowerCase().includes('direction');
