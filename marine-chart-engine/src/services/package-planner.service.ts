import crypto from 'node:crypto';
import fs from 'node:fs';
import type {
  AreaGeometry,
  PackageLayerPlan,
  PackagePlan,
  PackageProfile,
} from '../types/package.types.js';
import { boundsIntersect, geometryBounds, validateAreaGeometry } from './area-geometry.js';
import { DEFAULT_MAX_TILES, estimateAreaDownload } from './download-estimate.js';

const SPAIN_BOUNDS: [number, number, number, number] = [-19, 27, 5, 44.5];
const EUROPE_BOUNDS: [number, number, number, number] = [-30, 25, 45, 72];
const DEFAULT_STORAGE_BUDGET_BYTES = 5 * 1024 ** 3;
const MINIMUM_FREE_RATIO = 0.2;

export interface CreatePackagePlanRequest {
  name: string;
  geometry: unknown;
  profile?: PackageProfile;
  storageBudgetBytes?: number;
  selectedProviderIds?: string[];
}

export class PackagePlannerService {
  constructor(private readonly dataDir: string) {}

  createPlan(request: CreatePackagePlanRequest): PackagePlan {
    const geometry = validateAreaGeometry(request.geometry);
    const bounds = geometryBounds(geometry);
    const profile = request.profile ?? 'recommended';
    const storageBudgetBytes = clampBudget(request.storageBudgetBytes);
    const disk = this.diskSpace();
    const layers = this.layersFor(bounds, profile, request.selectedProviderIds);
    const estimatedBytes = layers.reduce((sum, layer) => sum + (layer.estimatedBytes ?? 0), 0);
    const minimumFreeBytes = Math.ceil(disk.totalBytes * MINIMUM_FREE_RATIO);
    const blockers: string[] = [];
    const warnings: string[] = [];
    const automaticTiles = layers
      .filter((layer) => layer.acquisition === 'automatic')
      .reduce((sum, layer) => sum + Math.ceil((layer.estimatedBytes ?? 0) / (15 * 1024)), 0);

    if (estimatedBytes > storageBudgetBytes) {
      blockers.push(`Estimated package size exceeds the configured ${formatBytes(storageBudgetBytes)} budget.`);
    }
    if (estimatedBytes + minimumFreeBytes > disk.availableBytes) {
      blockers.push('Not enough storage while preserving the required 20% free space.');
    }
    if (automaticTiles > DEFAULT_MAX_TILES) {
      blockers.push(`Automatic download exceeds the safety limit of ${DEFAULT_MAX_TILES.toLocaleString()} tiles.`);
    }
    if (layers.some((layer) => layer.role === 'official-enc' && layer.state === 'required')) {
      warnings.push('Licensed IHM ENC exchange sets and valid permits must be imported before this package is complete.');
    }
    if (layers.some((layer) => layer.providerId === 'gebco')) {
      warnings.push('GEBCO is contextual fallback data and is not suitable for navigation.');
    }

    return {
      id: crypto.randomUUID(),
      name: normalizeName(request.name),
      geometry,
      bounds,
      profile,
      layers,
      licenses: [
        {
          id: 'omi-ecs-disclaimer',
          label: 'OMI ECS status',
          status: 'accepted',
          message: 'OMI is not a type-approved ECDIS and does not replace official navigation practice.',
        },
        ...(boundsIntersect(bounds, SPAIN_BOUNDS)
          ? [{
              id: 'ihm-enc-license',
              label: 'Licensed IHM ENC',
              status: 'external-action' as const,
              url: 'https://armada.defensa.gob.es/ArmadaPortal/page/Portal/ArmadaEspannola/cienciaihm1/prefLang-es/02ProductosServicios--08InfoInteres--01conceptosENCECDIS--02distribucionENC-es',
              message: 'Purchase through IC-ENC or an authorized distributor, then import the exchange set and permits.',
            }]
          : []),
      ],
      estimatedBytes,
      storageBudgetBytes,
      availableBytes: disk.availableBytes,
      minimumFreeBytes,
      canCreate: blockers.length === 0,
      blockers,
      warnings,
      createdAt: new Date().toISOString(),
    };
  }

