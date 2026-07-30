import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { EncHazardService } from './enc-hazard.service.js';
import type { ChartRegistryService } from './chart-registry.service.js';

test('returns indexed shallow features inside the look-ahead corridor', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-enc-hazard-'));
  const mbtiles = path.join(directory, 'test.mbtiles');
  await fs.writeFile(mbtiles, '');
  const index = new Database(`${mbtiles}.enc-index.sqlite`);
  index.exec(`
    CREATE TABLE enc_features (
      id INTEGER PRIMARY KEY, object_class TEXT, layer TEXT,
      geometry_json TEXT, properties_json TEXT
    );
    CREATE VIRTUAL TABLE enc_features_rtree USING rtree(id, min_lon, max_lon, min_lat, max_lat);
  `);
  const feature = index.prepare(
    'INSERT INTO enc_features(object_class, layer, geometry_json, properties_json) VALUES (?, ?, ?, ?)',
  ).run('SOUNDG', 'soundings', JSON.stringify({ type: 'Point', coordinates: [-8.8, 42.201] }), JSON.stringify({ depth: 1.2 }));
  index.prepare(
    'INSERT INTO enc_features_rtree(id, min_lon, max_lon, min_lat, max_lat) VALUES (?, ?, ?, ?, ?)',
  ).run(feature.lastInsertRowid, -8.8, -8.8, 42.201, 42.201);
  index.close();

  try {
    const registry = {
      list: () => [{ id: 'test', kind: 'vector', available: true }],
      mbtilesPath: () => mbtiles,
    } as unknown as ChartRegistryService;
    const result = new EncHazardService(registry).query({
      chartIds: ['test'],
      position: { latitude: 42.2, longitude: -8.8 },
      courseDeg: 0,
      speedMps: 2,
      draftM: 1.5,
      underKeelClearanceM: 0.5,
      safetyDepthM: 2,
      lookAheadMinutes: 6,
      corridorWidthM: 100,
    }) as {
      coverage: string;
      minDepthM: number;
      hazards: { features: unknown[] };
    };
    assert.equal(result.coverage, 'available');
    assert.equal(result.minDepthM, 1.2);
    assert.equal(result.hazards.features.length, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('reports unavailable rather than inferring safe water without an ENC index', () => {
  const registry = {
    list: () => [],
    mbtilesPath: () => null,
  } as unknown as ChartRegistryService;
  const result = new EncHazardService(registry).query({
    chartIds: [],
    position: { latitude: 42.2, longitude: -8.8 },
    courseDeg: 0,
    speedMps: 0,
    draftM: 1.5,
    underKeelClearanceM: 0.5,
    safetyDepthM: 2,
    lookAheadMinutes: 6,
    corridorWidthM: 100,
  }) as { coverage: string };
  assert.equal(result.coverage, 'unavailable');
});
