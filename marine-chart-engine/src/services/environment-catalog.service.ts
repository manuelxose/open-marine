import fs from 'node:fs';
import path from 'node:path';
import type { EnvironmentalLayerDescriptor, EnvironmentalLayerId } from '../types/environment.types.js';

const COPERNICUS_LAYERS = new Set<EnvironmentalLayerId>(['seaTemperature', 'currents', 'waves']);
const ALL_MAP_KINDS = ['raster', 'vector', 'bathymetry'] as const;

export class EnvironmentCatalogService {
  constructor(
    private readonly dataDir: string,
    private readonly baseUrl: string,
    private readonly hasWeatherKey: boolean,
    _copernicusSyncEnabled = false,
  ) {}

  list(): EnvironmentalLayerDescriptor[] {
    const copernicusManifest = this.readCopernicusManifest();
    const raster = (id: EnvironmentalLayerId, label: string, unit: string, providerId: string, attribution: string): EnvironmentalLayerDescriptor => ({
      id,
      label,
      unit,
      provider: providerId,
      renderKind: 'raster',
      state: this.hasWeatherKey ? 'forecast' : 'unavailable',
      available: this.hasWeatherKey,
      attribution,
      minZoom: 0,
      maxZoom: 18,
      tileUrl: `${this.baseUrl}/environment/${id}/{time}/{z}/{x}/{y}.png`,
      validTimes: [],
      compatibleMapKinds: [...ALL_MAP_KINDS],
      compatibilityNote: 'Overlay compatible with raster, vector ENC and bathymetry base maps.',
      ...(!this.hasWeatherKey ? { message: 'Configure CHART_ENGINE_OWM_API_KEY.' } : {}),
    });

    const layers: EnvironmentalLayerDescriptor[] = [
      {
        id: 'bathymetry', label: 'Bathymetry', unit: 'm', provider: 'EMODnet', renderKind: 'raster',
        state: 'observed', available: true, attribution: 'EMODnet Bathymetry Consortium', minZoom: 0, maxZoom: 18,
        tileUrl: `${this.baseUrl}/environment/bathymetry/latest/{z}/{x}/{y}.png`, validTimes: [],
        compatibleMapKinds: [...ALL_MAP_KINDS],
        compatibilityNote: 'Overlay compatible with raster, vector ENC and bathymetry base maps.',
      },
      raster('airTemperature', 'Air temperature', 'C', 'OpenWeatherMap', 'OpenWeatherMap'),
      {
        ...raster('wind', 'Wind', 'kn', 'OpenWeatherMap + Open-Meteo', 'OpenWeatherMap / Open-Meteo'),
        vectorUrl: `${this.baseUrl}/weather/wind-field.geojson`,
        compatibilityNote: 'Wind intensity plus standard 5-knot meteorological barbs on every base-map type. The vector grid follows the area selected in the map.',
      },
      raster('precipitation', 'Precipitation', 'mm/h', 'OpenWeatherMap', 'OpenWeatherMap'),
      raster('clouds', 'Cloud cover', '%', 'OpenWeatherMap', 'OpenWeatherMap'),
      raster('pressure', 'Pressure', 'hPa', 'OpenWeatherMap', 'OpenWeatherMap'),
    ];

    for (const id of COPERNICUS_LAYERS) {
      const frames = copernicusManifest.layers[id] ?? [];
      const ageMs = copernicusManifest.updatedAt ? Date.now() - Date.parse(copernicusManifest.updatedAt) : Number.POSITIVE_INFINITY;
      const frameState = ageMs > 12 * 60 * 60 * 1000 ? 'stale' : 'cached';
      const validTimes = frames.length > 0 && ageMs <= 12 * 60 * 60 * 1000
        ? frames
        : marineForecastTimes();
      layers.push({
        id,
        label: id === 'seaTemperature' ? 'Sea temperature' : id === 'currents' ? 'Surface currents' : 'Wave height',
        unit: id === 'seaTemperature' ? 'C' : id === 'currents' ? 'kn' : 'm',
        provider: 'Copernicus Marine IBI + Open-Meteo global fallback',
        renderKind: 'vector',
        state: frames.length > 0 ? frameState : 'forecast',
        available: true,
        attribution: 'EU Copernicus Marine Service Information / Open-Meteo and upstream marine models',
        minZoom: 4,
        maxZoom: 16,
        vectorUrl: `${this.baseUrl}/environment/${id}/{time}.geojson`,
        validTimes,
        compatibleMapKinds: [...ALL_MAP_KINDS],
        coverage: [-180, -90, 180, 90],
        compatibilityNote: 'Global marine forecast. Copernicus IBI shoreline-clipped 3 km cells are preferred in Vigo; Open-Meteo marine models provide the selected area elsewhere.',
        ...(copernicusManifest.updatedAt ? { updatedAt: copernicusManifest.updatedAt } : {}),
      });
    }
    return layers;
  }

  framePath(id: EnvironmentalLayerId, time: string): string | null {
    if (!COPERNICUS_LAYERS.has(id) || !/^[0-9TZ:.-]+$/.test(time)) return null;
    const file = path.join(this.dataDir, 'environment', id, `${time.replaceAll(':', '-')}.geojson`);
    return fs.existsSync(file) ? file : null;
  }

  private readCopernicusManifest(): { layers: Partial<Record<EnvironmentalLayerId, string[]>>; updatedAt?: string } {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(this.dataDir, 'environment', 'manifest.json'), 'utf8')) as Record<string, unknown>;
      if (parsed['layers'] && typeof parsed['layers'] === 'object') {
        return {
          layers: parsed['layers'] as Partial<Record<EnvironmentalLayerId, string[]>>,
          ...(typeof parsed['updatedAt'] === 'string' ? { updatedAt: parsed['updatedAt'] } : {}),
        };
      }
      return { layers: parsed as Partial<Record<EnvironmentalLayerId, string[]>> };
    } catch {
      return { layers: {} };
    }
  }
}

const marineForecastTimes = (): string[] => {
  const first = new Date();
  first.setUTCMinutes(0, 0, 0);
  return Array.from({ length: 8 * 8 }, (_, index) =>
    new Date(first.getTime() + index * 3 * 60 * 60 * 1000).toISOString());
};
