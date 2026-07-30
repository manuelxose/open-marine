import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { ChartRegistryService } from './chart-registry.service.js';
import { MarineGeometryService } from './marine-geometry.service.js';

test('prefers ENC depth areas, removes ENC land and clips to the selected zone', (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.directory, { recursive: true, force: true }));
  insertFeature(fixture.index, 'DEPARE', 'depth_areas', polygon(0, 0, 10, 10), { drval1: 0, drval2: 20 });
  insertFeature(fixture.index, 'LNDARE', 'land', polygon(4, 4, 6, 6), {});

  const mask = fixture.service.marineMask(
    [0, 0, 10, 10],
    JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [5, 0], [5, 10], [0, 10], [0, 0]]] }),
    [],
  );

  assert.equal(mask.properties.source, 'enc');
  assert.equal(mask.properties.coverage, 'available');
  assert.deepEqual(mask.properties.chartIds, ['enc-test']);
  const clippedLandCell = fixture.service.clipCellToMask(
    [[4.2, 4.2], [5.8, 4.2], [5.8, 5.8], [4.2, 5.8], [4.2, 4.2]],
    mask,
  );
  assert.equal(clippedLandCell, null);
});

test('uses the coastal fallback without claiming ENC coverage', (context) => {
  const fixture = createFixture(false);
  context.after(() => fs.rmSync(fixture.directory, { recursive: true, force: true }));
  const mask = fixture.service.marineMask([0, 0, 5, 5], null, []);
  assert.equal(mask.properties.source, 'official-coast');
  assert.equal(mask.properties.coverage, 'fallback');
  assert.equal(mask.properties.advisoryOnly, true);
  assert.equal(mask.features.length, 1);
});

test('global fallback removes inland points and keeps offshore points', (context) => {
  const fixture = createFixture(false);
  context.after(() => fs.rmSync(fixture.directory, { recursive: true, force: true }));
  const missingFallback = path.join(fixture.directory, 'missing.geojson');
  const service = new MarineGeometryService({
    list: () => [],
    mbtilesPath: () => null,
  } as unknown as ChartRegistryService, missingFallback);

  const inlandMask = service.marineMask([-3.8, 40.35, -3.6, 40.55], null, []);
  const inland = service.filterPointsToMask([
    { geometry: { type: 'Point', coordinates: [-3.7, 40.45] as [number, number] } },
  ], inlandMask);
  const offshoreMask = service.marineMask([-20, 35, -19, 36], null, []);
  const offshore = service.filterPointsToMask([
    { geometry: { type: 'Point', coordinates: [-19.5, 35.5] as [number, number] } },
  ], offshoreMask);

  assert.equal(inlandMask.properties.source, 'global-fallback');
  assert.equal(inland.length, 0);
  assert.equal(offshore.length, 1);
});

test('depth overlay evaluates DEPARE conservatively with DRVAL1 and respects SCAMIN', (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.directory, { recursive: true, force: true }));
  insertFeature(fixture.index, 'DEPARE', 'depth_areas', polygon(0, 0, 10, 10), {
    drval1: 3,
    drval2: 12,
    scamin: 50000,
    catzoc: 3,
  });
  insertFeature(fixture.index, 'SOUNDG', 'soundings', {
    type: 'Point',
    coordinates: [2, 2, 4.2],
  }, { depth: 4.2, scamin: 50000 });
  insertFeature(fixture.index, 'M_QUAL', 'data_quality', polygon(0, 0, 10, 10), {
    catzoc: 3,
    inform: 'SCALE OF SURVEY 1:10000',
  });

  const overlay = fixture.service.depthOverlay([0, 0, 10, 10], null, [], 5, 14);
  const area = overlay.features.find((feature) => feature.properties['featureType'] === 'depthArea');
  assert.equal(overlay.properties.coverage, 'available');
  assert.equal(area?.properties['unsafe'], true);
  assert.equal(area?.properties['shallowestDepth'], 3);
  assert.equal(area?.properties['deepestDepth'], 12);
  assert.equal(area?.properties['catzoc'], 3);
  assert.equal(overlay.features.some((feature) => feature.properties['featureType'] === 'sounding'), true);
});

const createFixture = (withEnc = true) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'omi-marine-geometry-'));
  const mbtiles = path.join(directory, 'enc-test.mbtiles');
  fs.writeFileSync(mbtiles, '');
  const index = `${mbtiles}.enc-index.sqlite`;
  createIndex(index);
  const fallback = path.join(directory, 'fallback.geojson');
  fs.writeFileSync(fallback, JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: polygon(0, 0, 10, 10), properties: {} }],
  }));
  const registry = {
    list: () => withEnc
      ? [{ id: 'enc-test', kind: 'vector', available: true }]
      : [],
    mbtilesPath: (chartId: string) => chartId === 'enc-test' ? mbtiles : null,
  } as unknown as ChartRegistryService;
  return {
    directory,
    index,
    service: new MarineGeometryService(registry, fallback),
  };
};

const createIndex = (file: string): void => {
  const database = new Database(file);
  database.exec(`
    CREATE TABLE enc_features (
      id INTEGER PRIMARY KEY,
      object_class TEXT NOT NULL,
      layer TEXT NOT NULL,
      geometry_json TEXT NOT NULL,
      properties_json TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE enc_features_rtree USING rtree(id, min_lon, max_lon, min_lat, max_lat);
  `);
  database.close();
};

const insertFeature = (
  file: string,
  objectClass: string,
  layer: string,
  geometry: Record<string, unknown>,
  properties: Record<string, unknown>,
): void => {
  const database = new Database(file);
  const inserted = database.prepare(
    'INSERT INTO enc_features(object_class, layer, geometry_json, properties_json) VALUES (?, ?, ?, ?)',
  ).run(objectClass, layer, JSON.stringify(geometry), JSON.stringify(properties));
  const positions = flatten(geometry['coordinates']);
  database.prepare(
    'INSERT INTO enc_features_rtree(id, min_lon, max_lon, min_lat, max_lat) VALUES (?, ?, ?, ?, ?)',
  ).run(
    inserted.lastInsertRowid,
    Math.min(...positions.map((point) => point[0])),
    Math.max(...positions.map((point) => point[0])),
    Math.min(...positions.map((point) => point[1])),
    Math.max(...positions.map((point) => point[1])),
  );
  database.close();
};

const polygon = (west: number, south: number, east: number, north: number) => ({
  type: 'Polygon',
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

const flatten = (value: unknown): number[][] => {
  if (!Array.isArray(value)) return [];
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') return [value];
  return value.flatMap(flatten);
};
