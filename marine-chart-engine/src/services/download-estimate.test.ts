import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateAreaDownload, tileCountForZoom } from './download-estimate.js';

test('tileCountForZoom returns 1 tile for a tiny bbox at low zoom', () => {
  const count = tileCountForZoom([-8.1, 42.1, -8.0, 42.2], 0);
  assert.equal(count, 1);
});

test('estimateAreaDownload sums tiles across the zoom range and reports size', () => {
  const estimate = estimateAreaDownload([-9, 42, -8, 43], 4, 8);
  assert.ok(estimate.totalTiles > 0);
  assert.equal(typeof estimate.estimatedSizeMb, 'number');
  assert.ok(estimate.estimatedSizeMb >= 0);
});

test('estimateAreaDownload warns when tile count is large', () => {
  const estimate = estimateAreaDownload([-30, 20, 30, 60], 4, 12);
  assert.ok(estimate.totalTiles > 10000);
  assert.ok(estimate.warning, 'expected a warning for a large download');
});
