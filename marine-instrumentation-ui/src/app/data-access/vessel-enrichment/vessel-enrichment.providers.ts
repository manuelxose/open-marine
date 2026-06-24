import { InjectionToken, Provider } from '@angular/core';

export interface VesselEnrichmentConfig {
  vesselObserverBaseUrl: string;
  externalDetailsBaseUrl: string;
}

export const DEFAULT_VESSEL_ENRICHMENT_CONFIG: VesselEnrichmentConfig = {
  // External vessel APIs generally require server-side credentials and do not
  // allow browser CORS requests. Leave disabled until a compatible backend
  // endpoint is explicitly configured.
  vesselObserverBaseUrl: '',
  externalDetailsBaseUrl: 'https://www.vesselfinder.com/vessels/details',
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
