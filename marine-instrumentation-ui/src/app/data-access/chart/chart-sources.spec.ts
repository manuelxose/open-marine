import {
  bindChartEngineUrl,
  buildChartPackageStyle,
  buildEngineChartStyle,
  buildIhmWmsStyle,
  CHART_SOURCES,
  NAUTICAL_RASTER_STYLE,
} from './chart-sources';
import type { RasterLayerSpecification } from 'maplibre-gl';
import type { PackageManifest } from './chart-remote-catalog.service';

describe('chart source environment binding', () => {
  it('rewrites chart-engine localhost URLs for LAN clients without mutating the source style', () => {
    const bound = bindChartEngineUrl(NAUTICAL_RASTER_STYLE, 'http://192.168.1.43:8088/');
    const serialized = JSON.stringify(bound);

    expect(serialized).toContain('http://192.168.1.43:8088/proxy/xyz/openseamap');
    expect(serialized).not.toContain('localhost:8088');
    expect(JSON.stringify(NAUTICAL_RASTER_STYLE)).toContain('localhost:8088');
  });
});

describe('canonical chart inventory', () => {
  it('contains no demo or duplicate bathymetry sources', () => {
    expect(CHART_SOURCES.map((source) => source.id)).not.toContain('enc');
    expect(CHART_SOURCES.map((source) => source.id)).not.toContain('local-raster');
    expect(CHART_SOURCES.map((source) => source.id)).not.toContain('enc-vector');
    expect(CHART_SOURCES.filter((source) => source.label === 'Bathymetry')).toHaveLength(0);
  });

  it('declares regional coverage for NOAA and IHM', () => {
    expect(CHART_SOURCES.find((source) => source.id === 'noaa-wms')?.bounds).toBeDefined();
    expect(CHART_SOURCES.find((source) => source.id === 'ihm-enc-wms')?.bounds).toBeDefined();
  });
});

describe('IHM Spain current WMTS style', () => {
  it('uses the current unified RasterENC WMTS through zoom 21 without OSM', () => {
    const style = buildIhmWmsStyle('http://192.168.1.43:8088');
    const serialized = JSON.stringify(style);

    expect(serialized).not.toContain('openstreetmap');
    expect(style.sources?.['osm-base']).toBeUndefined();
    expect(style.layers[0]?.id).toBe('ihm-chart-background');
    expect(style.layers.filter((layer) => layer.type === 'raster')).toHaveLength(1);

    const source = style.sources?.['ihm-enc-wmts'] as {
      minzoom?: number;
      maxzoom?: number;
      tiles?: string[];
    };
    const layer = style.layers.find((candidate) => candidate.id === 'ihm-enc-wmts-layer') as RasterLayerSpecification;
    expect(source).toMatchObject({ minzoom: 0, maxzoom: 21 });
    expect(source.tiles?.[0]).toContain('/proxy/xyz/ihm-enc-wmts/');
    expect(layer?.minzoom).toBe(0);
    expect(layer?.maxzoom).toBe(24);
    expect(layer?.paint?.['raster-fade-duration']).toBe(220);
  });
});

describe('local raster chart coverage', () => {
  it('adds MBTiles bounds to the MapLibre raster source to avoid out-of-coverage requests', () => {
    const style = buildEngineChartStyle({
      id: 'ria-vigo-bathymetry',
      label: 'Ria de Vigo bathymetry',
      kind: 'raster',
      available: true,
      tileUrl: 'http://localhost:8088/charts/ria-vigo-bathymetry/raster/{z}/{x}/{y}.png',
      metadata: { bounds: '-9.05,42.05,-8.4,42.4' },
    }, {
      showDepthAreas: true,
      showDepthContours: true,
      showBuoys: true,
      showHazards: true,
      showAnchorages: true,
      showTSS: true,
      showLights: true,
    }, 9.5);

    expect((style.sources?.['engine-ria-vigo-bathymetry'] as { bounds?: number[] }).bounds)
      .toEqual([-9.05, 42.05, -8.4, 42.4]);
  });
});

describe('multi-layer area package style', () => {
  it('combines bathymetry and official ENC without covering bathymetry with a second OSM layer', () => {
    const now = new Date().toISOString();
    const manifest: PackageManifest = {
      id: 'vigo',
      name: 'Vigo',
      geometry: { type: 'Polygon', coordinates: [[[-9, 42], [-8, 42], [-8, 43], [-9, 43], [-9, 42]]] },
      bounds: [-9, 42, -8, 43],
      profile: 'recommended',
      layers: [
        {
          id: 'bathy', providerId: 'emodnet-bathymetry', label: 'Bathymetry', role: 'bathymetry',
          official: false, required: false, acquisition: 'automatic', state: 'ready',
          bounds: [-9, 42, -8, 43], attribution: 'EMODnet', license: 'CC BY 4.0',
          navigationUse: 'supplementary', chartId: 'vigo-bathy',
        },
        {
          id: 'enc', providerId: 'ihm-s63', label: 'IHM ENC', role: 'official-enc',
          official: true, required: true, acquisition: 'licensed-import', state: 'ready',
          bounds: [-9, 42, -8, 43], attribution: 'IHM', license: 'Licensed',
          navigationUse: 'official-source', chartId: 'vigo-enc',
        },
      ],
      licenses: [],
      estimatedBytes: 1,
      storageBudgetBytes: 100,
      availableBytes: 1_000,
      minimumFreeBytes: 10,
      state: 'ready',
      version: 1,
      createdAt: now,
      updatedAt: now,
      warnings: [],
      disclaimer: 'Not ECDIS',
    };
    const style = buildChartPackageStyle(manifest, [
      { id: 'vigo-bathy', label: 'Bathy', kind: 'raster', available: true, tileUrl: '/bathy/{z}/{x}/{y}.png' },
      { id: 'vigo-enc', label: 'ENC', kind: 'vector', available: true, tileUrl: '/enc/{z}/{x}/{y}.pbf' },
    ], {
      showDepthAreas: true, showDepthContours: true, showBuoys: true, showHazards: true,
      showAnchorages: true, showTSS: true, showLights: true,
    }, 9.5);

    expect(style.sources['package-bathy']).toBeDefined();
    expect(style.sources['enc-vector']).toBeDefined();
    expect(style.sources['enc-osm-base']).toBeUndefined();
    expect(style.layers.some((layer) => layer.id === 'enc-vector-base-raster')).toBe(false);
  });
});
