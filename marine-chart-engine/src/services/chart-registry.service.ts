import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import type { LocalChartRegistryEntry, LocalChartRegistryFile, LocalChartSource } from '../types/chart-source.types.js';
import type { MbtilesService } from './mbtiles.service.js';
import type { TilePathService } from './tile-path.service.js';

type StaticChartSource = Omit<LocalChartSource, 'available' | 'metadata'>;

const CHARTS: StaticChartSource[] = [
  {
    id: 'emodnet-bathymetry',
    label: 'EMODnet Bathymetry',
    kind: 'bathymetry',
    storage: 'proxy',
    description: 'Live EMODnet bathymetry through the chart-engine WMS proxy and disk cache.',
    attribution: 'EMODnet Bathymetry Consortium',
    minZoom: 0,
    maxZoom: 18,
    tileUrl: 'http://localhost:8088/proxy/wms/emodnet-bathymetry/{z}/{x}/{y}.png',
  },
];

export class ChartRegistryService {
  constructor(
    private readonly tilePaths: TilePathService,
    private readonly mbtiles: MbtilesService,
    private readonly localRegistryFile?: string,
  ) {}

  list(): LocalChartSource[] {
    return this.loadCharts().map((chart) => this.hydrate(chart));
  }

  get(chartId: string): LocalChartSource | null {
    const chart = this.loadCharts().find((candidate) => candidate.id === chartId);
    return chart ? this.hydrate(chart) : null;
  }

  async upsert(entry: LocalChartRegistryEntry): Promise<LocalChartSource> {
    const registry = this.readLocalRegistry();
    const existingIndex = registry.charts.findIndex((chart) => chart.id === entry.id);
    if (existingIndex >= 0) {
      registry.charts[existingIndex] = entry;
    } else {
      registry.charts.push(entry);
    }
    await this.writeLocalRegistry(registry);
    const chart = this.get(entry.id);
    if (!chart) {
      throw new Error(`Failed to register chart: ${entry.id}`);
    }
    return chart;
  }

  async delete(chartId: string): Promise<boolean> {
    const registry = this.readLocalRegistry();
    const nextCharts = registry.charts.filter((chart) => chart.id !== chartId);
    if (nextCharts.length === registry.charts.length) {
      return false;
    }
    await this.writeLocalRegistry({ ...registry, charts: nextCharts });
    return true;
  }

  mbtilesPath(chartId: string): string | null {
    return this.mbtiles.findExistingMbtiles([
      this.tilePaths.mbtilesPath(chartId),
      this.tilePaths.nestedMbtilesPath(chartId),
    ]);
  }

  private hydrate(chart: StaticChartSource): LocalChartSource {
    if (chart.storage === 'proxy') {
      return { ...chart, available: true };
    }

    const mbtilesPath = this.mbtilesPath(chart.id);
    if (!mbtilesPath) {
      return { ...chart, available: false };
    }

    const metadata = this.mbtiles.readMetadata(mbtilesPath) ?? undefined;
    return {
      ...chart,
      available: true,
      mbtilesFile: path.relative(process.cwd(), mbtilesPath),
      ...(metadata ? { metadata } : {}),
    };
  }

  private loadCharts(): StaticChartSource[] {
    const dynamicCharts = this.loadLocalRegistry();
    const byId = new Map<string, StaticChartSource>();
    for (const chart of [...CHARTS, ...dynamicCharts]) {
      byId.set(chart.id, chart);
    }
    return [...byId.values()];
  }

  private loadLocalRegistry(): StaticChartSource[] {
    return this.readLocalRegistry().charts.filter((chart) => chart.storage === 'mbtiles' && (chart.kind === 'raster' || chart.kind === 'vector'));
  }

  private readLocalRegistry(): LocalChartRegistryFile {
    if (!this.localRegistryFile || !fs.existsSync(this.localRegistryFile)) {
      return { version: 1, charts: [] };
    }

    const parsed = JSON.parse(fs.readFileSync(this.localRegistryFile, 'utf8')) as LocalChartRegistryFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.charts)) {
      throw new Error(`Invalid chart registry file: ${this.localRegistryFile}`);
    }

    return parsed;
  }

  private async writeLocalRegistry(registry: LocalChartRegistryFile): Promise<void> {
    if (!this.localRegistryFile) {
      throw new Error('Local registry file is not configured');
    }
    await fsPromises.mkdir(path.dirname(this.localRegistryFile), { recursive: true });
    await fsPromises.writeFile(this.localRegistryFile, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  }
}
