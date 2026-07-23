import assert from 'node:assert/strict';
import test from 'node:test';
import { BUILT_IN_PROVIDERS } from './chart-source-catalog.js';

test('only providers with an offline-compatible policy allow area downloads', () => {
  const availability = (id: string) => BUILT_IN_PROVIDERS.find((provider) => provider.id === id)?.availability;

  assert.equal(availability('emodnet-bathymetry'), 'offline-capable');
  assert.equal(availability('openseamap'), 'online');
  assert.equal(availability('ihm-enc-wms'), 'online');
});
