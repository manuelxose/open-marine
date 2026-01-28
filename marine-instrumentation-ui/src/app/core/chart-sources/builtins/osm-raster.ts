import { ChartSourceConfig } from '../chart-source.types';

export const OSM_RASTER_SOURCE: ChartSourceConfig = {
  id: 'osm-raster',
  name: 'OpenStreetMap',
  description: 'Standard OpenStreetMap raster tiles',
  type: 'raster',
  attribution: '© OpenStreetMap contributors',
  style: {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm-tiles-layer',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
};
