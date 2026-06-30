import type { ChartJobService } from '../services/chart-job.service.js';
import type { ChartRegistryService } from '../services/chart-registry.service.js';
import type { MbtilesService } from '../services/mbtiles.service.js';
import type { TileCacheService } from '../services/tile-cache.service.js';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';
import type { DownloadStateService, DownloadedChartFormat, DownloadedChartRecord } from '../services/download-state.service.js';
import { TileBatchDownloader, type AreaDownloadRequest, type DownloadProgress } from './tile-batch-downloader.js';
import { EncDownloader, type EncDownloadRequest } from './enc-downloader.js';

export interface DownloadChartMeta {
  bounds?: [number, number, number, number];
  sizeBytes?: number;
  remoteLastUpdated?: string;
}

export class DownloadManager {
  private readonly tileDownloader: TileBatchDownloader;
  private readonly controllers = new Map<string, AbortController>();
  private readonly progress = new Map<string, DownloadProgress>();

  constructor(
    private readonly jobs: ChartJobService,
    private readonly registry: ChartRegistryService,
    private readonly mbtiles: MbtilesService,
    tileCache: TileCacheService,
    xyzProxy: XyzProxyService,
    wmsProxy: WmsProxyService,
    private readonly dataDir: string,
    private readonly downloadState: DownloadStateService,
  ) {
    this.tileDownloader = new TileBatchDownloader(tileCache, xyzProxy, wmsProxy, dataDir);
  }

  /**
   * Queue an area download job (XYZ/WMS tiles -> MBTiles cache).
   */
  enqueueAreaDownload(request: AreaDownloadRequest): ReturnType<ChartJobService['enqueue']> {
    const controller = new AbortController();
    this.controllers.set(request.id, controller);
    const format: DownloadedChartFormat = 'xyz-cache';

    // Area downloads have no separate remote id, so the record key is the local id.
    const recordKey = request.id;
    return this.jobs.enqueue('area-download', request.id, request.label, async () => {
      await this.downloadState.upsert(this.pendingRecord(recordKey, {
        providerId: request.providerId,
        localChartId: request.id,
        label: request.label,
        format,
        bounds: request.bbox,
      }));
      try {
        await this.tileDownloader.downloadArea(request, {
          signal: controller.signal,
          onProgress: (p) => this.progress.set(request.id, p),
        });
        const source = {
          id: request.id,
          label: request.label,
          kind: 'raster' as const,
          storage: 'mbtiles' as const,
          tileUrl: `http://localhost:8088/charts/${request.id}/raster/{z}/{x}/{y}.png`,
          mbtilesFile: `data/charts/${request.id}.mbtiles`,
          available: true,
        };
        await this.recordCompleted(recordKey);
        return source;
      } catch (error) {
        await this.recordFailed(recordKey);
        throw error;
      } finally {
        this.controllers.delete(request.id);
      }
    });
  }

  /**
   * Queue an ENC download and conversion job (S-57 -> MBTiles vector).
   */
  enqueueEncDownload(request: EncDownloadRequest, meta: DownloadChartMeta = {}): ReturnType<ChartJobService['enqueue']> {
    const downloader = new EncDownloader(this.registry, this.mbtiles);
    // ENC records are keyed by the remote chart id so status can join to the catalog.
    const recordKey = request.chartId;
    return this.jobs.enqueue('enc-download', request.id, request.label, async () => {
      await this.downloadState.upsert(this.pendingRecord(recordKey, {
        providerId: request.providerId,
        localChartId: request.id,
        label: request.label,
        format: 's57',
        sourceUrl: request.downloadUrl,
        ...meta,
      }));
      try {
        await downloader.downloadAndConvert(request);
        const source = {
          id: request.id,
          label: request.label,
          kind: 'vector' as const,
          storage: 'mbtiles' as const,
          tileUrl: `http://localhost:8088/charts/${request.id}/vector/{z}/{x}/{y}.pbf`,
          mbtilesFile: `data/charts/${request.id}.mbtiles`,
          available: true,
        };
        await this.recordCompleted(recordKey);
        return source;
      } catch (error) {
        await this.recordFailed(recordKey);
        throw error;
      }
    });
  }

  /** Cancel an in-flight area download by its chart id. */
  cancel(chartId: string): boolean {
    const controller = this.controllers.get(chartId);
    if (!controller) {
      return false;
    }
    controller.abort();
    return true;
  }

  /** Latest progress snapshot for an area download, if running. */
  getProgress(chartId: string): DownloadProgress | null {
    return this.progress.get(chartId) ?? null;
  }

  private pendingRecord(
    recordKey: string,
    fields: {
      providerId: string;
      localChartId: string;
      label: string;
      format: DownloadedChartFormat;
      sourceUrl?: string;
      bounds?: [number, number, number, number];
      sizeBytes?: number;
      remoteLastUpdated?: string;
    },
  ): DownloadedChartRecord {
    return {
      chartId: recordKey,
      providerId: fields.providerId,
      localChartId: fields.localChartId,
      label: fields.label,
      format: fields.format,
      ...(fields.sourceUrl ? { sourceUrl: fields.sourceUrl } : {}),
      ...(fields.bounds ? { bounds: fields.bounds } : {}),
      ...(typeof fields.sizeBytes === 'number' ? { sizeBytes: fields.sizeBytes } : {}),
      ...(fields.remoteLastUpdated ? { remoteLastUpdated: fields.remoteLastUpdated } : {}),
      downloadedAt: new Date().toISOString(),
      status: 'failed', // placeholder until completion
    };
  }

  private async recordCompleted(recordKey: string): Promise<void> {
    await this.downloadState.patch(recordKey, {
      status: 'available',
      convertedAt: new Date().toISOString(),
    });
  }

  private async recordFailed(recordKey: string): Promise<void> {
    await this.downloadState.patch(recordKey, { status: 'failed' });
  }
}