  private layersFor(
    bounds: [number, number, number, number],
    profile: PackageProfile,
    selectedProviderIds: string[] | undefined,
  ): PackageLayerPlan[] {
    const inSpain = boundsIntersect(bounds, SPAIN_BOUNDS);
    const inEurope = boundsIntersect(bounds, EUROPE_BOUNDS);
    const layers: PackageLayerPlan[] = [];

    if (inSpain) {
      layers.push({
        id: 'ihm-official-enc',
        providerId: 'ihm-s63',
        label: 'IHM official ENC (S-63/S-57)',
        role: 'official-enc',
        official: true,
        required: true,
        acquisition: 'licensed-import',
        state: 'required',
        reason: 'A legal exchange set, cell permits and configured S-63 OEM identity are required.',
        bounds,
        attribution: 'Instituto Hidrográfico de la Marina (IHM)',
        license: 'Licensed through IC-ENC / authorized distributor',
        navigationUse: 'official-source',
      });
      layers.push({
        id: 'ihm-online-reference',
        providerId: 'ihm-enc-wms',
        label: 'IHM ENC current WMTS reference',
        role: 'official-enc',
        official: false,
        required: false,
        acquisition: 'online-reference',
        state: 'ready',
        reason: 'Online reference only; it is never cached as the official offline layer.',
        bounds,
        attribution: 'Instituto Hidrográfico de la Marina (IHM)',
        license: 'IHM terms of use',
        navigationUse: 'supplementary',
      });
      layers.push({
        id: 'cnig-mbar',
        providerId: 'cnig-bathymetry',
        label: 'IHM/CNIG MBAR bathymetry',
        role: 'bathymetry',
        official: true,
        required: false,
        acquisition: 'manual-import',
        state: 'required',
        reason: 'Import an official MBAR extract when a machine-readable download is available; HTML scraping is disabled.',
        bounds,
        attribution: 'Instituto Hidrográfico de la Marina / CNIG',
        license: 'CC BY 4.0',
        navigationUse: 'supplementary',
      });
      layers.push({
        id: 'ihm-coastline',
        providerId: 'ihm-inspire-coastline',
        label: 'IHM / INSPIRE coastline',
        role: 'coastline',
        official: true,
        required: false,
        acquisition: 'manual-import',
        state: 'required',
        reason: 'Use the official WFS/download service or import a legal local extract.',
        bounds,
        attribution: 'Instituto Hidrográfico de la Marina',
        license: 'CC BY 4.0',
        navigationUse: 'supplementary',
      });
    }

    if (inEurope) {
      const estimate = estimateAreaDownload(bounds, 6, 14);
      layers.push({
        id: 'emodnet-bathymetry',
        providerId: 'emodnet-bathymetry',
        label: 'EMODnet bathymetry',
        role: 'bathymetry',
        official: false,
        required: !inSpain,
        acquisition: 'automatic',
        state: 'pending',
        bounds,
        minZoom: 6,
        maxZoom: 14,
        estimatedBytes: estimate.estimatedSizeMb * 1024 ** 2,
        attribution: 'EMODnet Bathymetry Consortium',
        license: 'CC BY 4.0',
        navigationUse: 'supplementary',
      });
    } else {
      layers.push({
        id: 'gebco-fallback',
        providerId: 'gebco',
        label: 'GEBCO global bathymetry',
        role: 'fallback',
        official: false,
        required: false,
        acquisition: 'manual-import',
        state: 'required',
        reason: 'Download an official GEBCO subset and import it locally. Bulk WMS tile caching is disabled.',
        bounds,
        attribution: 'GEBCO Compilation Group',
        license: 'GEBCO public-domain terms',
        navigationUse: 'not-for-navigation',
      });
    }

    layers.push({
      id: 'openseamap-extract',
      providerId: 'openseamap-extract',
      label: 'OpenSeaMap seamarks (OSM extract)',
      role: 'seamarks',
      official: false,
      required: false,
      acquisition: 'manual-import',
      state: 'required',
      reason: 'Generate from a legal regional OSM PBF extract; public tile bulk download is prohibited.',
      bounds,
      attribution: 'OpenStreetMap / OpenSeaMap contributors',
      license: 'ODbL / CC BY-SA',
      navigationUse: 'supplementary',
    });

    if (profile === 'custom' && selectedProviderIds?.length) {
      const selected = new Set(selectedProviderIds);
      return layers.filter((layer) => layer.required || selected.has(layer.providerId));
    }
    return layers;
  }

  private diskSpace(): { totalBytes: number; availableBytes: number } {
    try {
      const stats = fs.statfsSync(this.dataDir);
      return {
        totalBytes: Number(stats.blocks) * Number(stats.bsize),
        availableBytes: Number(stats.bavail) * Number(stats.bsize),
      };
    } catch {
      return { totalBytes: 10 * 1024 ** 3, availableBytes: 8 * 1024 ** 3 };
    }
  }
}

const clampBudget = (value: number | undefined): number => {
  if (value === undefined) return DEFAULT_STORAGE_BUDGET_BYTES;
  if (!Number.isFinite(value) || value < 64 * 1024 ** 2 || value > 100 * 1024 ** 3) {
    throw new Error('Storage budget must be between 64 MB and 100 GB');
  }
  return Math.floor(value);
};

const normalizeName = (value: string): string => {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) throw new Error('Package name must contain between 2 and 80 characters');
  return name;
};

const formatBytes = (bytes: number): string => `${Math.ceil(bytes / 1024 ** 3)} GB`;
