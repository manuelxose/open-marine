import type { RemoteChartEntry } from '../types/catalog.types.js';

/**
 * IHM Spain catalog client.
 * The IHM provides a WMS service and a web catalog of nautical charts.
 * This client provides static knowledge of Spanish chart coverage zones.
 */
export class IhmCatalogClient {
  /**
   * Return known Spanish chart zones.
   * In a full implementation, this would scrape or parse the IHM catalog.
   */
  async fetchCatalog(): Promise<RemoteChartEntry[]> {
    return [
      {
        id: 'ihm-enc-atlantic',
        providerId: 'ihm-enc-wms',
        label: 'IHM Atlantic Coast (WMS)',
        description: 'Spanish Atlantic coast ENC via WMS overlay. Not valid for official navigation.',
        scale: 20000,
        bounds: [-9.5, 35.8, -1.0, 43.8],
        minZoom: 4,
        maxZoom: 16,
        format: 'wms-layer',
        downloadUrl: 'https://ideihm.covam.es/ihm/wms/ENC',
        sizeBytes: 0,
      },
      {
        id: 'ihm-enc-mediterranean',
        providerId: 'ihm-enc-wms',
        label: 'IHM Mediterranean Coast (WMS)',
        description: 'Spanish Mediterranean coast ENC via WMS overlay. Not valid for official navigation.',
        scale: 20000,
        bounds: [-0.5, 35.8, 4.5, 42.5],
        minZoom: 4,
        maxZoom: 16,
        format: 'wms-layer',
        downloadUrl: 'https://ideihm.covam.es/ihm/wms/ENC',
        sizeBytes: 0,
      },
      {
        id: 'ihm-enc-canary',
        providerId: 'ihm-enc-wms',
        label: 'IHM Canary Islands (WMS)',
        description: 'Canary Islands ENC via WMS overlay. Not valid for official navigation.',
        scale: 20000,
        bounds: [-18.5, 27.5, -13.0, 29.5],
        minZoom: 6,
        maxZoom: 16,
        format: 'wms-layer',
        downloadUrl: 'https://ideihm.covam.es/ihm/wms/ENC',
        sizeBytes: 0,
      },
      {
        id: 'ihm-enc-balearic',
        providerId: 'ihm-enc-wms',
        label: 'IHM Balearic Islands (WMS)',
        description: 'Balearic Islands ENC via WMS overlay. Not valid for official navigation.',
        scale: 20000,
        bounds: [0.5, 38.5, 4.5, 40.5],
        minZoom: 6,
        maxZoom: 16,
        format: 'wms-layer',
        downloadUrl: 'https://ideihm.covam.es/ihm/wms/ENC',
        sizeBytes: 0,
      },
      {
        id: 'ihm-enc-galicia',
        providerId: 'ihm-enc-wms',
        label: 'IHM Galicia Rías (WMS)',
        description: 'Galician rías ENC via WMS overlay. Not valid for official navigation.',
        scale: 10000,
        bounds: [-9.5, 41.8, -8.2, 43.8],
        minZoom: 6,
        maxZoom: 16,
        format: 'wms-layer',
        downloadUrl: 'https://ideihm.covam.es/ihm/wms/ENC',
        sizeBytes: 0,
      },
    ];
  }
}
