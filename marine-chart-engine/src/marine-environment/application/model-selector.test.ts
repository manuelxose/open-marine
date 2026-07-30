import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProviderCandidate } from '../domain/marine-field.js';
import { ModelSelector } from './model-selector.js';

const candidate = (overrides: Partial<ProviderCandidate>): ProviderCandidate => ({
  providerId: 'regional',
  providerLabel: 'Regional',
  variable: 'currents',
  health: 'available',
  coversViewport: true,
  spatialResolutionMeters: 3000,
  temporalResolutionMinutes: 60,
  ageMinutes: 30,
  coastalSuitability: 0.7,
  observation: false,
  missingVariables: [],
  latencyMs: 100,
  ...overrides,
});

test('recent observation wins NOW but not a future forecast request', () => {
  const selector = new ModelSelector();
  const observation = candidate({
    providerId: 'observed',
    providerLabel: 'Observed',
    observation: true,
    spatialResolutionMeters: 6000,
  });
  const forecast = candidate({});
  assert.equal(selector.rank([observation, forecast], true).selected, 'observed');
  assert.equal(selector.rank([observation, forecast], false).selected, 'regional');
});

test('unavailable and incomplete candidates cannot be selected', () => {
  const decision = new ModelSelector().rank([
    candidate({ providerId: 'offline', health: 'unavailable' }),
    candidate({ providerId: 'partial', coversViewport: false }),
  ], true);
  assert.equal(decision.selected, null);
});

