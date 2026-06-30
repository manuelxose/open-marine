import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';
import { WmsCapabilitiesClient } from './wms-capabilities.js';

const FALLBACK: RemoteChartEntry[] = [
  {
    id: 'emodnet-europe',
    providerId: 'emodnet-bathymetry',
    label: 'EMODnet European Bathymetry',
    description: 'Harmonized European bathymetry DTM at various resolutions.',
    scale: 100000,
    bounds: [-30.0, 25.0, 45.0, 72.0],
    minZoom: 0,
    maxZoom: 18,
    format: 'wms-layer',
    downloadUrl: 'https://ows.emodnet-bathymetry.eu/wms',
    wmsLayer: 'mean_multicolour',
    sizeBytes: 0,
  },
  {
    id: 'emodnet-north-sea',
    providerId: 'emodnet-bathymetry',
    label: 'EMODnet North Sea',
    description: 'High resolution North Sea bathymetry.',
    scale: 50000,
    bounds: [-5.0, 50.0, 12.0, 62.0],
    minZoom: 4,
    maxZoom: 18,
    format: 'wms-layer',
    downloadUrl: 'https://ows.emodnet-bathymetry.eu/wms',
    wmsLayer: 'mean_multicolour',
    sizeBytes: 0,
  },
  {
    id: 'emodnet-mediterranean',
    providerId: 'emodnet-bathymetry',
    label: 'EMODnet Mediterranean',
    description: 'Mediterranean bathymetry from EMODnet.',
    scale: 100000,
    bounds: [-6.0, 30.0, 36.0, 46.0],
    minZoom: 4,
    maxZoom: 18,
    format: 'wms-layer',
    downloadUrl: 'https://ows.emodnet-bathymetry.eu/wms',
    wmsLayer: 'mean_multicolour',
    sizeBytes: 0,
  },
];

/**
 * EMODnet Bathymetry catalog client. Enumerates the real WMS layers from the
 * EMODnet service GetCapabilities, falling back to known zones when offline.
 */
export class EmodnetCatalogClient {
  private readonly wms = new WmsCapabilitiesClient({
    providerId: 'emodnet-bathymetry',
    baseUrl: 'https://ows.emodnet-bathymetry.eu/wms',
    fallback: FALLBACK,
  });

  async fetchCatalog(filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    return this.wms.fetchLayers(filter);
  }
}
