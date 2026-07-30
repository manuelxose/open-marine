import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { WindFieldService } from './wind-field.service.js';

const windPayload = [
  {
    latitude: 42.2,
    longitude: -8.8,
    current: {
      time: '2026-07-28T12:00',
      wind_speed_10m: 12,
      wind_direction_10m: 270,
      wind_gusts_10m: 18,
    },
  },
  {
    latitude: 42.3,
    longitude: -8.6,
    current: {
      time: '2026-07-28T12:00',
      wind_speed_10m: 7,
      wind_direction_10m: 90,
      wind_gusts_10m: 10,
    },
  },
];

const windResponseFor = (input: string | URL | Request): Response => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
  const latitudes = (url.searchParams.get('latitude') ?? '').split(',').map(Number);
  const longitudes = (url.searchParams.get('longitude') ?? '').split(',').map(Number);
  return new Response(JSON.stringify(latitudes.map((latitude, index) => ({
    latitude,
    longitude: longitudes[index],
    current: {
      time: '2026-07-28T12:00',
      wind_speed_10m: 12,
      wind_direction_10m: 270,
      wind_gusts_10m: 18,
    },
  }))), { status: 200 });
};

test('builds a graphical wind field with flow direction and caches it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-wind-field-'));
  let calls = 0;
  const fetcher: typeof fetch = async (input) => {
    calls++;
    return windResponseFor(input);
  };
  const service = new WindFieldService(dir, fetcher, () => Date.parse('2026-07-28T12:00:00Z'));

  const fresh = await service.getField();
  const cached = await service.getField();

  assert.equal(calls, 9);
  assert.ok(fresh.features.length >= 400);
  assert.equal(fresh.properties.grid.columns, 28);
  assert.ok(fresh.properties.grid.approximateSpacingKm <= 2.8);
  assert.equal(fresh.features[0]?.properties.flowDirectionDeg, 90);
  assert.equal(fresh.features[0]?.properties.speedKnots, 12);
  assert.equal(cached.properties.state, 'cached');
});

test('returns a stale graphical wind field when the provider is temporarily unavailable', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-wind-field-'));
  let now = Date.parse('2026-07-28T12:00:00Z');
  const ok: typeof fetch = async (input) => windResponseFor(input);
  await new WindFieldService(dir, ok, () => now).getField();
  now += 16 * 60 * 1000;
  const failing: typeof fetch = async () => new Response('unavailable', { status: 503 });

  const stale = await new WindFieldService(dir, failing, () => now).getField();

  assert.equal(stale.properties.state, 'stale');
  assert.ok(stale.features.length >= 150);
});

test('uses separate cached adaptive grids for selected weather areas', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-wind-field-area-'));
  let calls = 0;
  const fetcher: typeof fetch = async (input) => {
    calls++;
    return windResponseFor(input);
  };
  const service = new WindFieldService(dir, fetcher, () => Date.parse('2026-07-28T12:00:00Z'));
  const area: [-9.4, 43.1, -8.9, 43.45] = [-9.4, 43.1, -8.9, 43.45];

  const first = await service.getField(false, area);
  const callsAfterFirst = calls;
  const second = await service.getField(false, area);

  assert.deepEqual(first.properties.bounds, area);
  assert.equal(second.properties.state, 'cached');
  assert.equal(calls, callsAfterFirst);
  assert.ok(first.properties.grid.pointCount > 50);
});

test('rejects an oversized weather area before calling the provider', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-wind-field-limit-'));
  let called = false;
  const fetcher: typeof fetch = async () => {
    called = true;
    return new Response(JSON.stringify(windPayload), { status: 200 });
  };
  const service = new WindFieldService(dir, fetcher);

  await assert.rejects(
    service.getField(false, [-20, 30, 5, 50]),
    /too large/,
  );
  assert.equal(called, false);
});
