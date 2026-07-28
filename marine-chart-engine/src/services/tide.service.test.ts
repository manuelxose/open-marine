import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseIhmTideResponse, TideService } from './tide.service.js';

const responseBody = `Datos de Marea\nid: 29\npuerto: Vigo\nlat: 42.240000\nlon: -8.730000\nfecha: 2026-10-25\ndatos: 4\nhora altura tipo\n02:33 1.268 bajamar\n08:55 2.737 pleamar\n15:01 1.387 bajamar\n21:21 2.700 pleamar`;

test('parseIhmTideResponse maps Vigo extrema and heights', () => {
  const parsed = parseIhmTideResponse(`Datos de Marea\nid: 29\npuerto: Vigo\nlat: 42.240000\nlon: -8.730000\nfecha: 2026-07-22\ndatos: 4\nhora altura tipo\n02:33 1.268 bajamar\n08:55 2.737 pleamar\n15:01 1.387 bajamar\n21:21 2.700 pleamar`);
  assert.equal(parsed.portId, 29);
  assert.equal(parsed.events.length, 4);
  assert.deepEqual(parsed.events[1], { time: '08:55', heightMeters: 2.737, type: 'high' });
});

test('parseIhmTideResponse rejects an empty upstream response', () => {
  assert.throws(() => parseIhmTideResponse('service unavailable'), /missing lat|no tide events/);
});

test('TideService keeps IHM times in Europe/Madrid across the DST transition', async (t) => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-tides-'));
  t.after(() => fs.rm(cacheDir, { recursive: true, force: true }));
  let requestedUrl = '';
  const service = new TideService(cacheDir, (async (url: string | URL | Request) => {
    requestedUrl = String(url);
    return new Response(responseBody, { status: 200 });
  }) as typeof fetch);

  const day = await service.getVigo('2026-10-25');
  assert.match(requestedUrl, /date=20261025/);
  assert.equal(day.timezone, 'Europe/Madrid');
  assert.equal(day.events[0]?.time, '02:33');
  assert.equal(day.state, 'forecast');
});

test('TideService returns stale cache when IHM fails', async (t) => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-tides-'));
  t.after(() => fs.rm(cacheDir, { recursive: true, force: true }));
  const tideDir = path.join(cacheDir, 'tides');
  await fs.mkdir(tideDir, { recursive: true });
  await fs.writeFile(path.join(tideDir, 'vigo-2026-07-22.json'), JSON.stringify({
    ...parseIhmTideResponse(responseBody.replace('2026-10-25', '2026-07-22')),
    timezone: 'Europe/Madrid', state: 'forecast', fetchedAt: '2020-01-01T00:00:00.000Z', ageSeconds: 0,
    attribution: 'Instituto Hidrografico de la Marina (IHM)',
  }));
  const service = new TideService(cacheDir, (async () => new Response('down', { status: 503 })) as typeof fetch);

  const day = await service.getVigo('2026-07-22');
  assert.equal(day.state, 'stale');
  assert.ok(day.ageSeconds > 0);
});
