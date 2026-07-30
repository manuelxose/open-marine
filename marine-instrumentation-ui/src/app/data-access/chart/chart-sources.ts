import type { StyleSpecification } from 'maplibre-gl';
import { buildEncVectorTileStyle } from '../../features/chart/layers/enc-style';
import type { EncLayerConfig } from '../../features/chart/services/chart-settings.service';
import type { EngineChartSource } from './chart-engine-api.service';
import type { PackageManifest } from './chart-remote-catalog.service';

export type ChartSourceKind = 'raster' | 'vector' | 'bathymetry';

export interface ChartSourceDefinition {
  id: string;
  label: string;
  kind: ChartSourceKind;
  style?: StyleSpecification;
  styleUrl?: string;
  description?: string;
  available?: boolean;
  local?: boolean;
  /** WGS84 [west, south, east, north] for regional sources. */
  bounds?: [number, number, number, number];
}

export const DEFAULT_CHART_SOURCE_ID = 'osm-raster';
export const NAUTICAL_CHART_SOURCE_ID = 'nautical';
export const ENC_CHART_SOURCE_ID = 'enc';
export const LOCAL_RASTER_CHART_SOURCE_ID = 'local-raster';
export const BATHYMETRY_CHART_SOURCE_ID = 'bathymetry';
export const ENC_VECTOR_CHART_SOURCE_ID = 'enc-vector';
export const GEBCO_CHART_SOURCE_ID = 'gebco';
export const NOAA_WMS_CHART_SOURCE_ID = 'noaa-wms';
export const IHM_WMS_CHART_SOURCE_ID = 'ihm-enc-wms';
export const EMODNET_LIVE_CHART_SOURCE_ID = 'emodnet-bathymetry-live';

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '(c) OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster',
      type: 'raster',
      source: 'osm-raster',
    },
  ],
};

export const NAUTICAL_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-base': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    'openseamap-overlay': {
      type: 'raster',
      tiles: ['http://localhost:8088/proxy/xyz/openseamap/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
      minzoom: 8,
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: 'osm-base-layer',
      type: 'raster',
      source: 'osm-base',
    },
    {
      id: 'openseamap-overlay-layer',
      type: 'raster',
      source: 'openseamap-overlay',
      paint: {
        'raster-opacity': 0.9,
        'raster-fade-duration': 0,
      },
      minzoom: 8,
    },
  ],
};

const GEBCO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'gebco-bathymetry': {
      type: 'raster',
      tiles: ['http://localhost:8088/proxy/wms/gebco/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 18,
      attribution: 'GEBCO',
    },
  },
  layers: [
    {
      id: 'gebco-bathymetry-layer',
      type: 'raster',
      source: 'gebco-bathymetry',
    },
  ],
};

const NOAA_WMS_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'noaa-wms': {
      type: 'raster',
      tiles: ['http://localhost:8088/proxy/wms/noaa-wms/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 18,
      attribution: 'NOAA Office of Coast Survey',
    },
  },
  layers: [
    {
      id: 'noaa-wms-layer',
      type: 'raster',
      source: 'noaa-wms',
    },
  ],
};

export const buildIhmWmsStyle = (chartEngineApiUrl: string): StyleSpecification => {
  const baseUrl = chartEngineApiUrl.replace(/\/$/, '');
  const ihmAttribution = '(c) Instituto Hidrografico de la Marina. Not valid for official navigation.';

  return {
    version: 8,
    sources: {
      'ihm-enc-wmts': {
        type: 'raster',
        tiles: [`${baseUrl}/proxy/xyz/ihm-enc-wmts/{z}/{x}/{y}.png`],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 21,
        attribution: ihmAttribution,
      },
    },
    layers: [
      {
        id: 'ihm-chart-background',
        type: 'background',
        paint: {
          // MapLibre paint cannot consume theme tokens; neutral chart-water fallback.
          'background-color': '#d8e7e7',
        },
      },
      {
        id: 'ihm-enc-wmts-layer',
        type: 'raster',
        source: 'ihm-enc-wmts',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 220,
          'raster-resampling': 'linear',
        },
        minzoom: 0,
        maxzoom: 24,
      },
    ],
    transition: {
      duration: 180,
      delay: 0,
    },
  };
};

/**
 * Built-in styles are serializable MapLibre specifications. Rewrite legacy
 * localhost chart-engine URLs at the application boundary so phones/tablets
 * always request tiles from the configured Raspberry host.
 */
export const bindChartEngineUrl = (
  style: StyleSpecification,
  chartEngineApiUrl: string,
): StyleSpecification => {
  const baseUrl = chartEngineApiUrl.replace(/\/$/, '');
  const serialized = JSON.stringify(style).replaceAll('http://localhost:8088', baseUrl);
  return JSON.parse(serialized) as StyleSpecification;
};

export const CHART_SOURCES: ChartSourceDefinition[] = [
  {
    id: DEFAULT_CHART_SOURCE_ID,
    label: 'OpenStreetMap (OSM)',
    kind: 'raster',
    style: OSM_RASTER_STYLE,
    description: 'OpenStreetMap base map.',
    available: true,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    kind: 'raster',
    description: 'ESRI World Imagery satellite tiles.',
    available: true,
  },
  {
    id: NAUTICAL_CHART_SOURCE_ID,
    label: 'OpenSeaMap',
    kind: 'raster',
    style: NAUTICAL_RASTER_STYLE,
    description: 'OpenStreetMap + OpenSeaMap nautical overlay with buoys, lights, hazards.',
    available: true,
  },
  {
    id: GEBCO_CHART_SOURCE_ID,
    label: 'GEBCO Bathymetry',
    kind: 'bathymetry',
    style: GEBCO_STYLE,
    description: 'Global bathymetry from GEBCO 2026.',
    available: true,
  },
  {
    id: NOAA_WMS_CHART_SOURCE_ID,
    label: 'NOAA Charts (USA)',
    kind: 'raster',
    style: NOAA_WMS_STYLE,
    description: 'Official NOAA chart display for US waters.',
    available: true,
    bounds: [-179, 18, -65, 72],
  },
  {
    id: IHM_WMS_CHART_SOURCE_ID,
    label: 'IHM Spain RasterENC (current)',
    kind: 'raster',
    description: 'Current unified RasterENC WMTS from the IHM, including all published detail levels through zoom 21. Not valid for official navigation.',
    available: true,
    bounds: [-20, 25, 6, 46],
  },
];

