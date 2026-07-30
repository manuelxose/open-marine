import assert from 'node:assert/strict';
import test from 'node:test';
import type { MarineField } from '../domain/marine-field.js';
import { MarineEnvironmentEngine } from './marine-environment-engine.js';
import { MarineProviderError, type MarineProvider } from './marine-provider.js';
import { ProviderRegistry } from './provider-registry.js';

const metadata: MarineField['metadata'] = {
  provider: 'test',
  product: 'test',
  model: 'test',
  datasetId: 'test',
  runTime: null,
  validTime: '2026-07-29T12:30:00.000Z',
  forecastLeadTimeHours: 1,
  retrievedAt: '2026-07-29T12:00:00.000Z',
  sourceResolution: { value: 1, unit: 'degree', approximateMeters: 111_000, label: 'test' },
  sourceTemporalResolutionMinutes: 60,
  boundingBox: [0, 0, 1, 1],
  coordinateReferenceSystem: 'EPSG:4326',
  isForecast: true,
  isAnalysis: false,
  isObservation: false,
  isInterpolated: true,
  temporalInterpolation: {
    method: 'linear',
    before: '2026-07-29T12:00:00.000Z',
    after: '2026-07-29T13:00:00.000Z',
    weight: 0.5,
  },
  quality: 'high',
  coverage: 'complete',
  variables: ['speed', 'directionFrom'],
  directionConvention: 'meteorological-from',
};

test('samples a regular source grid bilinearly and preserves temporal provenance', () => {
  const field: MarineField = {
    variable: 'wind',
    metadata,
    dataGrid: {
      kind: 'regular',
      width: 2,
      height: 2,
      nodeCount: 4,
      origin: [0, 0],
      spacing: [1, 1],
      components: {
        speed: [0, 2, 2, 4],
        directionFrom: [350, 10, 350, 10],
      },
    },
    renderGrid: null,
  };
  const sample = new MarineEnvironmentEngine(new ProviderRegistry()).sample(field, 0.5, 0.5);
  assert.equal(sample.spatialInterpolation, 'bilinear-regular-grid');
  assert.equal(sample.temporalInterpolation, 'linear-between-source-frames');
  assert.equal(sample.value['speed'], 2);
  assert.ok(Math.abs(sample.value['directionFrom'] ?? 999) < 0.001);
});

test('samples irregular source nodes with four-node inverse distance weighting', () => {
  const { temporalInterpolation: _temporalInterpolation, ...metadataWithoutTemporalInterpolation } = metadata;
  const field: MarineField = {
    variable: 'currents',
    metadata: { ...metadataWithoutTemporalInterpolation, directionConvention: 'vector-to' },
    dataGrid: {
      kind: 'points',
      nodeCount: 4,
      longitude: [0, 1, 0, 1],
      latitude: [0, 0, 1, 1],
      components: { u: [1, 3, 1, 3], v: [0, 0, 2, 2] },
    },
    renderGrid: null,
  };
  const sample = new MarineEnvironmentEngine(new ProviderRegistry()).sample(field, 0.5, 0.5);
  assert.equal(sample.spatialInterpolation, 'idw-four-source-nodes');
  assert.ok(Math.abs((sample.value['u'] ?? 0) - 2) < 0.001);
  assert.ok(Math.abs((sample.value['v'] ?? 0) - 1) < 0.001);
});

test('reports a selected area outside every described provider as no coverage', async () => {
  const registry = new ProviderRegistry();
  registry.register({
    id: 'local-currents',
    label: 'Local currents',
    variables: ['currents'],
    describe: async () => ({
      providerId: 'local-currents',
      providerLabel: 'Local currents',
      variable: 'currents',
      health: 'available',
      coversViewport: false,
      spatialResolutionMeters: 3_000,
      temporalResolutionMinutes: 60,
      ageMinutes: 10,
      coastalSuitability: 1,
      observation: false,
      missingVariables: [],
      latencyMs: 1,
    }),
    getField: async () => {
      throw new Error('must not fetch outside coverage');
    },
  } satisfies MarineProvider);

  await assert.rejects(
    () => new MarineEnvironmentEngine(registry).getField({
      variable: 'currents',
      bbox: [-9.13, 42.41, -8.79, 42.7],
      time: '2026-07-29T11:00:00Z',
      source: 'auto',
      currentConditions: false,
    }),
    (error) => error instanceof MarineProviderError && error.code === 'NO_COVERAGE',
  );
});
