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

export const CHART_SOURCES: ChartSourceDefinition[] = [
  {
    id: DEFAULT_CHART_SOURCE_ID,
    label: 'OpenStreetMap (Raster)',
    kind: 'raster',
    style: OSM_RASTER_STYLE,
    description: 'Development raster tiles over HTTPS.',
    available: true,
  },
  {
    id: 'nautical-raster',
    label: 'Nautical Raster (Placeholder)',
    kind: 'raster',
    styleUrl: 'https://charts.example.com/tiles/{z}/{x}/{y}.png',
    description: 'XYZ raster charts (configure local tile server).',
    available: false,
  },
  {
    id: 'nautical-vector',
    label: 'Nautical Vector (Placeholder)',
    kind: 'vector',
    styleUrl: 'https://charts.example.com/style.json',
    description: 'MVT + style.json (configure local style service).',
    available: false,
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
