import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import type { EncLayerConfig } from '../services/chart-settings.service';

export const ENC_COLORS = {
  depth_very_shallow: '#aee4f5',
  depth_shallow: '#c9ecf7',
  depth_moderate: '#d8f0f9',
  depth_deep: '#e8f6fb',
  depth_very_deep: '#f0f9fd',
  depth_unsafe: '#ff6b6b33',
  land: '#f5f0e8',
  intertidal: '#d4c9a8',
  buoy_port: '#cc2222',
  buoy_starboard: '#1a7a1a',
  buoy_safe_water: '#cc2222',
  buoy_special: '#ffaa00',
  buoy_cardinal_n: '#1a1a1a',
  buoy_cardinal_s: '#ffff00',
  light_flare: '#ffff88',
  hazard_rock: '#8b0000',
  hazard_wreck: '#8b4500',
  hazard_obstruction: '#8b6914',
  anchorage: '#002299',
  tss: '#00229922',
  restricted: '#cc000022',
  depth_contour: '#7ab3c8',
  depth_label: '#2a6080',
  shoreline: '#4a7c59',
  text_nautical: '#1a3a5c',
} as const;

const MAPLIBRE_GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
const ENC_FONT_REGULAR = ['Noto Sans Regular'];
const ENC_FONT_BOLD = ['Noto Sans Bold'];

const makeRect = (
  centerLat: number,
  centerLon: number,
  latHalf: number,
  lonHalf: number,
  props: Record<string, unknown>,
): Feature<Polygon, Record<string, unknown>> => ({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [centerLon - lonHalf, centerLat - latHalf],
      [centerLon + lonHalf, centerLat - latHalf],
      [centerLon + lonHalf, centerLat + latHalf],
      [centerLon - lonHalf, centerLat + latHalf],
      [centerLon - lonHalf, centerLat - latHalf],
    ]],
  },
  properties: props,
});

const DEPTH_AREAS_DEMO: FeatureCollection<Polygon, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    makeRect(42.24, -8.72, 0.005, 0.010, { drval1: 0, drval2: 2 }),
    makeRect(42.24, -8.72, 0.010, 0.020, { drval1: 2, drval2: 5 }),
    makeRect(42.24, -8.72, 0.016, 0.032, { drval1: 5, drval2: 10 }),
    makeRect(42.24, -8.72, 0.024, 0.048, { drval1: 10, drval2: 20 }),
    makeRect(42.24, -8.72, 0.034, 0.070, { drval1: 20, drval2: 9999 }),
  ],
};

const DEPTH_CONTOURS_DEMO: FeatureCollection<LineString, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-8.76, 42.22], [-8.74, 42.23], [-8.72, 42.22], [-8.70, 42.23], [-8.68, 42.22],
        ],
      },
      properties: { valdco: 5, label: '5' },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-8.78, 42.21], [-8.75, 42.22], [-8.72, 42.21], [-8.69, 42.22], [-8.66, 42.21],
        ],
      },
      properties: { valdco: 10, label: '10' },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-8.80, 42.20], [-8.76, 42.21], [-8.72, 42.20], [-8.68, 42.21], [-8.64, 42.20],
        ],
      },
      properties: { valdco: 20, label: '20' },
    },
  ],
};

const BUOYS_DEMO: FeatureCollection<Point, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.74, 42.24] },
      properties: { type: 'port', name: 'B1', color: 'red' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.70, 42.24] },
      properties: { type: 'starboard', name: 'B2', color: 'green' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.72, 42.26] },
      properties: { type: 'cardinal_n', name: 'VQ', color: 'black' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.75, 42.22] },
      properties: { type: 'safe_water', name: 'FAIRWAY', color: 'rw' },
    },
  ],
};

const HAZARDS_DEMO: FeatureCollection<Point, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.73, 42.23] },
      properties: { type: 'rock_awash', name: 'Roca Seca' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.71, 42.25] },
      properties: { type: 'wreck', name: 'Pecio' },
    },
  ],
};

