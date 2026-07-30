import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const HOUR_MS = 60 * 60 * 1000;
const WRITE_PRUNE_MIN_INTERVAL_MS = 60 * 1000;

export interface StorageCategoryStatus {
  id: 'tiles' | 'weather' | 'environment';
  usedBytes: number;
  fileCount: number;
}

export interface StorageStatus {
  totalBytes: number;
  availableBytes: number;
  reserveBytes: number;
  quotaBytes: number;
  evictableUsedBytes: number;
  pressure: boolean;
  categories: StorageCategoryStatus[];
  lastPrunedAt?: string;
  lastFreedBytes?: number;
}

interface StorageFile {
  file: string;
  category: StorageCategoryStatus['id'];
  size: number;
  mtimeMs: number;
  expired: boolean;
  pressureCandidate: boolean;
}

interface StorageQuotaOptions {
  cacheDir: string;
  dataDir: string;
  maxCacheBytes: number;
  reserveBytes: number;
  tileTtlDays: number;
  now?: () => number;
  statfs?: (target: string) => { blocks: number | bigint; bavail: number | bigint; bsize: number | bigint };
}

export class StorageQuotaService {
  private timer: NodeJS.Timeout | null = null;
  private scheduled: NodeJS.Timeout | null = null;
  private running: Promise<StorageStatus> | null = null;
  private lastPrunedAt: string | undefined;
  private lastFreedBytes = 0;
  private lastRunAt = 0;

  constructor(private readonly options: StorageQuotaOptions) {}

  start(): void {
    if (this.timer) return;
    void this.prune();
    this.timer = setInterval(() => void this.prune(), 15 * 60 * 1000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.scheduled) clearTimeout(this.scheduled);
    this.scheduled = null;
  }

  schedulePrune(): void {
    if (this.scheduled || this.now() - this.lastRunAt < WRITE_PRUNE_MIN_INTERVAL_MS) return;
    this.scheduled = setTimeout(() => {
      this.scheduled = null;
      void this.prune();
    }, 1_000);
    this.scheduled.unref();
  }

  async inspect(): Promise<StorageStatus> {
    return this.buildStatus(await this.collectFiles());
  }

  async prune(): Promise<StorageStatus> {
    if (this.running) return this.running;
    this.running = this.runPrune().finally(() => { this.running = null; });
    return this.running;
  }

  private async runPrune(): Promise<StorageStatus> {
    let files = await this.collectFiles();
    let status = this.buildStatus(files);
    let bytesToFree = Math.max(
      0,
      status.evictableUsedBytes - status.quotaBytes,
      status.reserveBytes - status.availableBytes,
    );
    let freed = 0;
    const candidates = files
      .filter((entry) => entry.expired || (bytesToFree > 0 && entry.pressureCandidate))
      .sort((left, right) =>
        Number(right.expired) - Number(left.expired) || left.mtimeMs - right.mtimeMs);
    for (const entry of candidates) {
      if (!entry.expired && freed >= bytesToFree) break;
      if (await fs.rm(entry.file, { force: true }).then(() => true).catch(() => false)) {
        freed += entry.size;
      }
    }
    if (freed > 0) await this.reconcileEnvironmentManifest();
    this.lastFreedBytes = freed;
    this.lastRunAt = this.now();
    this.lastPrunedAt = new Date(this.now()).toISOString();
    files = await this.collectFiles();
    status = this.buildStatus(files);
    return status;
  }

  private buildStatus(files: StorageFile[]): StorageStatus {
    const disk = this.options.statfs?.(this.options.dataDir) ?? fsSync.statfsSync(this.options.dataDir);
    const totalBytes = Number(disk.blocks) * Number(disk.bsize);
    const availableBytes = Number(disk.bavail) * Number(disk.bsize);
    const quotaBytes = Math.min(this.options.maxCacheBytes, Math.floor(totalBytes * 0.1));
    const categories = (['tiles', 'weather', 'environment'] as const).map((id) => {
      const categoryFiles = files.filter((entry) => entry.category === id);
      return {
        id,
        usedBytes: categoryFiles.reduce((sum, entry) => sum + entry.size, 0),
        fileCount: categoryFiles.length,
      };
    });
    const evictableUsedBytes = categories.reduce((sum, category) => sum + category.usedBytes, 0);
    return {
      totalBytes,
      availableBytes,
      reserveBytes: this.options.reserveBytes,
      quotaBytes,
      evictableUsedBytes,
      pressure: availableBytes < this.options.reserveBytes || evictableUsedBytes > quotaBytes,
      categories,
      ...(this.lastPrunedAt ? { lastPrunedAt: this.lastPrunedAt } : {}),
      ...(this.lastPrunedAt ? { lastFreedBytes: this.lastFreedBytes } : {}),
    };
  }

