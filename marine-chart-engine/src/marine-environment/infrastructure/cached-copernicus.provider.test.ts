import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CachedCopernicusProvider } from './cached-copernicus.provider.js';

test('interpolates cached wave frames in time and preserves swell partitions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'omi-copernicus-'));
  const environment = path.join(root, 'environment');
  const waves = path.join(environment, 'waves');
  await fs.mkdir(waves, { recursive: true });
  const before = '2026-07-29T12:00:00.000Z';
  const after = '2026-07-29T13:00:00.000Z';
  await fs.writeFile(path.join(environment, 'manifest.json'), JSON.stringify({
    updatedAt: before,
    layers: { waves: [before, after] },
  }));
  const writeFrame = async (
    time: string,
    properties: Record<string, unknown>,
  ): Promise<void> => fs.writeFile(
    path.join(waves, `${time.replaceAll(':', '-')}.geojson`),
    JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-8.81, 42.19], [-8.79, 42.19], [-8.79, 42.21], [-8.81, 42.21], [-8.81, 42.19]]],
        },
        properties: { featureType: 'cell', interpolated: false, ...properties },
      }],
    }),
  );
  await writeFrame(before, {
    significantHeight: 1,
    directionFrom: 350,
    primarySwellHeight: 0.5,
    primarySwellDirectionFrom: 350,
    stokesU: 0.1,
  });
  await writeFrame(after, {
    significantHeight: 3,
    directionFrom: 10,
    primarySwellHeight: 1.5,
    primarySwellDirectionFrom: 10,
    stokesU: 0.3,
  });

  try {
    const field = await new CachedCopernicusProvider('waves', root).getField({
      variable: 'waves',
      bbox: [-8.9, 42.1, -8.7, 42.3],
      time: '2026-07-29T12:30:00.000Z',
      source: 'auto',
      currentConditions: false,
    });
    assert.equal(field.metadata.temporalInterpolation?.weight, 0.5);
    assert.equal(field.dataGrid.components['significantHeight']?.[0], 2);
    assert.equal(field.dataGrid.components['primarySwellHeight']?.[0], 1);
    assert.equal(field.dataGrid.components['stokesU']?.[0], 0.2);
    assert.ok((field.dataGrid.components['directionFrom']?.[0] ?? 999) < 0.001);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
