import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { StorageQuotaService } from './storage-quota.service.js';

test('prunes expired and least-recently-used cache files without touching charts', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-storage-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cacheDir = path.join(root, 'cache');
  const dataDir = path.join(root, 'data');
  const oldTile = path.join(cacheDir, 'tiles', 'provider', '1.png');
  const chart = path.join(dataDir, 'charts', 'protected.mbtiles');
  await fs.mkdir(path.dirname(oldTile), { recursive: true });
  await fs.mkdir(path.dirname(chart), { recursive: true });
  await fs.writeFile(oldTile, Buffer.alloc(800));
  await fs.writeFile(chart, Buffer.alloc(800));
  await fs.utimes(oldTile, new Date(0), new Date(0));

  const service = new StorageQuotaService({
    cacheDir,
    dataDir,
    maxCacheBytes: 500,
    reserveBytes: 200,
    tileTtlDays: 1,
    now: () => Date.parse('2026-07-29T00:00:00Z'),
    statfs: () => ({ blocks: 1000, bavail: 100, bsize: 1 }),
  });
  const status = await service.prune();

  await assert.rejects(fs.stat(oldTile));
  assert.equal((await fs.stat(chart)).size, 800);
  assert.equal(status.categories.find((category) => category.id === 'tiles')?.usedBytes, 0);
});

test('removes orphan Copernicus frames but preserves the manifest and listed frame', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-storage-env-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const environment = path.join(root, 'data', 'environment');
  const waves = path.join(environment, 'waves');
  await fs.mkdir(waves, { recursive: true });
  const time = '2026-07-29T00:00:00Z';
  const listed = path.join(waves, '2026-07-29T00-00-00Z.geojson');
  const orphan = path.join(waves, '2026-07-20T00-00-00Z.geojson');
  await fs.writeFile(listed, '{}');
  await fs.writeFile(orphan, '{}');
  await fs.writeFile(path.join(environment, 'manifest.json'), JSON.stringify({ layers: { waves: [time] } }));

  const service = new StorageQuotaService({
    cacheDir: path.join(root, 'cache'),
    dataDir: path.join(root, 'data'),
    maxCacheBytes: 2_000,
    reserveBytes: 100,
    tileTtlDays: 30,
    statfs: () => ({ blocks: 10_000, bavail: 5_000, bsize: 1 }),
  });
  await service.prune();

  assert.equal((await fs.stat(listed)).size, 2);
  await assert.rejects(fs.stat(orphan));
  assert.equal((await fs.stat(path.join(environment, 'manifest.json'))).isFile(), true);
});
