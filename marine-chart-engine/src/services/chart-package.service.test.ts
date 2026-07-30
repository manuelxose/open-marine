import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { DownloadManager } from '../download/download-manager.js';
import type { ChartJobService } from './chart-job.service.js';
import type { ChartRegistryService } from './chart-registry.service.js';
import { ChartPackageService } from './chart-package.service.js';
import { PackagePlannerService } from './package-planner.service.js';
import { rectangleGeometry } from './area-geometry.js';

test('persists package manifests and reconciles automatic layer jobs', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'omi-packages-'));
  try {
    const fakeDownloadManager = {
      enqueueAreaDownload: (request: { id: string; label: string }) => ({
        id: 'job-emodnet',
        kind: 'area-download',
        status: 'queued',
        chartId: request.id,
        label: request.label,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      cancel: () => true,
    } as unknown as DownloadManager;
    const fakeJobs = {
      get: (id: string) => id === 'job-emodnet'
        ? {
            id,
            kind: 'area-download',
            status: 'completed',
            chartId: 'package-emodnet',
            label: 'EMODnet',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null,
    } as unknown as ChartJobService;
    const service = new ChartPackageService(
      path.join(temporary, 'packages.local.json'),
      fakeDownloadManager,
      fakeJobs,
      {
        get: () => null,
      } as unknown as ChartRegistryService,
    );
    const plan = new PackagePlannerService(temporary).createPlan({
      name: 'Vigo package',
      geometry: rectangleGeometry([-9.05, 42.05, -8.4, 42.4]),
    });
    service.rememberPlan(plan);
    const created = await service.create(plan.id);
    assert.equal(created.state, 'incomplete');
    const persisted = service.get(plan.id);
    assert.equal(persisted?.layers.find((layer) => layer.providerId === 'emodnet-bathymetry')?.state, 'ready');
    assert.equal(persisted?.state, 'incomplete');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
