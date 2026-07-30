import path from 'node:path';
import { config } from '../config.js';
import { InstallationDiagnosticsService } from '../services/installation-diagnostics.service.js';

const diagnostics = new InstallationDiagnosticsService(
  config.dataDir,
  path.join(config.dataDir, 'secure', 's63-installation.json'),
);

console.log(JSON.stringify(await diagnostics.inspect(), null, 2));

