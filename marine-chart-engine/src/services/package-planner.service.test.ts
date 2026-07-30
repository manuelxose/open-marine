import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PackagePlannerService } from './package-planner.service.js';
import { rectangleGeometry } from './area-geometry.js';

test('recommended Vigo plan prioritizes licensed IHM ENC and legal supplements', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'omi-package-plan-'));
  try {
    const plan = new PackagePlannerService(temporary).createPlan({
      name: 'Ria de Vigo',
      geometry: rectangleGeometry([-9.05, 42.05, -8.4, 42.4]),
      profile: 'recommended',
      storageBudgetBytes: 5 * 1024 ** 3,
    });
    assert.equal(plan.layers[0]?.providerId, 'ihm-s63');
    assert.equal(plan.layers[0]?.required, true);
    assert.equal(plan.layers.some((layer) => layer.providerId === 'emodnet-bathymetry' && layer.acquisition === 'automatic'), true);
    assert.equal(plan.layers.some((layer) => layer.providerId === 'cnig-bathymetry'), true);
    assert.equal(plan.layers.some((layer) => layer.providerId === 'openseamap' && layer.acquisition === 'automatic'), false);
    assert.equal(plan.warnings.some((warning) => /licensed IHM/i.test(warning)), true);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('global plan uses GEBCO as manual non-navigation fallback', () => {
  const plan = new PackagePlannerService(process.cwd()).createPlan({
    name: 'Pacific test',
    geometry: rectangleGeometry([150, -20, 151, -19]),
  });
  const gebco = plan.layers.find((layer) => layer.providerId === 'gebco');
  assert.equal(gebco?.acquisition, 'manual-import');
  assert.equal(gebco?.navigationUse, 'not-for-navigation');
});

