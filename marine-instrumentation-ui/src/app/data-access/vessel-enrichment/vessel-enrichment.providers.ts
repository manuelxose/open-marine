import { InjectionToken, Provider } from '@angular/core';

export interface VesselEnrichmentConfig {
  vesselObserverBaseUrl: string;
  externalDetailsBaseUrl: string;
}

export const DEFAULT_VESSEL_ENRICHMENT_CONFIG: VesselEnrichmentConfig = {
  // Default endpoint must be DNS-resolvable. This one may still require credentials,
  // but avoids ERR_NAME_NOT_RESOLVED from a non-existent host.
  vesselObserverBaseUrl: 'https://api.vesselfinder.com/api/pub/v1/vessel?mmsi={mmsi}',
  externalDetailsBaseUrl: 'https://www.marinetraffic.com/en/ais/details/ships',
};

export const VESSEL_ENRICHMENT_CONFIG = new InjectionToken<VesselEnrichmentConfig>(
  'VESSEL_ENRICHMENT_CONFIG',
);

export function provideVesselEnrichmentConfig(
  config: Partial<VesselEnrichmentConfig>,
): Provider {
  return {
    provide: VESSEL_ENRICHMENT_CONFIG,
    useValue: {
      ...DEFAULT_VESSEL_ENRICHMENT_CONFIG,
      ...config,
    },
  };
}