const ANCHORAGES_DEMO: FeatureCollection<Polygon, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    makeRect(42.27, -8.73, 0.01, 0.015, { name: 'Fondeo Norte' }),
  ],
};

const TSS_DEMO: FeatureCollection<Polygon, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    makeRect(42.205, -8.745, 0.012, 0.028, { name: 'Separacion trafico' }),
  ],
};

const LIGHTS_DEMO: FeatureCollection<Point, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.705, 42.245] },
      properties: { name: 'Luz Puerto', category: 'leading' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-8.735, 42.255] },
      properties: { name: 'Faro Costero', category: 'major' },
    },
  ],
};

export function buildEncStyle(config: EncLayerConfig, safetyDepth = 2.0): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    glyphs: MAPLIBRE_GLYPHS_URL,
    sources: {
      'enc-osm-base': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      'enc-depth-areas': {
        type: 'geojson',
        data: DEPTH_AREAS_DEMO,
      },
      'enc-depth-contours': {
        type: 'geojson',
        data: DEPTH_CONTOURS_DEMO,
      },
      'enc-buoys': {
        type: 'geojson',
        data: BUOYS_DEMO,
      },
      'enc-hazards': {
        type: 'geojson',
        data: HAZARDS_DEMO,
      },
      'enc-anchorages': {
        type: 'geojson',
        data: ANCHORAGES_DEMO,
      },
      'enc-tss': {
        type: 'geojson',
        data: TSS_DEMO,
      },
      'enc-lights': {
        type: 'geojson',
        data: LIGHTS_DEMO,
      },
    },
    layers: [
      {
        id: 'enc-base-raster',
        type: 'raster',
        source: 'enc-osm-base',
        paint: {
          'raster-saturation': -0.35,
          'raster-brightness-min': 0.2,
          'raster-opacity': 0.82,
        },
      },
    ],
  };

  if (config.showDepthAreas) {
    style.layers.push(
      {
        id: 'enc-depth-very-deep',
        type: 'fill',
        source: 'enc-depth-areas',
        filter: ['>', ['get', 'drval2'], 20] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_very_deep,
          'fill-opacity': 0.12,
        },
      } as any,
      {
        id: 'enc-depth-deep',
        type: 'fill',
        source: 'enc-depth-areas',
        filter: ['all', ['>', ['get', 'drval2'], 10], ['<=', ['get', 'drval2'], 20]] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_deep,
          'fill-opacity': 0.17,
        },
      } as any,
      {
        id: 'enc-depth-moderate',
        type: 'fill',
        source: 'enc-depth-areas',
        filter: ['all', ['>', ['get', 'drval2'], 5], ['<=', ['get', 'drval2'], 10]] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_moderate,
          'fill-opacity': 0.23,
        },
      } as any,
      {
        id: 'enc-depth-shallow',
        type: 'fill',
        source: 'enc-depth-areas',
        filter: ['all', ['>', ['get', 'drval2'], safetyDepth], ['<=', ['get', 'drval2'], 5]] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_shallow,
          'fill-opacity': 0.28,
        },
      } as any,
      {
        id: 'enc-depth-very-shallow',
        type: 'fill',
        source: 'enc-depth-areas',
        filter: ['<=', ['get', 'drval2'], safetyDepth] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_unsafe,
          'fill-opacity': 0.45,
        },
      } as any,
    );
  }

  if (config.showTSS) {
    style.layers.push(
      {
        id: 'enc-tss-fill',
        type: 'fill',
        source: 'enc-tss',
        paint: {
          'fill-color': ENC_COLORS.tss,
          'fill-opacity': 0.22,
        },
        minzoom: 10,
      } as any,
      {
        id: 'enc-tss-line',
        type: 'line',
        source: 'enc-tss',
        paint: {
          'line-color': '#002299',
          'line-width': 1.1,
          'line-dasharray': [4, 2],
          'line-opacity': 0.6,
        },
        minzoom: 10,
      } as any,
    );
  }

  if (config.showAnchorages) {
    style.layers.push(
      {
        id: 'enc-anchorage-fill',
        type: 'fill',
        source: 'enc-anchorages',
        paint: {
          'fill-color': '#0022aa11',
          'fill-outline-color': ENC_COLORS.anchorage,
        },
        minzoom: 10,
      } as any,
      {
        id: 'enc-anchorage-label',
        type: 'symbol',
        source: 'enc-anchorages',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 11,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': ENC_COLORS.anchorage,
          'text-halo-color': 'rgba(255,255,255,0.8)',
          'text-halo-width': 1.5,
        },
        minzoom: 12,
      } as any,
    );
  }

  if (config.showDepthContours) {
    style.layers.push(
      {
        id: 'enc-contour-line',
        type: 'line',
        source: 'enc-depth-contours',
        paint: {
          'line-color': ENC_COLORS.depth_contour,
          'line-width': ['interpolate', ['linear'], ['get', 'valdco'], 5, 0.8, 10, 1.2, 20, 1.8, 50, 2.5] as any,
          'line-opacity': 0.7,
        },
      } as any,
      {
        id: 'enc-contour-label',
        type: 'symbol',
        source: 'enc-depth-contours',
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'label'],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 10,
          'text-max-angle': 30,
        },
        paint: {
          'text-color': ENC_COLORS.depth_label,
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
        },
        minzoom: 12,
      } as any,
    );
  }

  if (config.showHazards) {
    style.layers.push(
      {
        id: 'enc-hazard-circle',
        type: 'circle',
        source: 'enc-hazards',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 10] as any,
          'circle-color': [
            'match',
            ['get', 'type'],
            'rock_awash',
            ENC_COLORS.hazard_rock,
            'wreck',
            ENC_COLORS.hazard_wreck,
            ENC_COLORS.hazard_obstruction,
          ] as any,
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
        minzoom: 11,
      } as any,
      {
        id: 'enc-hazard-label',
        type: 'symbol',
        source: 'enc-hazards',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
        },
        paint: {
          'text-color': ENC_COLORS.hazard_rock,
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
        },
        minzoom: 13,
      } as any,
    );
  }

  if (config.showBuoys) {
    style.layers.push(
      {
        id: 'enc-buoy-circle',
        type: 'circle',
        source: 'enc-buoys',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 8] as any,
          'circle-color': [
            'match',
            ['get', 'type'],
            'port',
            ENC_COLORS.buoy_port,
            'starboard',
            ENC_COLORS.buoy_starboard,
            'cardinal_n',
            ENC_COLORS.buoy_cardinal_n,
            'cardinal_s',
            ENC_COLORS.buoy_cardinal_s,
            'safe_water',
            ENC_COLORS.buoy_safe_water,
            ENC_COLORS.buoy_special,
          ] as any,
          'circle-stroke-color': 'white',
          'circle-stroke-width': 2,
        },
        minzoom: 10,
      } as any,
      {
        id: 'enc-buoy-label',
        type: 'symbol',
        source: 'enc-buoys',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_BOLD,
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.0],
        },
        paint: {
          'text-color': ENC_COLORS.text_nautical,
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 2,
        },
        minzoom: 12,
      } as any,
    );
  }

  if (config.showLights) {
    style.layers.push(
      {
        id: 'enc-light-flare',
        type: 'circle',
        source: 'enc-lights',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 6] as any,
          'circle-color': ENC_COLORS.light_flare,
          'circle-opacity': 0.85,
          'circle-stroke-color': '#b38f00',
          'circle-stroke-width': 1,
        },
        minzoom: 11,
      } as any,
      {
        id: 'enc-light-label',
        type: 'symbol',
        source: 'enc-lights',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 10,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.8],
        },
        paint: {
          'text-color': '#7a5a00',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 1.5,
        },
        minzoom: 13,
      } as any,
    );
  }

  return style;
}

