import { ChartSourceConfig } from '../chart-source.types';

export const LOCAL_RASTER_SOURCE: ChartSourceConfig = {
  id: 'local-raster',
  name: 'Local Charts',
  description: 'Raster charts served from local Signal K server',
  type: 'raster',
  attribution: 'Local Data',
  style: {
    version: 8,
    sources: {
      'local-tiles': {
        type: 'raster',
        tiles: ['http://localhost:8080/tiles/{z}/{x}/{y}.png'],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'local-tiles-layer',
        type: 'raster',
        source: 'local-tiles',
      },
    ],
  },
};