export const buildEngineChartStyle = (
  chart: EngineChartSource,
  encConfig: EncLayerConfig,
  safetyDepth: number,
): StyleSpecification => {
  const tileUrl = chart.tileUrl ?? '';
  const bounds = parseEngineBounds(chart.metadata?.['bounds']);
  if (chart.kind === 'vector') {
    return buildEncVectorTileStyle(encConfig, safetyDepth, tileUrl);
  }

  const sourceId = `engine-${chart.id}`;
  const rasterLayer = {
    id: `${sourceId}-layer`,
    type: 'raster' as const,
    source: sourceId,
    paint: {
      'raster-opacity': chart.kind === 'bathymetry' ? 0.62 : 1,
      'raster-fade-duration': 0,
    },
  };

  if (chart.kind === 'bathymetry') {
    return {
      version: 8,
      sources: {
        'osm-base': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
        [sourceId]: {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          minzoom: chart.minZoom ?? 4,
          maxzoom: chart.maxZoom ?? 16,
          attribution: chart.attribution ?? chart.label,
          ...(bounds ? { bounds } : {}),
        },
      },
      layers: [
        {
          id: 'bathymetry-osm-base-layer',
          type: 'raster',
          source: 'osm-base',
        },
        rasterLayer,
      ],
    };
  }

  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: chart.minZoom ?? 0,
        maxzoom: chart.maxZoom ?? 18,
        attribution: chart.attribution ?? chart.label,
        ...(bounds ? { bounds } : {}),
      },
    },
    layers: [rasterLayer],
  };
};

export const buildChartPackageStyle = (
  manifest: PackageManifest,
  charts: EngineChartSource[],
  encConfig: EncLayerConfig,
  safetyDepth: number,
): StyleSpecification => {
  const chartById = new Map(charts.map((chart) => [chart.id, chart]));
  const readyLayers = manifest.layers
    .filter((layer) => layer.state === 'ready' && layer.chartId)
    .map((layer) => ({ layer, chart: chartById.get(layer.chartId!) }))
    .filter((entry): entry is { layer: typeof entry.layer; chart: EngineChartSource } => Boolean(entry.chart?.available));

  const style: StyleSpecification = {
    version: 8,
    sources: {
      'package-osm-base': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'package-osm-base-layer', type: 'raster', source: 'package-osm-base' }],
  };

  for (const { layer, chart } of readyLayers.filter((entry) => entry.chart.kind !== 'vector')) {
    if (!chart.tileUrl) continue;
    const sourceId = `package-${safeStyleId(layer.id)}`;
    style.sources[sourceId] = {
      type: 'raster',
      tiles: [chart.tileUrl],
      tileSize: 256,
      minzoom: chart.minZoom ?? layer.minZoom ?? 0,
      maxzoom: chart.maxZoom ?? layer.maxZoom ?? 18,
      attribution: chart.attribution ?? layer.attribution,
    };
    style.layers.push({
      id: `${sourceId}-layer`,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': layer.role === 'bathymetry' ? 0.68 : 1,
        'raster-fade-duration': 0,
      },
    });
  }

  const officialEnc = readyLayers.find(({ layer, chart }) => layer.role === 'official-enc' && chart.kind === 'vector');
  if (officialEnc?.chart.tileUrl) {
    const encStyle = buildEncVectorTileStyle(encConfig, safetyDepth, officialEnc.chart.tileUrl);
    const vectorSource = encStyle.sources?.['enc-vector'];
    if (vectorSource) style.sources['enc-vector'] = vectorSource;
    if (encStyle.glyphs) style.glyphs = encStyle.glyphs;
    style.layers.push(...encStyle.layers.filter((layer) =>
      layer.type !== 'background'
      && layer.id !== 'enc-vector-base-raster'
      && ('source' in layer ? layer.source !== 'enc-osm-base' : true),
    ));
  }
  return style;
};

const safeStyleId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const parseEngineBounds = (
  value: string | undefined,
): [number, number, number, number] | undefined => {
  const bounds = value?.split(',').map(Number);
  return bounds?.length === 4 && bounds.every(Number.isFinite)
    ? bounds as [number, number, number, number]
    : undefined;
};

const DEFAULT_CHART_SOURCE = CHART_SOURCES[0]!;

export const resolveChartSource = (id?: string): ChartSourceDefinition => {
  if (!id) {
    return DEFAULT_CHART_SOURCE;
  }
  return CHART_SOURCES.find((source) => source.id === id) ?? DEFAULT_CHART_SOURCE;
};

export const resolveChartStyle = (id?: string): StyleSpecification | string => {
  const source = resolveChartSource(id);
  if (source.style) {
    return source.style;
  }
  if (source.styleUrl) {
    return source.styleUrl;
  }
  return DEFAULT_CHART_SOURCE.style ?? OSM_RASTER_STYLE;
};