export function buildEncVectorTileStyle(
  config: EncLayerConfig,
  safetyDepth = 2.0,
  tileUrl = 'http://localhost:8088/charts/local-enc-vector-demo/vector/{z}/{x}/{y}.pbf',
): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    glyphs: MAPLIBRE_GLYPHS_URL,
    sources: {
      'enc-osm-base': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      'enc-vector': {
        type: 'vector',
        tiles: [tileUrl],
        minzoom: 4,
        maxzoom: 16,
        attribution: 'Local ENC vector data',
      },
    },
    layers: [
      {
        id: 'enc-vector-base-raster',
        type: 'raster',
        source: 'enc-osm-base',
        paint: {
          'raster-saturation': -0.35,
          'raster-brightness-min': 0.2,
          'raster-opacity': 0.82,
        },
      },
      {
        id: 'enc-vector-land',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'land',
        paint: {
          'fill-color': ENC_COLORS.land,
          'fill-opacity': 0.92,
        },
      } as any,
      {
        id: 'enc-vector-shoreline',
        type: 'line',
        source: 'enc-vector',
        'source-layer': 'shoreline',
        paint: {
          'line-color': ENC_COLORS.shoreline,
          'line-width': 1.2,
          'line-opacity': 0.78,
        },
      } as any,
    ],
  };

  if (config.showDepthAreas) {
    style.layers.push(
      {
        id: 'enc-vector-depth-very-deep',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'depth_areas',
        filter: ['>', ['get', 'drval2'], 20] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_very_deep,
          'fill-opacity': 0.12,
        },
      } as any,
      {
        id: 'enc-vector-depth-deep',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'depth_areas',
        filter: ['all', ['>', ['get', 'drval2'], 10], ['<=', ['get', 'drval2'], 20]] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_deep,
          'fill-opacity': 0.17,
        },
      } as any,
      {
        id: 'enc-vector-depth-moderate',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'depth_areas',
        filter: ['all', ['>', ['get', 'drval2'], 5], ['<=', ['get', 'drval2'], 10]] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_moderate,
          'fill-opacity': 0.23,
        },
      } as any,
      {
        id: 'enc-vector-depth-shallow',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'depth_areas',
        filter: ['all', ['>', ['get', 'drval2'], safetyDepth], ['<=', ['get', 'drval2'], 5]] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_shallow,
          'fill-opacity': 0.28,
        },
      } as any,
      {
        id: 'enc-vector-depth-unsafe',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'depth_areas',
        filter: ['<=', ['get', 'drval2'], safetyDepth] as any,
        paint: {
          'fill-color': ENC_COLORS.depth_unsafe,
          'fill-opacity': 0.45,
        },
      } as any,
    );
  }

  if (config.showTSS) {
    style.layers.push(
      {
        id: 'enc-vector-tss-fill',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'traffic_separation',
        paint: {
          'fill-color': ENC_COLORS.tss,
          'fill-opacity': 0.22,
        },
        minzoom: 10,
      } as any,
      {
        id: 'enc-vector-tss-line',
        type: 'line',
        source: 'enc-vector',
        'source-layer': 'traffic_separation',
        paint: {
          'line-color': ENC_COLORS.anchorage,
          'line-width': 1.1,
          'line-dasharray': [4, 2],
          'line-opacity': 0.6,
        },
        minzoom: 10,
      } as any,
    );
  }

  if (config.showAnchorages) {
    style.layers.push(
      {
        id: 'enc-vector-anchorage-fill',
        type: 'fill',
        source: 'enc-vector',
        'source-layer': 'anchorages',
        paint: {
          'fill-color': '#0022aa11',
          'fill-outline-color': ENC_COLORS.anchorage,
        },
        minzoom: 10,
      } as any,
      {
        id: 'enc-vector-anchorage-label',
        type: 'symbol',
        source: 'enc-vector',
        'source-layer': 'anchorages',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 11,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': ENC_COLORS.anchorage,
          'text-halo-color': 'rgba(255,255,255,0.8)',
          'text-halo-width': 1.5,
        },
        minzoom: 12,
      } as any,
    );
  }

  if (config.showDepthContours) {
    style.layers.push(
      {
        id: 'enc-vector-contour-line',
        type: 'line',
        source: 'enc-vector',
        'source-layer': 'depth_contours',
        paint: {
          'line-color': ENC_COLORS.depth_contour,
          'line-width': ['interpolate', ['linear'], ['get', 'valdco'], 5, 0.8, 10, 1.2, 20, 1.8, 50, 2.5] as any,
          'line-opacity': 0.7,
        },
      } as any,
      {
        id: 'enc-vector-contour-label',
        type: 'symbol',
        source: 'enc-vector',
        'source-layer': 'depth_contours',
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'label'], ['to-string', ['get', 'valdco']]],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 10,
          'text-max-angle': 30,
        },
        paint: {
          'text-color': ENC_COLORS.depth_label,
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
        },
        minzoom: 12,
      } as any,
      {
        id: 'enc-vector-soundings',
        type: 'symbol',
        source: 'enc-vector',
        'source-layer': 'soundings',
        layout: {
          'text-field': ['to-string', ['get', 'depth']],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 10,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ENC_COLORS.depth_label,
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.2,
        },
        minzoom: 14,
      } as any,
    );
  }

  if (config.showHazards) {
    style.layers.push(
      {
        id: 'enc-vector-hazard-circle',
        type: 'circle',
        source: 'enc-vector',
        'source-layer': 'hazards',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 10] as any,
          'circle-color': [
            'match',
            ['get', 'type'],
            'rock_awash',
            ENC_COLORS.hazard_rock,
            'wreck',
            ENC_COLORS.hazard_wreck,
            ENC_COLORS.hazard_obstruction,
          ] as any,
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
        minzoom: 11,
      } as any,
    );
  }

  if (config.showBuoys) {
    style.layers.push(
      {
        id: 'enc-vector-buoy-circle',
        type: 'circle',
        source: 'enc-vector',
        'source-layer': 'buoys',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 8] as any,
          'circle-color': [
            'match',
            ['get', 'type'],
            'port',
            ENC_COLORS.buoy_port,
            'starboard',
            ENC_COLORS.buoy_starboard,
            'cardinal_n',
            ENC_COLORS.buoy_cardinal_n,
            'cardinal_s',
            ENC_COLORS.buoy_cardinal_s,
            'safe_water',
            ENC_COLORS.buoy_safe_water,
            ENC_COLORS.buoy_special,
          ] as any,
          'circle-stroke-color': 'white',
          'circle-stroke-width': 2,
        },
        minzoom: 10,
      } as any,
      {
        id: 'enc-vector-buoy-label',
        type: 'symbol',
        source: 'enc-vector',
        'source-layer': 'buoys',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_BOLD,
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.0],
        },
        paint: {
          'text-color': ENC_COLORS.text_nautical,
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 2,
        },
        minzoom: 12,
      } as any,
    );
  }

  if (config.showLights) {
    style.layers.push(
      {
        id: 'enc-vector-light-flare',
        type: 'circle',
        source: 'enc-vector',
        'source-layer': 'lights',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 6] as any,
          'circle-color': ENC_COLORS.light_flare,
          'circle-opacity': 0.85,
          'circle-stroke-color': '#b38f00',
          'circle-stroke-width': 1,
        },
        minzoom: 11,
      } as any,
      {
        id: 'enc-vector-light-label',
        type: 'symbol',
        source: 'enc-vector',
        'source-layer': 'lights',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ENC_FONT_REGULAR,
          'text-size': 10,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.8],
        },
        paint: {
          'text-color': '#7a5a00',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 1.5,
        },
        minzoom: 13,
      } as any,
    );
  }

  return style;
}
