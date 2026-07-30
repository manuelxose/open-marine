import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  MarineField,
  MarineFieldRequest,
  MarineVariable,
  ProviderCandidate,
} from '../domain/marine-field.js';
import { knotsToMetersPerSecond, meteorologicalFromToVector } from '../domain/marine-math.js';
import { MarineProviderError, type MarineProvider } from '../application/marine-provider.js';

interface Manifest {
  updatedAt?: string;
  layers?: Partial<Record<MarineVariable | 'seaTemperature', string[]>>;
}

interface GeoJsonFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
}

export class CachedCopernicusProvider implements MarineProvider {
  readonly id: string;
  readonly label: string;
  readonly variables: readonly MarineVariable[];

  constructor(
    private readonly variable: 'waves' | 'currents',
    private readonly dataDir: string,
  ) {
    this.id = `copernicus-ibi-${variable}`;
    this.label = `Copernicus IBI ${variable}`;
    this.variables = [variable];
  }

  async describe(request: MarineFieldRequest): Promise<ProviderCandidate> {
    const manifest = await this.manifest();
    const frames = manifest.layers?.[this.variable] ?? [];
    const ageMinutes = manifest.updatedAt
      ? Math.max(0, (Date.now() - Date.parse(manifest.updatedAt)) / 60_000)
      : null;
    return {
      providerId: this.id,
      providerLabel: this.label,
      variable: this.variable,
      health: frames.length === 0 ? 'unavailable' : ageMinutes !== null && ageMinutes > 720 ? 'stale' : 'available',
      coversViewport: withinVigo(request.bbox),
      spatialResolutionMeters: 3000,
      temporalResolutionMinutes: this.variable === 'currents' ? 15 : 60,
      ageMinutes,
      coastalSuitability: 0.72,
      observation: false,
      missingVariables: frames.length === 0 ? [this.variable] : [],
      latencyMs: null,
    };
  }

  async getField(request: MarineFieldRequest): Promise<MarineField> {
    const manifest = await this.manifest();
    const times = manifest.layers?.[this.variable] ?? [];
    const bracket = bracketingTimes(times, request.time);
    const validTime = bracket.before ?? bracket.after ?? nearestTime(times, request.time);
    if (!validTime) throw new MarineProviderError('NO_DATA', `No cached ${this.variable} frame`);
    const before = await this.readFrame(validTime, request);
    let frame = before;
    let temporalInterpolation: MarineField['metadata']['temporalInterpolation'];
    if (bracket.before && bracket.after && bracket.before !== bracket.after) {
      const after = await this.readFrame(bracket.after, request);
      const start = Date.parse(bracket.before);
      const end = Date.parse(bracket.after);
      const weight = Math.max(0, Math.min(1, (Date.parse(request.time) - start) / (end - start)));
      frame = blendFrames(before, after, weight);
      temporalInterpolation = {
        method: 'linear',
        before: bracket.before,
        after: bracket.after,
        weight: Number(weight.toFixed(4)),
      };
    }
    const { longitude, latitude, components } = frame;
    if (longitude.length === 0) {
      throw new MarineProviderError('NO_DATA', `Cached ${this.variable} frame has no physical source nodes in bbox`);
    }
    const isWave = this.variable === 'waves';
    return {
      variable: this.variable,
      metadata: {
        provider: 'Copernicus Marine',
        product: isWave ? 'IBI_ANALYSISFORECAST_WAV_005_005' : 'IBI_ANALYSISFORECAST_PHY_005_001',
        model: isWave ? 'IBI MFWAM' : 'IBI ocean physics',
        datasetId: isWave
          ? 'cmems_mod_ibi_wav_anfc_0.027deg_PT1H-i'
          : 'cmems_mod_ibi_phy_anfc_0.027deg-2D_PT15M-i',
        runTime: null,
        validTime: temporalInterpolation ? new Date(request.time).toISOString() : validTime,
        forecastLeadTimeHours: null,
        retrievedAt: manifest.updatedAt ?? validTime,
        sourceResolution: {
          value: 0.0278,
          unit: 'degree',
          approximateMeters: 3000,
          label: '1/36 degree regional model grid',
        },
        sourceTemporalResolutionMinutes: isWave ? 60 : 15,
        boundingBox: request.bbox,
        coordinateReferenceSystem: 'EPSG:4326',
        isForecast: true,
        isAnalysis: false,
        isObservation: false,
        isInterpolated: Boolean(temporalInterpolation),
        temporalInterpolation,
        quality: 'medium',
        coverage: 'complete',
        variables: Object.keys(components),
        directionConvention: isWave ? 'oceanographic-from' : 'vector-to',
        sourceUrl: 'https://data.marine.copernicus.eu/',
        license: 'Copernicus Marine Service licence',
        attribution: 'EU Copernicus Marine Service Information',
      },
      dataGrid: { kind: 'points', nodeCount: longitude.length, longitude, latitude, components },
      renderGrid: null,
    };
  }

