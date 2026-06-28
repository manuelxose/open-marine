import type { RemoteChartEntry } from '../types/catalog.types.js';

/**
 * GEBCO catalog client.
 */
export class GebcoCatalogClient {
  async fetchCatalog(): Promise<RemoteChartEntry[]> {
    return [
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
        downloadUrl: 'https://www.gebco.net/data_and_products/gridded_bathymetry_data/',
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
        downloadUrl: 'https://www.gebco.net/data_and_products/gridded_bathymetry_data/',
        sizeBytes: 0,
      },
    ];
  }
}
