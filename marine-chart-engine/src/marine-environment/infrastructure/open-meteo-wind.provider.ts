import type { WindFieldService } from '../../services/wind-field.service.js';
import type {
  MarineField,
  MarineFieldRequest,
  ProviderCandidate,
} from '../domain/marine-field.js';
import { knotsToMetersPerSecond, meteorologicalFromToVector } from '../domain/marine-math.js';
import type { MarineProvider } from '../application/marine-provider.js';

export class OpenMeteoWindProvider implements MarineProvider {
  readonly id = 'open-meteo-wind';
  readonly label = 'Open-Meteo wind fallback';
  readonly variables = ['wind'] as const;

  constructor(private readonly service: WindFieldService) {}

  async describe(request: MarineFieldRequest): Promise<ProviderCandidate> {
    return {
      providerId: this.id,
      providerLabel: this.label,
      variable: 'wind',
      health: 'available',
      coversViewport: request.variable === 'wind',
      spatialResolutionMeters: null,
      temporalResolutionMinutes: 15,
      ageMinutes: null,
      coastalSuitability: 0.35,
      observation: false,
      missingVariables: [],
      latencyMs: null,
    };
  }

  async getField(request: MarineFieldRequest): Promise<MarineField> {
    const source = await this.service.getField(false, request.bbox);
    const longitude: number[] = [];
    const latitude: number[] = [];
    const u: number[] = [];
    const v: number[] = [];
    const speed: number[] = [];
    const directionFrom: number[] = [];
    const gust: Array<number | null> = [];
    for (const feature of source.features) {
      const speedMps = knotsToMetersPerSecond(feature.properties.speedKnots);
      const vector = meteorologicalFromToVector(speedMps, feature.properties.directionDeg);
      longitude.push(feature.geometry.coordinates[0]);
      latitude.push(feature.geometry.coordinates[1]);
      u.push(vector.u);
      v.push(vector.v);
      speed.push(speedMps);
      directionFrom.push(feature.properties.directionDeg);
      gust.push(feature.properties.gustKnots === null
        ? null
        : knotsToMetersPerSecond(feature.properties.gustKnots));
    }
    const validTime = source.features.find((feature) => feature.properties.validTime)?.properties.validTime
      ?? source.properties.fetchedAt;
    return {
      variable: 'wind',
      metadata: {
        provider: 'Open-Meteo',
        product: 'Forecast API current wind',
        model: 'Open-Meteo automatic model selection',
        datasetId: 'open-meteo-current-wind-10m',
        runTime: null,
        validTime,
        forecastLeadTimeHours: null,
        retrievedAt: source.properties.fetchedAt,
        sourceResolution: {
          value: null,
          unit: 'km',
          approximateMeters: null,
          label: 'Not exposed by this aggregated endpoint',
        },
        sourceTemporalResolutionMinutes: 15,
        boundingBox: source.properties.bounds,
        coordinateReferenceSystem: 'EPSG:4326',
        isForecast: true,
        isAnalysis: false,
        isObservation: false,
        isInterpolated: false,
        quality: 'unknown',
        coverage: 'complete',
        variables: ['eastward_wind', 'northward_wind', 'wind_speed', 'wind_from_direction', 'wind_gust'],
        directionConvention: 'meteorological-from',
        sourceUrl: 'https://api.open-meteo.com/v1/forecast',
        license: 'Open-Meteo terms and upstream model licences',
        attribution: source.properties.attribution,
      },
      dataGrid: {
        kind: 'points',
        nodeCount: longitude.length,
        longitude,
        latitude,
        components: { u, v, speed, directionFrom, gust },
      },
      renderGrid: null,
    };
  }
}

