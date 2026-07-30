import type {
  MarineField,
  MarineFieldRequest,
  ProviderCandidate,
} from '../domain/marine-field.js';
import { MarineProviderError, type MarineProvider } from '../application/marine-provider.js';

const DATASET = 'https://opendap.puertos.es/thredds/dodsC/radar_local_galicia/latest/five_days.nc';
const FILL_VALUE = -9999;

interface AxisSnapshot {
  times: number[];
  latitude: number[];
  longitude: number[];
  epoch: number;
}

export class PuertosHfRadarProvider implements MarineProvider {
  readonly id = 'puertos-hf-radar-galicia';
  readonly label = 'Puertos HF radar Galicia';
  readonly variables = ['currents'] as const;
  private axesCache: { fetchedAt: number; value: AxisSnapshot } | null = null;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async describe(request: MarineFieldRequest): Promise<ProviderCandidate> {
    const axes = await this.axes();
    const observedAt = axes.epoch + axes.times.at(-1)! * 3_600_000;
    return {
      providerId: this.id,
      providerLabel: this.label,
      variable: 'currents',
      health: this.now() - observedAt > 6 * 3_600_000 ? 'stale' : 'available',
      coversViewport: intersectsAxes(request, axes),
      spatialResolutionMeters: 6000,
      temporalResolutionMinutes: 60,
      ageMinutes: Math.max(0, (this.now() - observedAt) / 60_000),
      coastalSuitability: 0.8,
      observation: true,
      missingVariables: [],
      latencyMs: null,
    };
  }

  async getField(request: MarineFieldRequest): Promise<MarineField> {
    const axes = await this.axes();
    const lonIndexes = selectedIndexes(axes.longitude, request.bbox[0], request.bbox[2]);
    const latIndexes = selectedIndexes(axes.latitude, request.bbox[1], request.bbox[3]);
    if (lonIndexes.length === 0 || latIndexes.length === 0) {
      throw new MarineProviderError('NO_COVERAGE', 'HF radar grid does not intersect bbox');
    }
    const targetHours = (Date.parse(request.time) - axes.epoch) / 3_600_000;
    const timeIndex = nearestIndex(axes.times, targetHours);
    const constraint = [
      `u[${timeIndex}:1:${timeIndex}][${latIndexes[0]}:1:${latIndexes.at(-1)}][${lonIndexes[0]}:1:${lonIndexes.at(-1)}]`,
      `v[${timeIndex}:1:${timeIndex}][${latIndexes[0]}:1:${latIndexes.at(-1)}][${lonIndexes[0]}:1:${lonIndexes.at(-1)}]`,
    ].join(',');
    const response = await this.fetcher(`${DATASET}.ascii?${encodeConstraint(constraint)}`);
    if (!response.ok) throw new MarineProviderError('NETWORK', `Puertos OPeNDAP returned ${response.status}`);
    const body = await response.text();
    const uSource = matrix(body, 'u');
    const vSource = matrix(body, 'v');
    const longitude: number[] = [];
    const latitude: number[] = [];
    const u: number[] = [];
    const v: number[] = [];
    const speed: number[] = [];
    const directionTo: number[] = [];
    for (let row = 0; row < latIndexes.length; row++) {
      for (let column = 0; column < lonIndexes.length; column++) {
        const index = row * lonIndexes.length + column;
        const eastward = uSource[index];
        const northward = vSource[index];
        if (!Number.isFinite(eastward) || !Number.isFinite(northward)
          || eastward === FILL_VALUE || northward === FILL_VALUE) continue;
        longitude.push(axes.longitude[lonIndexes[column]!]!);
        latitude.push(axes.latitude[latIndexes[row]!]!);
        u.push(eastward!);
        v.push(northward!);
        speed.push(Math.hypot(eastward!, northward!));
        directionTo.push((Math.atan2(eastward!, northward!) * 180 / Math.PI + 360) % 360);
      }
    }
    if (longitude.length === 0) {
      throw new MarineProviderError('NO_DATA', 'HF radar has no valid observed vectors in requested bbox/time');
    }
    const observedAt = new Date(axes.epoch + axes.times[timeIndex]! * 3_600_000).toISOString();
    return {
      variable: 'currents',
      metadata: {
        provider: 'Puertos del Estado / Intecmar / Instituto Hidrografico de Portugal',
        product: 'HF Radar Galicia near-real-time surface current',
        model: 'CODAR combined observation',
        datasetId: 'radar_local_galicia/latest/five_days.nc',
        runTime: null,
        validTime: observedAt,
        forecastLeadTimeHours: null,
        retrievedAt: new Date(this.now()).toISOString(),
        sourceResolution: { value: 6, unit: 'km', approximateMeters: 6000, label: '6 km observed radar grid' },
        sourceTemporalResolutionMinutes: 60,
        boundingBox: request.bbox,
        coordinateReferenceSystem: 'EPSG:4326',
        isForecast: false,
        isAnalysis: false,
        isObservation: true,
        isInterpolated: false,
        quality: 'medium',
        coverage: 'partial',
        variables: ['eastward_sea_water_velocity', 'northward_sea_water_velocity'],
        directionConvention: 'vector-to',
        sourceUrl: DATASET,
        license: 'Dataset distribution statement: free of charge; attribution required; use at own risk',
        attribution: 'Puertos del Estado, Intecmar-Xunta de Galicia and Instituto Hidrografico de Portugal',
        observedAt,
      },
      dataGrid: {
        kind: 'points',
        nodeCount: longitude.length,
        longitude,
        latitude,
        components: { u, v, speed, directionTo },
      },
      renderGrid: null,
    };
  }

