import {
  type ChartSourceProvider,
  type ChartProviderRegion,
  type ChartProviderKind,
  type ChartAvailability,
} from '../types/catalog.types.js';

/**
 * Built-in chart source providers.
 * These are the remote sources the system knows about out of the box.
 */

const provider = (
  id: string,
  name: string,
  description: string,
  region: ChartProviderRegion,
  kind: ChartProviderKind,
  availability: ChartAvailability,
  attribution: string,
  license: string,
  endpoints: { catalog?: string; tiles?: string; wms?: string; wmts?: string; download?: string },
  opts: { minZoom?: number; maxZoom?: number; enabled?: boolean } = {},
): ChartSourceProvider => ({
  id,
  name,
  description,
  region,
  kind,
  availability,
  attribution,
  license,
  endpoints,
  enabled: opts.enabled ?? true,
  ...(opts.minZoom !== undefined ? { minZoom: opts.minZoom } : {}),
  ...(opts.maxZoom !== undefined ? { maxZoom: opts.maxZoom } : {}),
});

export const BUILT_IN_PROVIDERS: ChartSourceProvider[] = [
  provider(
    'openseamap',
    'OpenSeaMap',
    'Open nautical overlay with seamarks, buoys, lights, and hazards.',
    'global',
    'xyz',
    'online',
    '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
    'ODbL / CC-BY-SA',
    { tiles: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png' },
    { minZoom: 8, maxZoom: 18 },
  ),
  provider(
    'noaa-enc',
    'NOAA ENC',
    'Official NOAA Electronic Navigational Charts for US waters.',
    'usa',
    'enc-s57',
    'offline-capable',
    'NOAA Office of Coast Survey',
    'Public Domain',
    {
      catalog: 'https://charts.noaa.gov/ENCs/ENCsCatalog.xml',
      download: 'https://www.charts.noaa.gov/ENC/{chart_number}.zip',
    },
  ),
  provider(
    'noaa-wms',
    'NOAA Chart Display WMS',
    'NOAA chart display service via WMS for quick preview.',
    'usa',
    'wms',
    'online',
    'NOAA Office of Coast Survey',
    'Public Domain',
    {
      wms: 'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/export',
    },
  ),
  provider(
    'ihm-s63',
    'IHM licensed ENC (S-63)',
    'Official Spanish ENC exchange sets imported from an authorized distributor.',
    'spain',
    'enc-s63',
    'subscription',
    'Instituto Hidrográfico de la Marina (IHM)',
    'Licensed through IC-ENC / authorized distributors',
    { catalog: 'https://www.ic-enc.org/' },
    { enabled: false },
  ),
  provider(
    'ihm-enc-wms',
    'IHM Spain RasterENC (current WMTS)',
    'Current unified RasterENC display service used by IHM Información Náutica. Not valid for official navigation.',
    'spain',
    'wmts',
    'online',
    'Instituto Hidrográfico de la Marina (IHM)',
    'IHM Terms of Use',
    {
      wmts: 'https://ideihm.covam.es/ihmcache/wmts',
      catalog: 'https://ideihm.covam.es/portal/servicios-web/',
    },
  ),
  provider(
    'ihm-inspire-coastline',
    'IHM / INSPIRE coastline',
    'Official Spanish coastline supplement through legal WFS or local extract import.',
    'spain',
    'vector',
    'manual-import',
    'Instituto Hidrográfico de la Marina (IHM)',
    'CC BY 4.0',
    { catalog: 'https://ideihm.covam.es/' },
  ),
  provider(
    'emodnet-bathymetry',
    'EMODnet Bathymetry',
    'European bathymetry from EMODnet. High resolution DTM available.',
    'europe',
    'wms',
    'offline-capable',
    'EMODnet Bathymetry Consortium',
    'EMODnet Data Policy',
    {
      wms: 'https://ows.emodnet-bathymetry.eu/wms',
      tiles: 'https://tiles.emodnet-bathymetry.eu/{z}/{x}/{y}.png',
    },
    { minZoom: 0, maxZoom: 18 },
  ),
  provider(
    'gebco',
    'GEBCO Global Bathymetry',
    'Global bathymetry grid from GEBCO 2026.',
    'global',
    'xyz',
    'online',
    'GEBCO',
    'GEBCO Terms of Use',
    {
      wms: 'https://wms.gebco.net/mapserv',
      tiles: 'https://wms.gebco.net/mapserv?layers=GEBCO_LATEST&styles=&service=WMS&version=1.1.1&request=GetMap&format=image/png&srs=EPSG:3857&bbox={bbox}&width=256&height=256',
    },
    { minZoom: 0, maxZoom: 18 },
  ),
  provider(
    'cnig-bathymetry',
    'CNIG / IHM Bathymetry',
    'High resolution Spanish bathymetry from official MBAR downloads or guided legal import.',
    'spain',
    'raster',
    'manual-import',
    'CNIG / IHM',
    'CC BY 4.0',
    {
      catalog: 'https://centrodedescargas.cnig.es/',
    },
  ),
];

/**
 * Registry of all known chart source providers.
 */
export class ChartSourceCatalog {
  private readonly providers = new Map<string, ChartSourceProvider>();

  constructor() {
    for (const p of BUILT_IN_PROVIDERS) {
      this.providers.set(p.id, p);
    }
  }

  list(): ChartSourceProvider[] {
    return [...this.providers.values()];
  }

  get(id: string): ChartSourceProvider | undefined {
    return this.providers.get(id);
  }

  isEnabled(id: string): boolean {
    return this.providers.get(id)?.enabled ?? false;
  }

  setEnabled(id: string, enabled: boolean): void {
    const p = this.providers.get(id);
    if (p) {
      p.enabled = enabled;
    }
  }
}