  private async collectFiles(): Promise<StorageFile[]> {
    const now = this.now();
    const manifest = await this.readManifest();
    const listedFrames = new Map<string, number>();
    for (const [layer, times] of Object.entries(manifest.layers)) {
      for (const [index, time] of times.entries()) {
        listedFrames.set(
          path.resolve(this.options.dataDir, 'environment', layer, `${time.replaceAll(':', '-')}.geojson`),
          index,
        );
      }
    }
    const files: StorageFile[] = [];
    await this.walk(path.join(this.options.cacheDir, 'tiles'), async (file, stat) => {
      files.push({
        file,
        category: 'tiles',
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        expired: now - stat.mtimeMs > this.options.tileTtlDays * 24 * HOUR_MS,
        pressureCandidate: true,
      });
    });
    for (const weatherDir of [path.join(this.options.cacheDir, 'weather'), path.join(this.options.cacheDir, 'tides')]) {
      await this.walk(weatherDir, async (file, stat) => {
        files.push({
          file,
          category: 'weather',
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          expired: now - stat.mtimeMs > 24 * HOUR_MS || file.endsWith('.tmp'),
          pressureCandidate: true,
        });
      });
    }
    await this.walk(path.join(this.options.dataDir, 'environment'), async (file, stat) => {
      if (path.basename(file) === 'manifest.json') return;
      const resolved = path.resolve(file);
      const listedIndex = listedFrames.get(resolved);
      const raw = resolved.includes(`${path.sep}raw${path.sep}`);
      files.push({
        file,
        category: 'environment',
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        expired: file.endsWith('.tmp') || (!raw && file.endsWith('.geojson') && listedIndex === undefined),
        pressureCandidate: raw ? now - stat.mtimeMs > 6 * HOUR_MS : listedIndex !== undefined && listedIndex >= 12,
      });
    });
    return files;
  }

  private async walk(
    root: string,
    visit: (file: string, stat: { size: number; mtimeMs: number }) => Promise<void>,
  ): Promise<void> {
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const target = path.join(root, entry.name);
      if (entry.isDirectory()) await this.walk(target, visit);
      else if (entry.isFile()) {
        const stat = await fs.stat(target).catch(() => null);
        if (stat) await visit(target, stat);
      }
    }
  }

  private async readManifest(): Promise<{ layers: Record<string, string[]> }> {
    try {
      const parsed = JSON.parse(await fs.readFile(
        path.join(this.options.dataDir, 'environment', 'manifest.json'),
        'utf8',
      )) as { layers?: Record<string, string[]> };
      return { layers: parsed.layers ?? {} };
    } catch {
      return { layers: {} };
    }
  }

  private async reconcileEnvironmentManifest(): Promise<void> {
    const manifestFile = path.join(this.options.dataDir, 'environment', 'manifest.json');
    try {
      const parsed = JSON.parse(await fs.readFile(manifestFile, 'utf8')) as {
        updatedAt?: string;
        layers?: Record<string, string[]>;
      };
      if (!parsed.layers) return;
      for (const [layer, times] of Object.entries(parsed.layers)) {
        const existing: string[] = [];
        for (const time of times) {
          const file = path.join(this.options.dataDir, 'environment', layer, `${time.replaceAll(':', '-')}.geojson`);
          if (await fs.stat(file).then(() => true).catch(() => false)) existing.push(time);
        }
        parsed.layers[layer] = existing;
      }
      const temporary = `${manifestFile}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(parsed, null, 2), 'utf8');
      await fs.rename(temporary, manifestFile);
    } catch {
      // Missing or concurrently replaced manifests are left untouched.
    }
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
