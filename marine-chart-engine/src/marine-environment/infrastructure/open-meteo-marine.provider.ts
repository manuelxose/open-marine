import type { OpenMeteoMarineService } from '../../services/open-meteo-marine.service.js';
import { MarineProviderError, type MarineProvider } from '../application/marine-provider.js';
import type { MarineField, MarineFieldRequest, ProviderCandidate } from '../domain/marine-field.js';

export class OpenMeteoMarineProvider implements MarineProvider {
  readonly id = 'open-meteo-marine';
  readonly label = 'Open-Meteo global marine forecast';
  readonly variables = ['waves', 'currents'] as const;

  constructor(private readonly service: OpenMeteoMarineService) {}

  async describe(request: MarineFieldRequest): Promise<ProviderCandidate> {
    return {
      providerId: this.id,
      providerLabel: this.label,
      variable: request.variable,
      health: 'available',
      coversViewport: request.variable === 'waves' || request.variable === 'currents',
      spatialResolutionMeters: 8_000,
      temporalResolutionMinutes: 60,
      ageMinutes: null,
      coastalSuitability: 0.45,
      observation: false,
      missingVariables: [],
      latencyMs: null,
    };
  }

  async getField(request: MarineFieldRequest): Promise<MarineField> {
    const source = await this.service.getField(request.bbox, request.time);
    const samples = source.samples.filter((sample) => request.variable === 'waves'
      ? sample.waveHeight !== null && sample.waveDirectionFrom !== null
      : sample.currentVelocityKmh !== null && sample.currentDirectionTo !== null);
    if (samples.length === 0) {
      throw new MarineProviderError('NO_DATA', `Open-Meteo returned no ${request.variable} samples in the selected area`);
    }
    const longitude = samples.map((sample) => sample.longitude);
    const latitude = samples.map((sample) => sample.latitude);
    const components = request.variable === 'waves'
      ? {
          significantHeight: samples.map((sample) => sample.waveHeight),
          meanPeriod: samples.map((sample) => sample.wavePeriod),
          directionFrom: samples.map((sample) => sample.waveDirectionFrom),
          windSeaHeight: samples.map((sample) => sample.windWaveHeight),
          windSeaDirectionFrom: samples.map((sample) => sample.windWaveDirectionFrom),
          windSeaPeriod: samples.map((sample) => sample.windWavePeriod),
          primarySwellHeight: samples.map((sample) => sample.swellWaveHeight),
          primarySwellDirectionFrom: samples.map((sample) => sample.swellWaveDirectionFrom),
          primarySwellPeriod: samples.map((sample) => sample.swellWavePeriod),
          primarySwellPeakPeriod: samples.map((sample) => sample.swellWavePeakPeriod),
        }
      : currentComponents(samples);
    return {
      variable: request.variable,
      metadata: {
        provider: 'Open-Meteo',
        product: request.variable === 'waves' ? 'Global marine wave forecast' : 'SMOC ocean currents',
        model: 'Open-Meteo automatic marine model selection',
        datasetId: `open-meteo-marine-${request.variable}`,
        runTime: null,
        validTime: source.validTime,
        forecastLeadTimeHours: null,
        retrievedAt: source.fetchedAt,
        sourceResolution: {
          value: 0.08,
          unit: 'degree',
          approximateMeters: 8_000,
          label: 'Global marine model, approximately 5-8 km depending on variable',
        },
        sourceTemporalResolutionMinutes: 60,
        boundingBox: source.bounds,
        coordinateReferenceSystem: 'EPSG:4326',
        isForecast: true,
        isAnalysis: false,
        isObservation: false,
        isInterpolated: false,
        quality: 'medium',
        coverage: 'complete',
        variables: Object.keys(components),
        directionConvention: request.variable === 'waves' ? 'oceanographic-from' : 'vector-to',
        sourceUrl: 'https://marine-api.open-meteo.com/v1/marine',
        license: 'Open-Meteo terms and upstream model licences',
        attribution: source.attribution,
      },
      dataGrid: { kind: 'points', nodeCount: samples.length, longitude, latitude, components },
      renderGrid: null,
    };
  }
}

const currentComponents = (
  samples: Awaited<ReturnType<OpenMeteoMarineService['getField']>>['samples'],
): Record<string, Array<number | null>> => {
  const speed = samples.map((sample) =>
    sample.currentVelocityKmh === null ? null : sample.currentVelocityKmh / 3.6);
  const directionTo = samples.map((sample) => sample.currentDirectionTo);
  return {
    speed,
    directionTo,
    u: speed.map((value, index) => {
      const direction = directionTo[index];
      return value === null || direction === null ? null : value * Math.sin(direction * Math.PI / 180);
    }),
    v: speed.map((value, index) => {
      const direction = directionTo[index];
      return value === null || direction === null ? null : value * Math.cos(direction * Math.PI / 180);
    }),
  };
};
