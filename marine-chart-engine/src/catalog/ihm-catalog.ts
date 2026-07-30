import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';

const IHM_ATTRIBUTION = '(c) Instituto Hidrografico de la Marina. Not valid for navigation.';
const SPAIN_WATERS_BOUNDS: [number, number, number, number] = [-20.0, 25.0, 6.0, 46.0];

const IHM_ENC_WMTS: RemoteChartEntry = {
  id: 'ihm-enc-wmts',
  providerId: 'ihm-enc-wms',
  tileProviderId: 'ihm-enc-wmts',
  label: 'IHM Spain RasterENC — current unified WMTS',
  description: `Current unified RasterENC service used by IHM Información Náutica, with all available navigational purposes and detail through zoom 21. ${IHM_ATTRIBUTION}`,
  bounds: SPAIN_WATERS_BOUNDS,
  minZoom: 0,
  maxZoom: 21,
  format: 'xyz-tiles',
  downloadUrl: 'https://ideihm.covam.es/ihmcache/wmts',
  sizeBytes: 0,
};

/**
 * IHM Spain catalog client. The current official public display endpoint is
 * the unified RasterENC WMTS, replacing the legacy purpose-specific WMS stack.
 */
export class IhmCatalogClient {
  async fetchCatalog(filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    if (!filter?.bbox || boundsIntersect(IHM_ENC_WMTS.bounds, filter.bbox)) {
      return [IHM_ENC_WMTS];
    }
    return [];
  }
}

const boundsIntersect = (
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean =>
  a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
