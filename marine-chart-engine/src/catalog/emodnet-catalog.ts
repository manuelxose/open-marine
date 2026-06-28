import type { RemoteChartEntry } from '../types/catalog.types.js';

/**
 * EMODnet Bathymetry catalog client.
 */
export class EmodnetCatalogClient {
  async fetchCatalog(): Promise<RemoteChartEntry[]> {
    return [
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
        sizeBytes: 0,
      },
    ];
  }
}
