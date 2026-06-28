import type { ChartJobService } from '../services/chart-job.service.js';
import type { ChartRegistryService } from '../services/chart-registry.service.js';
import type { MbtilesService } from '../services/mbtiles.service.js';
import type { TileCacheService } from '../services/tile-cache.service.js';
import type { XyzProxyService } from '../services/xyz-proxy.service.js';
import type { WmsProxyService } from '../services/wms-proxy.service.js';
import { TileBatchDownloader, type AreaDownloadRequest } from './tile-batch-downloader.js';
import { EncDownloader, type EncDownloadRequest } from './enc-downloader.js';

export class DownloadManager {
  private readonly tileDownloader: TileBatchDownloader;

  constructor(
    private readonly jobs: ChartJobService,
    private readonly registry: ChartRegistryService,
    private readonly mbtiles: MbtilesService,
    tileCache: TileCacheService,
    xyzProxy: XyzProxyService,
    wmsProxy: WmsProxyService,
    private readonly dataDir: string,
  ) {
    this.tileDownloader = new TileBatchDownloader(tileCache, xyzProxy, wmsProxy, dataDir);
  }

  /**
   * Queue an area download job.
   */
  enqueueAreaDownload(request: AreaDownloadRequest): ReturnType<ChartJobService['enqueue']> {
    return this.jobs.enqueue('area-download', request.id, request.label, async () => {
      await this.tileDownloader.downloadArea(request);
      return {
        id: request.id,
        label: request.label,
        kind: 'raster',
        storage: 'mbtiles',
        tileUrl: `http://localhost:8088/charts/${request.id}/raster/{z}/{x}/{y}.png`,
        mbtilesFile: `data/charts/${request.id}.mbtiles`,
        available: true,
      };
    });
  }

  /**
   * Queue an ENC download and conversion job.
   */
  enqueueEncDownload(request: EncDownloadRequest): ReturnType<ChartJobService['enqueue']> {
    const downloader = new EncDownloader(this.registry, this.mbtiles);
    return this.jobs.enqueue('enc-download', request.id, request.label, async () => {
      await downloader.downloadAndConvert(request);
      return {
        id: request.id,
        label: request.label,
        kind: 'vector',
        storage: 'mbtiles',
        tileUrl: `http://localhost:8088/charts/${request.id}/vector/{z}/{x}/{y}.pbf`,
        mbtilesFile: `data/charts/${request.id}.mbtiles`,
        available: true,
      };
    });
  }
}
