import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';

const IHM_ATTRIBUTION = '(c) Instituto Hidrografico de la Marina. Not valid for navigation.';

const SPAIN_WATERS_BOUNDS: [number, number, number, number] = [-20.0, 25.0, 6.0, 46.0];

const IHM_PURPOSES_BASE: RemoteChartEntry[] = [
  {
    id: 'ihm-enc-p2',
    providerId: 'ihm-enc-wms',
    tileProviderId: 'ihm-enc-p2',
    label: 'IHM Spain ENC Purpose 2 (WMS)',
    description: 'IHM small-scale ENC-like WMS rendering. Visual reference only; not valid for navigation.',
    scale: 350000,
    bounds: SPAIN_WATERS_BOUNDS,
    minZoom: 4,
    maxZoom: 10,
    format: 'wms-layer',
    downloadUrl: 'https://ideihm.covam.es/wms/cartaENCp2',
    wmsLayer: 'ENC_ES2',
    sizeBytes: 0,
  },
  {
    id: 'ihm-enc-p3',
    providerId: 'ihm-enc-wms',
    tileProviderId: 'ihm-enc-p3',
    label: 'IHM Spain ENC Purpose 3 (WMS)',
    description: 'IHM coastal ENC-like WMS rendering. Visual reference only; not valid for navigation.',
    scale: 90000,
    bounds: SPAIN_WATERS_BOUNDS,
    minZoom: 6,
    maxZoom: 12,
    format: 'wms-layer',
    downloadUrl: 'https://ideihm.covam.es/wms/cartaENCp3',
    wmsLayer: 'ENC_ES3',
    sizeBytes: 0,
  },
  {
    id: 'ihm-enc-p4',
    providerId: 'ihm-enc-wms',
    tileProviderId: 'ihm-enc-p4',
    label: 'IHM Spain ENC Purpose 4 (WMS)',
    description: 'IHM approach-scale ENC-like WMS rendering. Visual reference only; not valid for navigation.',
    scale: 22000,
    bounds: SPAIN_WATERS_BOUNDS,
    minZoom: 8,
    maxZoom: 15,
    format: 'wms-layer',
    downloadUrl: 'https://ideihm.covam.es/wms/cartaENCp4',
    wmsLayer: 'ENC_ES4',
    sizeBytes: 0,
  },
  {
    id: 'ihm-enc-p5',
    providerId: 'ihm-enc-wms',
    tileProviderId: 'ihm-enc-p5',
    label: 'IHM Spain ENC Purpose 5 (WMS)',
    description: 'IHM harbour-scale ENC-like WMS rendering. Visual reference only; not valid for navigation.',
    scale: 4000,
    bounds: SPAIN_WATERS_BOUNDS,
    minZoom: 10,
    maxZoom: 16,
    format: 'wms-layer',
    downloadUrl: 'https://ideihm.covam.es/wms/cartaENCp5',
    wmsLayer: 'ENC_ES5',
    sizeBytes: 0,
  },
];

const IHM_PURPOSES: RemoteChartEntry[] = IHM_PURPOSES_BASE.map((entry) => ({
  ...entry,
  description: `${entry.description} ${IHM_ATTRIBUTION}`,
}));

/**
 * IHM Spain catalog client. IHM exposes the ENC-style WMS renderer as separate
 * services by navigational purpose (p2-p5), not as one generic ENC endpoint.
 */
export class IhmCatalogClient {
  async fetchCatalog(filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    if (!filter?.bbox) {
      return IHM_PURPOSES;
    }
    return IHM_PURPOSES.filter((entry) => boundsIntersect(entry.bounds, filter.bbox!));
  }
}

function boundsIntersect(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
