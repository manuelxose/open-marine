import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { DownloadManager } from '../download/download-manager.js';
import type { ChartJobService } from './chart-job.service.js';
import type { PackageManifest, PackagePlan } from '../types/package.types.js';
import type { ChartRegistryService } from './chart-registry.service.js';

interface PackageFile {
  version: 1;
  packages: PackageManifest[];
}

export class ChartPackageService {
  private readonly plans = new Map<string, PackagePlan>();

  constructor(
    private readonly packagesFile: string,
    private readonly downloadManager: DownloadManager,
    private readonly jobs: ChartJobService,
    private readonly registry: ChartRegistryService,
  ) {}

  rememberPlan(plan: PackagePlan): PackagePlan {
    this.plans.set(plan.id, plan);
    return plan;
  }

  list(): PackageManifest[] {
    const file = this.readFile();
    const packages = file.packages.map((item) => this.reconcile(item));
    if (JSON.stringify(packages) !== JSON.stringify(file.packages)) {
      this.writeFileSync({ version: 1, packages });
    }
    return packages;
  }

  get(id: string): PackageManifest | null {
    const item = this.readFile().packages.find((candidate) => candidate.id === id);
    if (!item) return null;
    const reconciled = this.reconcile(item);
    if (JSON.stringify(reconciled) !== JSON.stringify(item)) {
      const file = this.readFile();
      const index = file.packages.findIndex((candidate) => candidate.id === id);
      if (index >= 0) file.packages[index] = reconciled;
      this.writeFileSync(file);
    }
    return reconciled;
  }

