import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { EnvironmentCatalogService } from './environment-catalog.service.js';

test('environment catalog explains unavailable credentials and Copernicus frames', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-environment-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dataDir, 'environment', 'currents'), { recursive: true });
  await fs.writeFile(path.join(dataDir, 'environment', 'manifest.json'), JSON.stringify({
    updatedAt: new Date().toISOString(),
    layers: { currents: ['2026-07-22T12:00:00Z'] },
  }));
  const frame = path.join(dataDir, 'environment', 'currents', '2026-07-22T12-00-00Z.geojson');
  await fs.writeFile(frame, '{"type":"FeatureCollection","features":[]}');

  const catalog = new EnvironmentCatalogService(dataDir, 'http://localhost:8088', false);
  const layers = catalog.list();
  assert.equal(layers.find((layer) => layer.id === 'wind')?.state, 'unavailable');
  assert.match(layers.find((layer) => layer.id === 'wind')?.message ?? '', /API_KEY/);
  assert.equal(layers.find((layer) => layer.id === 'currents')?.state, 'cached');
  assert.equal(catalog.framePath('currents', '2026-07-22T12:00:00Z'), frame);
  assert.equal(catalog.framePath('currents', '../../secret'), null);
});
