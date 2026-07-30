import assert from 'node:assert/strict';
import test from 'node:test';
import { filterWaveSymbolsToMarine, normalizeWaveSymbols } from './environment.routes.js';

test('normalizes cached legacy wave arrows into renderable point symbols', () => {
  const result = normalizeWaveSymbols({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[-8.9, 42.2], [-8.8, 42.3]],
          [[-8.8, 42.3], [-8.82, 42.28]],
        ],
      },
      properties: { featureType: 'direction', heightMeters: 1.4, directionDeg: 270 },
    }],
  });

  assert.deepEqual(result.features[0]?.geometry, {
    type: 'Point',
    coordinates: [-8.850000000000001, 42.25],
  });
  assert.equal(result.features[0]?.properties?.['featureType'], 'waveSymbol');
});

test('drops cached wave symbols whose anchor is on land', () => {
  const filtered = filterWaveSymbolsToMarine({
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: { featureType: 'waveSymbol' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [4, 4] }, properties: { featureType: 'waveSymbol' } },
    ],
  }, [{
    type: 'Polygon',
    coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
  }]);

  assert.equal(filtered.features.length, 1);
  assert.deepEqual(filtered.features[0]?.geometry.coordinates, [1, 1]);
});
