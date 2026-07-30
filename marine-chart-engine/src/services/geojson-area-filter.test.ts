import assert from 'node:assert/strict';
import test from 'node:test';
import { filterFeatureCollection, parseAreaPolygon } from './geojson-area-filter.js';

test('filters point and cell features to the selected polygon', () => {
  const polygon = parseAreaPolygon(JSON.stringify({
    type: 'Polygon',
    coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
  }));
  const result = filterFeatureCollection({
    type: 'FeatureCollection' as const,
    features: [
      { geometry: { type: 'Point', coordinates: [1, 1] } },
      { geometry: { type: 'Point', coordinates: [3, 3] } },
      { geometry: { type: 'Polygon', coordinates: [[[1.5, 1.5], [2.5, 1.5], [2.5, 2.5], [1.5, 1.5]]] } },
    ],
  }, polygon);

  assert.equal(result.features.length, 2);
});
