import { spawn } from 'node:child_process';

export interface EnvironmentSyncStatus {
  enabled: boolean;
  running: boolean;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  nextAttemptAt?: string;
}

export class EnvironmentSyncService {
  private timer: NodeJS.Timeout | null = null;
  private failures = 0;
  private status: EnvironmentSyncStatus;

  constructor(
    private readonly enabled: boolean,
    private readonly intervalHours: number,
    private readonly pythonExecutable: string,
    private readonly scriptPath: string,
    private readonly onCompleted: () => void = () => {},
  ) {
    this.status = { enabled, running: false };
  }

  start(): void {
    if (!this.enabled || this.timer) return;
    this.schedule(5_000);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  snapshot(): EnvironmentSyncStatus {
    return { ...this.status };
  }

  async runNow(): Promise<EnvironmentSyncStatus> {
    if (!this.enabled) throw new Error('Copernicus synchronization is disabled');
    if (this.status.running) return this.snapshot();
    this.status = { ...this.status, running: true, lastStartedAt: new Date().toISOString(), lastError: undefined };
    try {
      await this.runProcess();
      this.failures = 0;
      this.status = { ...this.status, running: false, lastCompletedAt: new Date().toISOString(), lastError: undefined };
      this.onCompleted();
      this.schedule(this.intervalHours * 60 * 60 * 1000);
    } catch (error) {
      this.failures += 1;
      const retryMs = Math.min(this.intervalHours * 60 * 60 * 1000, 5 * 60 * 1000 * 2 ** (this.failures - 1));
      this.status = { ...this.status, running: false, lastError: error instanceof Error ? error.message : String(error) };
      this.schedule(retryMs);
    }
    return this.snapshot();
  }

  private schedule(delayMs: number): void {
    if (!this.enabled) return;
    if (this.timer) clearTimeout(this.timer);
    this.status = { ...this.status, nextAttemptAt: new Date(Date.now() + delayMs).toISOString() };
    this.timer = setTimeout(() => void this.runNow(), delayMs);
    this.timer.unref();
  }

  private runProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonExecutable, [this.scriptPath], { shell: false, stdio: ['ignore', 'ignore', 'pipe'], env: process.env });
      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString('utf8')}`.slice(-4000); });
      child.once('error', reject);
      child.once('exit', (code) => code === 0
        ? resolve()
        : reject(new Error(formatSyncError(stderr, code))));
    });
  }
}

const formatSyncError = (stderr: string, code: number | null): string => {
  if (/requires a Copernicus Marine username and password|Authenticate once with/i.test(stderr)) {
    return 'Copernicus authentication required. Run `marine-chart-engine/.venv/Scripts/copernicusmarine login` once, then use Sync now.';
  }
  const runtimeError = [...stderr.matchAll(/(?:RuntimeError|Error):\s*(.+)$/gmi)].at(-1)?.[1]?.trim();
  return runtimeError || `Copernicus sync exited with code ${code ?? 'unknown'}`;
};
