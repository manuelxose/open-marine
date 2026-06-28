import type { RemoteChartEntry } from '../types/catalog.types.js';

/**
 * NOAA ENC catalog client.
 * Fetches the official NOAA ENC catalog and parses chart entries.
 */
export class NoaaCatalogClient {
  private readonly catalogUrl = 'https://charts.noaa.gov/ENCs/ENCsCatalog.xml';

  /**
   * Fetch the NOAA ENC catalog and return chart entries.
   * Note: In a full implementation this would parse the XML catalog.
   * For now, returns a static list of known NOAA chart regions.
   */
  async fetchCatalog(): Promise<RemoteChartEntry[]> {
    // TODO: Implement XML parsing of ENCsCatalog.xml
    // The catalog contains <cell> entries with chart number, title, scale, bounds, etc.
    // For now, return representative entries to demonstrate the API.
    return [
      {
        id: 'noaa-enc-us-east-coast',
        providerId: 'noaa-enc',
        label: 'US East Coast ENC Collection',
        description: 'Electronic Navigational Charts for the US East Coast from Maine to Florida.',
        scale: 20000,
        bounds: [-81.5, 24.3, -66.9, 45.0],
        minZoom: 4,
        maxZoom: 16,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENC/',
        sizeBytes: 0,
      },
      {
        id: 'noaa-enc-us-west-coast',
        providerId: 'noaa-enc',
        label: 'US West Coast ENC Collection',
        description: 'Electronic Navigational Charts for the US West Coast from Washington to California.',
        scale: 20000,
        bounds: [-125.0, 32.5, -117.0, 49.0],
        minZoom: 4,
        maxZoom: 16,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENC/',
        sizeBytes: 0,
      },
      {
        id: 'noaa-enc-gulf-coast',
        providerId: 'noaa-enc',
        label: 'US Gulf Coast ENC Collection',
        description: 'Electronic Navigational Charts for the US Gulf Coast.',
        scale: 20000,
        bounds: [-97.5, 25.8, -80.0, 30.5],
        minZoom: 4,
        maxZoom: 16,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENC/',
        sizeBytes: 0,
      },
      {
        id: 'noaa-enc-alaska',
        providerId: 'noaa-enc',
        label: 'Alaska ENC Collection',
        description: 'Electronic Navigational Charts for Alaska waters.',
        scale: 20000,
        bounds: [-179.5, 51.0, -130.0, 71.5],
        minZoom: 4,
        maxZoom: 14,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENC/',
        sizeBytes: 0,
      },
      {
        id: 'noaa-enc-hawaii',
        providerId: 'noaa-enc',
        label: 'Hawaii ENC Collection',
        description: 'Electronic Navigational Charts for Hawaiian waters.',
        scale: 20000,
        bounds: [-162.0, 18.5, -154.5, 22.5],
        minZoom: 4,
        maxZoom: 16,
        format: 's57',
        downloadUrl: 'https://www.charts.noaa.gov/ENC/',
        sizeBytes: 0,
      },
    ];
  }

  /**
   * Build the download URL for a specific NOAA ENC chart number.
   */
  buildDownloadUrl(chartNumber: string): string {
    return `https://www.charts.noaa.gov/ENC/${chartNumber}.zip`;
  }
}
