import { Router } from 'express';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';
import type { EnvironmentSyncService } from '../services/environment-sync.service.js';

export const createHealthRouter = (dependencies?: {
  xyz: XyzProxyService;
  wms: WmsProxyService;
  environmentSync: EnvironmentSyncService;
  weatherConfigured: boolean;
}): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'marine-chart-engine',
      supportsEncryptedCharts: false,
    });
  });

  router.get('/diagnostics', (_req, res) => {
    res.json({
      status: 'ok',
      weatherConfigured: dependencies?.weatherConfigured ?? false,
      environmentSync: dependencies?.environmentSync.snapshot() ?? { enabled: false, running: false },
      xyzProviders: dependencies?.xyz.diagnostics() ?? [],
      wmsProviders: dependencies?.wms.diagnostics() ?? [],
    });
  });

  return router;
};
