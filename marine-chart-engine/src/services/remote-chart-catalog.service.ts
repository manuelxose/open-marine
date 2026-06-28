import { NoaaCatalogClient } from '../catalog/noaa-catalog.js';
import { IhmCatalogClient } from '../catalog/ihm-catalog.js';
import { EmodnetCatalogClient } from '../catalog/emodnet-catalog.js';
import { GebcoCatalogClient } from '../catalog/gebco-catalog.js';
import type { RemoteChartEntry, ChartCatalogFilter } from '../types/catalog.types.js';

export class RemoteChartCatalogService {
  private readonly noaa = new NoaaCatalogClient();
  private readonly ihm = new IhmCatalogClient();
  private readonly emodnet = new EmodnetCatalogClient();
  private readonly gebco = new GebcoCatalogClient();

  async listCharts(providerId: string, _filter?: ChartCatalogFilter): Promise<RemoteChartEntry[]> {
    switch (providerId) {
      case 'noaa-enc':
        return this.noaa.fetchCatalog();
      case 'ihm-enc-wms':
        return this.ihm.fetchCatalog();
      case 'emodnet-bathymetry':
        return this.emodnet.fetchCatalog();
      case 'gebco':
        return this.gebco.fetchCatalog();
      default:
        return [];
    }
  }
}
