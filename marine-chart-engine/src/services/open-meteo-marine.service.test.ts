import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { OpenMeteoMarineService } from './open-meteo-marine.service.js';

test('builds and caches a marine grid while suppressing land samples', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-marine-'));
  let calls = 0;
  const fetcher: typeof fetch = async (input) => {
    calls += 1;
    const url = new URL(String(input));
    const latitude = url.searchParams.get('latitude')?.split(',') ?? [];
    assert.equal(url.searchParams.get('cell_selection'), 'nearest');
    assert.equal(url.searchParams.get('start_hour'), '2026-07-29T12:00');
    const locations = latitude.map((_, index) => ({
      latitude: 42.2,
      longitude: -8.8,
      elevation: index % 2 === 0 ? 0 : 120,
      hourly: {
        time: ['2026-07-29T12:00'],
        wave_height: [0.8],
        wave_direction: [300],
        wave_period: [7.5],
        wind_wave_height: [0.2],
        wind_wave_direction: [290],
        wind_wave_period: [4.5],
        swell_wave_height: [0.7],
        swell_wave_direction: [305],
        swell_wave_period: [8.5],
        swell_wave_peak_period: [9.2],
        ocean_current_velocity: [1.8],
        ocean_current_direction: [90],
        sea_surface_temperature: [19.5],
      },
    }));
    return new Response(JSON.stringify(locations), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const service = new OpenMeteoMarineService(
      directory,
      fetcher,
      () => Date.parse('2026-07-29T12:10:00Z'),
    );
    const first = await service.getField([-9, 42, -8.8, 42.2], '2026-07-29T12:35:00Z');
    const second = await service.getField([-9, 42, -8.8, 42.2], '2026-07-29T12:35:00Z');

    assert.equal(first.state, 'fresh');
    assert.equal(second.state, 'cached');
    assert.equal(calls, 1);
    assert.ok(first.samples.length > 0);
    assert.ok(first.samples.length < 16);
    assert.ok(first.samples.every((sample) => sample.waveHeight === 0.8));
    assert.ok(first.samples.every((sample) => sample.swellWaveHeight === 0.7));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
