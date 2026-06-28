#!/usr/bin/env node
/**
 * OMI — Generic cross-platform sensor launcher
 * Replaces individual start-*-cross-platform.mjs scripts
 *
 * Usage: node scripts/start-sensor-cross-platform.mjs <sensor>
 *   sensor: ais | imu | gps | wind | autopilot
 */
import { platform } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

const VALID_SENSORS = ['ais', 'imu', 'gps', 'wind', 'autopilot'];

const sensor = process.argv[2];

if (!sensor || !VALID_SENSORS.includes(sensor)) {
  console.error(`Usage: node scripts/start-sensor-cross-platform.mjs <${VALID_SENSORS.join('|')}>`);
  process.exit(1);
}

const isWin = platform() === 'win32';
const ext = isWin ? '.ps1' : '.sh';
const scriptPath = join(projectRoot, 'scripts', `start-${sensor}${ext}`);

const args = isWin
  ? ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...process.argv.slice(3)]
  : [scriptPath, ...process.argv.slice(3)];

const cmd = isWin ? 'powershell.exe' : 'bash';

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: false,
  cwd: projectRoot,
});

child.on('error', (err) => {
  console.error(`[OMI] Failed to start ${sensor} launcher:`, err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
