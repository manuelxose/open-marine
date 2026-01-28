# Adding Chart Sources

The OMI dashboard supports pluggable chart sources. To add a new source:

1.  **Create a source definition**:
    Create a new file in `src/app/core/chart-sources/builtins/` (e.g., `my-source.ts`).
    Implement the `ChartSourceConfig` interface.

    ```typescript
    import { ChartSourceConfig } from '../chart-source.types';

    export const MY_CUSTOM_SOURCE: ChartSourceConfig = {
      id: 'my-source',
      name: 'Custom Chart Source',
      type: 'raster', // or 'vector'
      style: {
        version: 8,
        sources: {
          'custom-tiles': {
            type: 'raster',
            tiles: ['https://tiles.example.com/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'custom-layer',
            type: 'raster',
            source: 'custom-tiles',
          },
        ],
      },
    };
    ```

2.  **Register the source**:
    Open `src/app/core/chart-sources/chart-source.registry.ts` and import your new source.
    Call `this.register(MY_CUSTOM_SOURCE)` in the constructor.

    ```typescript
    import { MY_CUSTOM_SOURCE } from './builtins/my-source';
    // ...
    constructor() {
      // ...
      this.register(MY_CUSTOM_SOURCE);
    }
    ```

3.  **Use it**:
    The new source will automatically appear in the **Settings** menu under **Chart Imagery**.

## Style Specification
OMI uses [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/style-spec/). The `style` property in `ChartSourceConfig` accepts a full MapLibre style object or a URL to a style JSON.