  private async readFrame(
    validTime: string,
    request: MarineFieldRequest,
  ): Promise<{ longitude: number[]; latitude: number[]; components: Record<string, Array<number | null>> }> {
    const filename = `${validTime.replaceAll(':', '-')}.geojson`;
    const collection = JSON.parse(await fs.readFile(
      path.join(this.dataDir, 'environment', this.variable, filename),
      'utf8',
    )) as { features?: GeoJsonFeature[] };
    const sourceNodes = (collection.features ?? []).filter((feature) =>
      feature.properties?.['featureType'] === 'cell'
      && feature.properties['interpolated'] !== true,
    );
    const longitude: number[] = [];
    const latitude: number[] = [];
    const components: Record<string, Array<number | null>> = this.variable === 'currents'
      ? { u: [], v: [], speed: [], directionTo: [] }
      : Object.fromEntries(WAVE_COMPONENTS.map((name) => [name, []]));
    for (const feature of sourceNodes) {
      const center = geometryCenter(feature.geometry?.coordinates);
      if (!center || !inside(center, request.bbox)) continue;
      longitude.push(center[0]);
      latitude.push(center[1]);
      if (this.variable === 'currents') {
        const speedKnots = finite(feature.properties?.['speedKnots']);
        const directionTo = finite(feature.properties?.['directionDeg']);
        const speedMps = speedKnots === null ? null : knotsToMetersPerSecond(speedKnots);
        const vector = speedMps !== null && directionTo !== null
          ? bearingToVector(speedMps, directionTo)
          : null;
        components['u']!.push(vector?.u ?? null);
        components['v']!.push(vector?.v ?? null);
        components['speed']!.push(speedMps);
        components['directionTo']!.push(directionTo);
      } else {
        for (const name of WAVE_COMPONENTS) {
          const legacyName = name === 'significantHeight'
            ? 'heightMeters'
            : name === 'meanPeriod'
              ? 'periodSeconds'
              : name === 'directionFrom'
                ? 'directionDeg'
                : name;
          components[name]!.push(finite(feature.properties?.[name] ?? feature.properties?.[legacyName]));
        }
      }
    }
    return { longitude, latitude, components };
  }

  private async manifest(): Promise<Manifest> {
    try {
      return JSON.parse(await fs.readFile(path.join(this.dataDir, 'environment', 'manifest.json'), 'utf8')) as Manifest;
    } catch {
      return {};
    }
  }
}

const WAVE_COMPONENTS = [
  'significantHeight',
  'meanPeriod',
  'spectralPeriodTm02',
  'peakPeriod',
  'directionFrom',
  'peakDirectionFrom',
  'maximumHeight',
  'maximumCrestHeight',
  'stokesU',
  'stokesV',
  'windSeaHeight',
  'windSeaPeriod',
  'windSeaDirectionFrom',
  'primarySwellHeight',
  'primarySwellPeriod',
  'primarySwellDirectionFrom',
  'secondarySwellHeight',
  'secondarySwellPeriod',
  'secondarySwellDirectionFrom',
] as const;

const bracketingTimes = (times: string[], requested: string): { before: string | null; after: string | null } => {
  const target = Date.parse(requested);
  const ordered = [...times].sort((left, right) => Date.parse(left) - Date.parse(right));
  return {
    before: [...ordered].reverse().find((time) => Date.parse(time) <= target) ?? null,
    after: ordered.find((time) => Date.parse(time) >= target) ?? null,
  };
};

const blendFrames = (
  before: { longitude: number[]; latitude: number[]; components: Record<string, Array<number | null>> },
  after: { longitude: number[]; latitude: number[]; components: Record<string, Array<number | null>> },
  weight: number,
): typeof before => {
  const afterByCoordinate = new Map(
    after.longitude.map((longitude, index) => [`${longitude.toFixed(6)},${after.latitude[index]!.toFixed(6)}`, index]),
  );
  const components = Object.fromEntries(Object.keys(before.components).map((name) => [
    name,
    before.longitude.map((longitude, index) => {
      const afterIndex = afterByCoordinate.get(`${longitude.toFixed(6)},${before.latitude[index]!.toFixed(6)}`);
      const first = before.components[name]?.[index] ?? null;
      const second = afterIndex === undefined ? null : after.components[name]?.[afterIndex] ?? null;
      if (first === null) return second;
      if (second === null) return first;
      if (name.toLowerCase().includes('direction')) {
        const delta = ((second - first + 540) % 360) - 180;
        return (first + delta * weight + 360) % 360;
      }
      return first + (second - first) * weight;
    }),
  ]));
  return { longitude: before.longitude, latitude: before.latitude, components };
};

const VIGO_BOUNDS = [-9.05, 42.05, -8.4, 42.4] as const;
const withinVigo = ([west, south, east, north]: MarineFieldRequest['bbox']): boolean =>
  west >= VIGO_BOUNDS[0] && south >= VIGO_BOUNDS[1] && east <= VIGO_BOUNDS[2] && north <= VIGO_BOUNDS[3];

const nearestTime = (times: string[], requested: string): string | null => {
  const target = Date.parse(requested);
  return times.reduce<string | null>((selected, candidate) => {
    if (!selected) return candidate;
    return Math.abs(Date.parse(candidate) - target) < Math.abs(Date.parse(selected) - target) ? candidate : selected;
  }, null);
};

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const inside = ([longitude, latitude]: [number, number], [west, south, east, north]: MarineFieldRequest['bbox']): boolean =>
  longitude >= west && longitude <= east && latitude >= south && latitude <= north;

const bearingToVector = (speed: number, directionTo: number): { u: number; v: number } => {
  const radians = directionTo * Math.PI / 180;
  return { u: speed * Math.sin(radians), v: speed * Math.cos(radians) };
};

const geometryCenter = (coordinates: unknown): [number, number] | null => {
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) return null;
  const ring = coordinates[0] as unknown[];
  const positions = ring.filter((item): item is [number, number] =>
    Array.isArray(item) && Number.isFinite(item[0]) && Number.isFinite(item[1]));
  if (positions.length === 0) return null;
  const sum = positions.reduce(([lon, lat], point) => [lon + point[0], lat + point[1]], [0, 0]);
  return [sum[0] / positions.length, sum[1] / positions.length];
};