  private async axes(): Promise<AxisSnapshot> {
    if (this.axesCache && this.now() - this.axesCache.fetchedAt < 5 * 60_000) return this.axesCache.value;
    const [axisResponse, attributesResponse] = await Promise.all([
      this.fetcher(`${DATASET}.ascii?time,lat,lon`),
      this.fetcher(`${DATASET}.das`),
    ]);
    if (!axisResponse.ok || !attributesResponse.ok) {
      throw new MarineProviderError('NETWORK', 'Puertos HF radar discovery failed');
    }
    const [axisBody, attributes] = await Promise.all([axisResponse.text(), attributesResponse.text()]);
    const epochText = attributes.match(/String units "hours since ([^"]+)"/)?.[1];
    if (!epochText) throw new MarineProviderError('PARSING', 'HF radar time epoch is missing');
    const value = {
      times: array(axisBody, 'time'),
      latitude: array(axisBody, 'lat'),
      longitude: array(axisBody, 'lon'),
      epoch: Date.parse(`${epochText.replace(' ', 'T')}Z`),
    };
    if (!Number.isFinite(value.epoch) || value.times.length === 0) {
      throw new MarineProviderError('INVALID_DATA', 'HF radar coordinate metadata is invalid');
    }
    this.axesCache = { fetchedAt: this.now(), value };
    return value;
  }
}

const encodeConstraint = (value: string): string =>
  value.replaceAll('[', '%5B').replaceAll(']', '%5D');

const array = (body: string, name: string): number[] => {
  const match = body.match(new RegExp(`${name}\\[\\d+\\]\\s*\\r?\\n([^\\r\\n]+)`));
  if (!match?.[1]) throw new MarineProviderError('PARSING', `HF radar ${name} axis is missing`);
  return match[1].split(',').map(Number);
};

const matrix = (body: string, name: string): number[] => {
  const start = body.indexOf(`${name}.${name}[`);
  const end = body.indexOf(`\n\n${name}.time`, start);
  if (start < 0 || end < 0) throw new MarineProviderError('PARSING', `HF radar ${name} matrix is missing`);
  const values: number[] = [];
  for (const match of body.slice(start, end).matchAll(/^\[0\]\[\d+\],\s*(.+)$/gm)) {
    values.push(...match[1]!.split(',').map((value) => Number(value.trim())));
  }
  return values;
};

const selectedIndexes = (values: number[], minimum: number, maximum: number): number[] =>
  values.map((value, index) => ({ value, index }))
    .filter(({ value }) => value >= minimum && value <= maximum)
    .map(({ index }) => index);

const nearestIndex = (values: number[], target: number): number =>
  values.reduce((best, value, index) =>
    Math.abs(value - target) < Math.abs(values[best]! - target) ? index : best, 0);

const intersectsAxes = (request: MarineFieldRequest, axes: AxisSnapshot): boolean =>
  request.bbox[2] >= axes.longitude[0]!
  && request.bbox[0] <= axes.longitude.at(-1)!
  && request.bbox[3] >= axes.latitude[0]!
  && request.bbox[1] <= axes.latitude.at(-1)!;

