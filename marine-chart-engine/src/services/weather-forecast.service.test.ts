import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { WeatherForecastService } from './weather-forecast.service.js';

const payload = { latitude: 42.24, longitude: -8.72, current: { temperature_2m: 20 } };

test('caches successful forecasts and coalesces requests for the same position', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-weather-'));
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    await Promise.resolve();
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  const service = new WeatherForecastService(dir, fetcher, () => Date.parse('2026-07-28T10:00:00Z'));
  const [first, second] = await Promise.all([
    service.getForecast(42.2401, -8.7201),
    service.getForecast(42.2402, -8.7202),
  ]);
  assert.equal(calls, 1);
  assert.equal(first.state, 'fresh');
  assert.equal(second.state, 'fresh');
  assert.equal((await service.getForecast(42.24, -8.72)).state, 'cached');
});

test('returns stale cache when Open-Meteo is unavailable for less than 24 hours', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-weather-'));
  let now = Date.parse('2026-07-28T10:00:00Z');
  const ok: typeof fetch = async () => new Response(JSON.stringify(payload), { status: 200 });
  const service = new WeatherForecastService(dir, ok, () => now);
  await service.getForecast(42.24, -8.72);
  now += 16 * 60 * 1000;
  const failing: typeof fetch = async () => new Response('unavailable', { status: 503 });
  const offlineService = new WeatherForecastService(dir, failing, () => now);
  const result = await offlineService.getForecast(42.24, -8.72);
  assert.equal(result.state, 'stale');
  assert.equal(result.ageSeconds, 16 * 60);
});

test('fails cleanly without a reusable cache', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-weather-'));
  const failing: typeof fetch = async () => new Response('unavailable', { status: 503 });
  const service = new WeatherForecastService(dir, failing);
  await assert.rejects(
    service.getForecast(42.24, -8.72),
    /Weather upstream unavailable: Open-Meteo returned 503/,
  );
});

test('refresh bypasses a fresh cache', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-weather-'));
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ ...payload, sequence: calls }), { status: 200 });
  };
  const service = new WeatherForecastService(dir, fetcher);
  await service.getForecast(42.24, -8.72);
  const refreshed = await service.getForecast(42.24, -8.72, true);
  assert.equal(calls, 2);
  assert.equal(refreshed.state, 'fresh');
});

test('does not reuse cache older than 24 hours', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-weather-'));
  let now = Date.parse('2026-07-28T10:00:00Z');
  const ok: typeof fetch = async () => new Response(JSON.stringify(payload), { status: 200 });
  await new WeatherForecastService(dir, ok, () => now).getForecast(42.24, -8.72);
  now += 25 * 60 * 60 * 1000;
  const failing: typeof fetch = async () => new Response('unavailable', { status: 503 });
  await assert.rejects(
    new WeatherForecastService(dir, failing, () => now).getForecast(42.24, -8.72),
    /Weather upstream unavailable/,
  );
});
