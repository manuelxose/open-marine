import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';
import { WmsCapabilitiesClient } from './wms-capabilities.js';

const FALLBACK: RemoteChartEntry[] = [
  {
    id: 'gebco-global',
    providerId: 'gebco',
    label: 'GEBCO 2026 Global Grid',
    description: 'Global bathymetry grid at 15 arc-second resolution.',
    scale: 500000,
    bounds: [-180, -90, 180, 90],
    minZoom: 0,
    maxZoom: 18,
    format: 'wms-layer',
    downloadUrl: 'https://wms.gebco.net/mapserv',
    wmsLayer: 'GEBCO_LATEST',
    sizeBytes: 0,
  },
  {
    id: 'gebco-north-atlantic',
    providerId: 'gebco',
    label: 'GEBCO North Atlantic',
    description: 'North Atlantic bathymetry.',
    scale: 500000,
    bounds: [-80, 20, 20, 80],
    minZoom: 0,
    maxZoom: 18,
    format: 'wms-layer',
    downloadUrl: 'https://wms.gebco.net/mapserv',
    wmsLayer: 'GEBCO_LATEST',
    sizeBytes: 0,
  },
];

/**
 * GEBCO catalog client. Enumerates the real WMS layers from the GEBCO service
 * GetCapabilities (WMS 1.1.1), falling back to known global zones when offline.
 */
export class GebcoCatalogClient {
  private readonly wms = new WmsCapabilitiesClient({
    providerId: 'gebco',
    baseUrl: 'https://wms.gebco.net/mapserv',
    version: '1.1.1',
    fallback: FALLBACK,
  });

  async fetchCatalog(filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    return this.wms.fetchLayers(filter);
  }
}
