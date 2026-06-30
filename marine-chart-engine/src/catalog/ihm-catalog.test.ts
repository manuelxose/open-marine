import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IhmCatalogClient } from './ihm-catalog.js';

test('IhmCatalogClient exposes IHM ENC WMS purpose services p2-p5', async () => {
  const entries = await new IhmCatalogClient().fetchCatalog();

  assert.deepEqual(entries.map((entry) => entry.tileProviderId), [
    'ihm-enc-p2',
    'ihm-enc-p3',
    'ihm-enc-p4',
    'ihm-enc-p5',
  ]);
  assert.deepEqual(entries.map((entry) => entry.wmsLayer), ['ENC_ES2', 'ENC_ES3', 'ENC_ES4', 'ENC_ES5']);
  assert.ok(entries.every((entry) => entry.providerId === 'ihm-enc-wms'));
  assert.ok(entries.every((entry) => entry.downloadUrl?.startsWith('https://ideihm.covam.es/wms/cartaENCp')));
  assert.ok(!entries.some((entry) => entry.downloadUrl?.includes('/ihm/wms/ENC')));
});

test('IhmCatalogClient applies bbox filtering', async () => {
  const entries = await new IhmCatalogClient().fetchCatalog({ bbox: [-9, 42, -8, 43] });
  assert.equal(entries.length, 4);

  const outside = await new IhmCatalogClient().fetchCatalog({ bbox: [120, 10, 121, 11] });
  assert.equal(outside.length, 0);
});