  async create(planId: string): Promise<PackageManifest> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Package plan expired or was not found; calculate it again');
    if (!plan.canCreate) throw new Error(`Package plan is blocked: ${plan.blockers.join(' ')}`);
    if (this.get(plan.id)) throw new Error(`Package ${plan.id} already exists`);
    const now = new Date().toISOString();
    let manifest: PackageManifest = {
      id: plan.id,
      name: plan.name,
      geometry: plan.geometry,
      bounds: plan.bounds,
      profile: plan.profile,
      layers: plan.layers.map((layer) => ({ ...layer })),
      licenses: plan.licenses,
      estimatedBytes: plan.estimatedBytes,
      storageBudgetBytes: plan.storageBudgetBytes,
      availableBytes: plan.availableBytes,
      minimumFreeBytes: plan.minimumFreeBytes,
      state: 'planning',
      version: 1,
      createdAt: now,
      updatedAt: now,
      warnings: [...plan.warnings],
      disclaimer: 'Recreational Electronic Chart System only. Not a type-approved ECDIS.',
    };
    await this.upsert(manifest);
    manifest = await this.startAutomaticLayers(manifest);
    this.plans.delete(planId);
    return manifest;
  }

  async attachLayer(packageId: string, layerId: string, chartId: string): Promise<PackageManifest> {
    const manifest = this.require(packageId);
    const chartLayer = manifest.layers.find((layer) => layer.id === layerId);
    if (!chartLayer) throw new Error(`Package layer not found: ${layerId}`);
    const chart = this.registry.get(chartId);
    if (!chart?.available) throw new Error(`Local chart is not installed or available: ${chartId}`);
    const requiresVector = chartLayer.role === 'official-enc'
      || chartLayer.role === 'coastline'
      || chartLayer.role === 'seamarks';
    if (requiresVector && chart.kind !== 'vector') {
      throw new Error(`${chartLayer.label} requires a vector chart`);
    }
    if (!requiresVector && chart.kind === 'vector') {
      throw new Error(`${chartLayer.label} requires a raster or bathymetry chart`);
    }
    chartLayer.chartId = chartId.trim();
    chartLayer.state = 'ready';
    delete chartLayer.reason;
    return this.saveReconciled(manifest);
  }

  async repair(id: string): Promise<PackageManifest> {
    const manifest = this.require(id);
    return this.startAutomaticLayers(manifest, true);
  }

  async cancel(id: string): Promise<PackageManifest> {
    const manifest = this.require(id);
    for (const layer of manifest.layers.filter((candidate) => candidate.state === 'downloading')) {
      this.downloadManager.cancel(layer.chartId ?? '');
      layer.state = layer.required ? 'failed' : 'warning';
      layer.reason = 'Download cancelled. Use Repair to resume.';
    }
    return this.saveReconciled(manifest);
  }

  async delete(id: string): Promise<boolean> {
    const file = this.readFile();
    const packages = file.packages.filter((item) => item.id !== id);
    if (packages.length === file.packages.length) return false;
    await this.writeFile({ version: 1, packages });
    return true;
  }

  private async startAutomaticLayers(manifest: PackageManifest, retry = false): Promise<PackageManifest> {
    for (const layer of manifest.layers) {
      const canStart = layer.acquisition === 'automatic'
        && (layer.state === 'pending' || (retry && (layer.state === 'failed' || layer.state === 'warning')));
      if (!canStart || layer.providerId !== 'emodnet-bathymetry' || layer.minZoom === undefined || layer.maxZoom === undefined) continue;
      const chartId = `package-${manifest.id}-emodnet`;
      const job = this.downloadManager.enqueueAreaDownload({
        id: chartId,
        label: `${manifest.name} · EMODnet`,
        providerId: layer.providerId,
        bbox: layer.bounds,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom,
        description: `Bathymetry supplement for package ${manifest.name}`,
        attribution: layer.attribution,
        layers: 'mean_multicolour',
      });
      layer.jobId = job.id;
      layer.chartId = chartId;
      layer.state = 'downloading';
      delete layer.reason;
    }
    return this.saveReconciled(manifest);
  }

  private reconcile(manifest: PackageManifest): PackageManifest {
    const copy: PackageManifest = { ...manifest, layers: manifest.layers.map((layer) => ({ ...layer })) };
    const previousState = JSON.stringify({ state: copy.state, layers: copy.layers, activatedAt: copy.activatedAt });
    for (const layer of copy.layers) {
      if (layer.state !== 'downloading' || !layer.jobId) continue;
      const job = this.jobs.get(layer.jobId);
      const registered = layer.chartId ? this.registry.get(layer.chartId) : null;
      if (registered?.available || job?.status === 'completed') layer.state = 'ready';
      if (job?.status === 'failed') {
        layer.state = layer.required ? 'failed' : 'warning';
        layer.reason = job.error ?? 'Download failed';
      } else if (!job && !registered?.available) {
        layer.state = layer.required ? 'failed' : 'warning';
        layer.reason = 'The previous download was interrupted. Use Repair to resume it.';
      }
    }
    const requiredMissing = copy.layers.some((layer) => layer.required && layer.state !== 'ready');
    const downloading = copy.layers.some((layer) => layer.state === 'downloading');
    copy.state = downloading ? 'downloading' : requiredMissing ? 'incomplete' : 'ready';
    if (copy.state === 'ready' && !copy.activatedAt) copy.activatedAt = new Date().toISOString();
    if (JSON.stringify({ state: copy.state, layers: copy.layers, activatedAt: copy.activatedAt }) !== previousState) {
      copy.updatedAt = new Date().toISOString();
      copy.lastCheckedAt = copy.updatedAt;
    }
    return copy;
  }

  private require(id: string): PackageManifest {
    const manifest = this.get(id);
    if (!manifest) throw new Error(`Package not found: ${id}`);
    return manifest;
  }

  private async saveReconciled(manifest: PackageManifest): Promise<PackageManifest> {
    const reconciled = this.reconcile(manifest);
    await this.upsert(reconciled);
    return reconciled;
  }

  private async upsert(manifest: PackageManifest): Promise<void> {
    const file = this.readFile();
    const index = file.packages.findIndex((item) => item.id === manifest.id);
    if (index >= 0) file.packages[index] = manifest;
    else file.packages.push(manifest);
    await this.writeFile(file);
  }

  private readFile(): PackageFile {
    try {
      if (!fs.existsSync(this.packagesFile)) return { version: 1, packages: [] };
      const parsed = JSON.parse(fs.readFileSync(this.packagesFile, 'utf8')) as PackageFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.packages)) throw new Error('Invalid package manifest registry');
      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('Invalid package manifest registry');
      throw error;
    }
  }

  private async writeFile(file: PackageFile): Promise<void> {
    await fsPromises.mkdir(path.dirname(this.packagesFile), { recursive: true });
    const temporary = `${this.packagesFile}.tmp`;
    await fsPromises.writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    await fsPromises.rename(temporary, this.packagesFile);
  }

  private writeFileSync(file: PackageFile): void {
    fs.mkdirSync(path.dirname(this.packagesFile), { recursive: true });
    const temporary = `${this.packagesFile}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, this.packagesFile);
  }
}
