import type { StyleSpecification } from 'maplibre-gl';
import { buildEncStyle, buildEncVectorTileStyle } from '../../features/chart/layers/enc-style';
import type { EncLayerConfig } from '../../features/chart/services/chart-settings.service';
import type { EngineChartSource } from './chart-engine-api.service';

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

const ENC_DEFAULT_STYLE: StyleSpecification = buildEncStyle(
  {
    showDepthAreas: true,
    showDepthContours: true,
    showBuoys: true,
    showHazards: true,
    showAnchorages: true,
    showTSS: true,
    showLights: true,
  },
  2.0,
);

const LOCAL_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'local-raster-chart': {
      type: 'raster',
      tiles: ['http://localhost:8088/charts/local-raster-demo/raster/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 18,
      attribution: 'Local chart data',
    },
  },
  layers: [
    {
      id: 'local-raster-chart',
      type: 'raster',
      source: 'local-raster-chart',
    },
  ],
};

const BATHYMETRY_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-base': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    'emodnet-bathymetry': {
      type: 'raster',
      tiles: ['http://localhost:8088/proxy/wms/emodnet-bathymetry/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 4,
      maxzoom: 16,
      attribution: 'EMODnet Bathymetry',
    },
  },
  layers: [
    {
      id: 'bathymetry-osm-base-layer',
      type: 'raster',
      source: 'osm-base',
    },
    {
      id: 'emodnet-bathymetry-layer',
      type: 'raster',
      source: 'emodnet-bathymetry',
      paint: {
        'raster-opacity': 0.62,
        'raster-fade-duration': 0,
      },
      minzoom: 4,
    },
  ],
};

const ENC_VECTOR_STYLE: StyleSpecification = buildEncVectorTileStyle(
  {
    showDepthAreas: true,
    showDepthContours: true,
    showBuoys: true,
    showHazards: true,
    showAnchorages: true,
    showTSS: true,
    showLights: true,
  },
  2.0,
);

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
  const purposes = [
    { id: 'ihm-enc-p2', minzoom: 4, maxzoom: 6, opacity: 0.76 },
    { id: 'ihm-enc-p3', minzoom: 6, maxzoom: 9, opacity: 0.8 },
    { id: 'ihm-enc-p4', minzoom: 9, maxzoom: 12, opacity: 0.84 },
    { id: 'ihm-enc-p5', minzoom: 12, maxzoom: 16, opacity: 0.9 },
  ] as const;

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
    ...Object.fromEntries(purposes.map((purpose) => [
      purpose.id,
      {
        type: 'raster',
        tiles: [`${baseUrl}/proxy/wms/${purpose.id}/{z}/{x}/{y}.png`],
        tileSize: 256,
        minzoom: purpose.minzoom,
        maxzoom: purpose.maxzoom,
        attribution: ihmAttribution,
      },
    ])),
  },
  layers: [
    {
      id: 'osm-base-layer',
      type: 'raster',
      source: 'osm-base',
    },
    ...purposes.map((purpose) => ({
      id: `${purpose.id}-layer`,
      type: 'raster' as const,
      source: purpose.id,
      paint: {
        'raster-opacity': purpose.opacity,
        'raster-fade-duration': 0,
      },
      minzoom: purpose.minzoom,
      maxzoom: purpose.maxzoom,
    })),
  ],
};
};

export const CHART_SOURCES: ChartSourceDefinition[] = [
  {
    id: DEFAULT_CHART_SOURCE_ID,
    label: 'Map',
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
    label: 'Nautical',
    kind: 'raster',
    style: NAUTICAL_RASTER_STYLE,
    description: 'OpenStreetMap + OpenSeaMap nautical overlay with buoys, lights, hazards.',
    available: true,
  },
  {
    id: ENC_CHART_SOURCE_ID,
    label: 'ENC',
    kind: 'vector',
    style: ENC_DEFAULT_STYLE,
    description: 'Demo vector ENC chart style with semantic nautical layers.',
    available: true,
  },
  {
    id: LOCAL_RASTER_CHART_SOURCE_ID,
    label: 'Local Raster',
    kind: 'raster',
    style: LOCAL_RASTER_STYLE,
    description: 'Local legal raster chart tiles served by the chart engine.',
    available: true,
  },
  {
    id: BATHYMETRY_CHART_SOURCE_ID,
    label: 'Bathymetry',
    kind: 'bathymetry',
    style: BATHYMETRY_STYLE,
    description: 'EMODnet bathymetry overlay through the chart engine.',
    available: true,
  },
  {
    id: ENC_VECTOR_CHART_SOURCE_ID,
    label: 'Real ENC / Local ENC',
    kind: 'vector',
    style: ENC_VECTOR_STYLE,
    description: 'Local ENC vector tiles served by the chart engine. Falls back gracefully while tiles are unavailable.',
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
  },
  {
    id: IHM_WMS_CHART_SOURCE_ID,
    label: 'IHM Spain ENC',
    kind: 'raster',
    description: 'Spanish IHM ENC via WMS. Not valid for official navigation.',
    available: true,
  },
];

export const buildEngineChartStyle = (
  chart: EngineChartSource,
  encConfig: EncLayerConfig,
  safetyDepth: number,
): StyleSpecification => {
  const tileUrl = chart.tileUrl ?? '';
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
      },
    },
    layers: [rasterLayer],
  };
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
