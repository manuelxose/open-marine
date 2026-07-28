import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

export type DownloadedChartFormat = 's57' | 'mbtiles' | 'geotiff' | 'wms-cache' | 'xyz-cache';

export type DownloadedChartStatus = 'available' | 'failed' | 'outdated';

export interface DownloadedChartRecord {
  chartId: string;
  providerId: string;
  localChartId: string;
  label: string;
  format: DownloadedChartFormat;
  sourceUrl?: string;
  bounds?: [number, number, number, number];
  sizeBytes?: number;
  remoteLastUpdated?: string;
  downloadedAt: string;
  convertedAt?: string;
  status: DownloadedChartStatus;
}

interface DownloadStateFile {
  version: 1;
  downloads: DownloadedChartRecord[];
}

/**
 * Persists the state of downloaded/converted charts to downloads.local.json,
 * mirroring ChartRegistryService. Used to derive UI status: new / installed /
 * outdated / failed / online-only.
 */
export class DownloadStateService {
  constructor(private readonly stateFile: string) {}

  list(): DownloadedChartRecord[] {
    return this.read().downloads;
  }

  get(chartId: string): DownloadedChartRecord | null {
    return this.read().downloads.find((record) => record.chartId === chartId) ?? null;
  }

  async upsert(record: DownloadedChartRecord): Promise<DownloadedChartRecord> {
    const state = this.read();
    const index = state.downloads.findIndex((entry) => entry.chartId === record.chartId);
    if (index >= 0) {
      state.downloads[index] = record;
    } else {
      state.downloads.push(record);
    }
    await this.write(state);
    return record;
  }

  /** Patch an existing record (no-op if it does not exist). */
  async patch(chartId: string, patch: Partial<DownloadedChartRecord>): Promise<void> {
    const state = this.read();
    const index = state.downloads.findIndex((entry) => entry.chartId === chartId);
    if (index < 0) {
      return;
    }
    state.downloads[index] = { ...state.downloads[index], ...patch } as DownloadedChartRecord;
    await this.write(state);
  }

  async delete(chartId: string): Promise<boolean> {
    const state = this.read();
    const next = state.downloads.filter((entry) => entry.chartId !== chartId);
    if (next.length === state.downloads.length) {
      return false;
    }
    await this.write({ ...state, downloads: next });
    return true;
  }

  private read(): DownloadStateFile {
    if (!fs.existsSync(this.stateFile)) {
      return { version: 1, downloads: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(this.stateFile, 'utf8')) as DownloadStateFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.downloads)) {
      throw new Error(`Invalid download state file: ${this.stateFile}`);
    }
    return parsed;
  }

  private async write(state: DownloadStateFile): Promise<void> {
    await fsPromises.mkdir(path.dirname(this.stateFile), { recursive: true });
    // Atomic write: write to a temp file then rename into place.
    const tmpFile = `${this.stateFile}.tmp`;
    await fsPromises.writeFile(tmpFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await fsPromises.rename(tmpFile, this.stateFile);
  }
}

/**
 * Compute the UI-facing status of a remote chart given its download record.
 * - no record           -> 'new' (or 'online-only' for non-downloadable formats)
 * - record failed       -> 'failed'
 * - remote newer        -> 'outdated'
 * - otherwise           -> 'installed'
 */
export type RemoteChartStatus = 'new' | 'installed' | 'outdated' | 'failed' | 'online-only';

export function deriveRemoteChartStatus(
  record: DownloadedChartRecord | null,
  remote: { lastUpdated?: string; sizeBytes?: number; downloadable: boolean },
): RemoteChartStatus {
  if (!record) {
    return remote.downloadable ? 'new' : 'online-only';
  }
  if (record.status === 'failed') {
    return 'failed';
  }
  if (isOutdated(record, remote)) {
    return 'outdated';
  }
  return 'installed';
}

function isOutdated(
  record: DownloadedChartRecord,
  remote: { lastUpdated?: string; sizeBytes?: number },
): boolean {
  if (remote.lastUpdated && record.remoteLastUpdated) {
    return new Date(remote.lastUpdated).getTime() > new Date(record.remoteLastUpdated).getTime();
  }
  if (typeof remote.sizeBytes === 'number' && typeof record.sizeBytes === 'number') {
    return remote.sizeBytes !== record.sizeBytes;
  }
  return false;
}
