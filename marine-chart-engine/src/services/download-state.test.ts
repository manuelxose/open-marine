import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DownloadStateService,
  deriveRemoteChartStatus,
  type DownloadedChartRecord,
} from './download-state.service.js';

const makeRecord = (overrides: Partial<DownloadedChartRecord> = {}): DownloadedChartRecord => ({
  chartId: 'noaa-us5example',
  providerId: 'noaa-enc',
  localChartId: 'noaa-us5example',
  label: 'US5EXAMPLE',
  format: 's57',
  downloadedAt: '2026-01-01T00:00:00Z',
  status: 'available',
  ...overrides,
});

test('DownloadStateService round-trips records through disk', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omi-dlstate-'));
  const file = path.join(dir, 'downloads.local.json');
  const service = new DownloadStateService(file);

  assert.deepEqual(service.list(), []);
  await service.upsert(makeRecord());
  assert.equal(service.get('noaa-us5example')?.status, 'available');

  await service.patch('noaa-us5example', { status: 'outdated' });
  assert.equal(service.get('noaa-us5example')?.status, 'outdated');

  // A fresh instance reads what was persisted.
  assert.equal(new DownloadStateService(file).get('noaa-us5example')?.status, 'outdated');

  assert.equal(await service.delete('noaa-us5example'), true);
  assert.equal(service.get('noaa-us5example'), null);
});

test('deriveRemoteChartStatus computes new/installed/outdated/online-only', () => {
  assert.equal(
    deriveRemoteChartStatus(null, { downloadable: true }),
    'new',
  );
  assert.equal(
    deriveRemoteChartStatus(null, { downloadable: false }),
    'online-only',
  );
  assert.equal(
    deriveRemoteChartStatus(makeRecord({ remoteLastUpdated: '2026-01-01T00:00:00Z' }), {
      downloadable: true,
      lastUpdated: '2026-01-01T00:00:00Z',
    }),
    'installed',
  );
  assert.equal(
    deriveRemoteChartStatus(makeRecord({ remoteLastUpdated: '2026-01-01T00:00:00Z' }), {
      downloadable: true,
      lastUpdated: '2026-02-01T00:00:00Z',
    }),
    'outdated',
  );
  assert.equal(
    deriveRemoteChartStatus(makeRecord({ status: 'failed' }), { downloadable: true }),
    'failed',
  );
});
