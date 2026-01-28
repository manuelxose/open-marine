import { ChartSourceConfig } from '../chart-source.types';

export const LOCAL_VECTOR_SOURCE: ChartSourceConfig = {
  id: 'local-vector',
  name: 'Vector Charts (Beta)',
  description: 'Vector-based nautical charts (In Development)',
  type: 'vector',
  attribution: 'OpenCPN / O-Charts',
  style: {
    version: 8,
    sources: {
      'local-vector': {
        type: 'vector',
        tiles: ['/vector-tiles/{z}/{x}/{y}.pbf'],
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#1a1a1a',
        },
      },
      // Placeholder for actual nautical vector layers
    ],
  },
};
