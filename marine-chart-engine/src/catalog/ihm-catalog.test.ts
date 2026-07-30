import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IhmCatalogClient } from './ihm-catalog.js';

test('IhmCatalogClient exposes the current unified IHM RasterENC WMTS', async () => {
  const entries = await new IhmCatalogClient().fetchCatalog();

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.tileProviderId, 'ihm-enc-wmts');
  assert.equal(entries[0]?.providerId, 'ihm-enc-wms');
  assert.equal(entries[0]?.format, 'xyz-tiles');
  assert.equal(entries[0]?.maxZoom, 21);
  assert.equal(entries[0]?.downloadUrl, 'https://ideihm.covam.es/ihmcache/wmts');
});

test('IhmCatalogClient applies bbox filtering', async () => {
  const entries = await new IhmCatalogClient().fetchCatalog({ bbox: [-9, 42, -8, 43] });
  assert.equal(entries.length, 1);

  const outside = await new IhmCatalogClient().fetchCatalog({ bbox: [120, 10, 121, 11] });
  assert.equal(outside.length, 0);
});
