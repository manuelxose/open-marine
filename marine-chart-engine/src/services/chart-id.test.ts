import assert from 'node:assert/strict';
import test from 'node:test';

const CHART_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

test('chart ids use lowercase kebab-case', () => {
  assert.equal(CHART_ID_PATTERN.test('galicia-raster'), true);
  assert.equal(CHART_ID_PATTERN.test('vigo-enc-01'), true);
  assert.equal(CHART_ID_PATTERN.test('Vigo'), false);
  assert.equal(CHART_ID_PATTERN.test('../secret'), false);
});
