import type { StyleSpecification } from 'maplibre-gl';

export type ChartSourceKind = 'raster' | 'vector';

export interface ChartSourceDefinition {
  id: string;
  label: string;
  kind: ChartSourceKind;
  style?: StyleSpecification;
  styleUrl?: string;
  description?: string;
  available?: boolean;
}

export const DEFAULT_CHART_SOURCE_ID = 'osm-raster';
export const NAUTICAL_CHART_SOURCE_ID = 'nautical';

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    'openseamap-overlay': {
      type: 'raster',
      tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
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
        'raster-fade-duration': 200,
      },
      minzoom: 8,
    },
  ],
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
];

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
