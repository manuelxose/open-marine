import { MapLibreEngineService, environmentPopupDetails } from './maplibre-engine.service';

interface FakeMap {
  loaded: boolean;
  sources: Set<string>;
  layers: Set<string>;
  addedLayers: Array<{ id: string; type: string; filter?: unknown; layout?: Record<string, unknown>; paint?: Record<string, unknown> }>;
  paintUpdates: Array<{ layerId: string; property: string; value: unknown }>;
  isStyleLoaded(): boolean;
  getSource(id: string): object | undefined;
  addSource(id: string): void;
  getLayer(id: string): object | undefined;
  addLayer(layer: { id: string; type: string; filter?: unknown; layout?: Record<string, unknown>; paint?: Record<string, unknown> }): void;
  removeLayer(id: string): void;
  removeSource(id: string): void;
  setPaintProperty(layerId: string, property: string, value: unknown): void;
}

interface MapLibreEngineHarness {
  map: FakeMap;
  mapReady: boolean;
  styleGeneration: number;
  styleReadyGeneration: number;
  initializedStyleGeneration: number;
  styleInitFrames: Set<number>;
  styleInitIdle: number | null;
  styleInitTimer: ReturnType<typeof setTimeout> | null;
  weatherApplyFrame: number | null;
  environmentApplyFrame: number | null;
  weatherLayers: Map<string, { tileUrl: string | null; visible: boolean }>;
  environmentVectors: Map<string, { dataUrl: string | null; visible: boolean }>;
  activeParticleLayers: Map<string, { setOpacity(opacity: number): void }>;
  weatherOpacity: number;
  cancelFrame(handle: number): void;
  applyWeatherOverlays(generation: number): void;
  applyEnvironmentVectors(generation: number): void;
  beginStyleChange(): void;
}

const fakeMap = (): FakeMap => ({
  loaded: false,
  sources: new Set<string>(),
  layers: new Set<string>(),
  addedLayers: [],
  paintUpdates: [],
  isStyleLoaded() { return this.loaded; },
  getSource(id) { return this.sources.has(id) ? {} : undefined; },
  addSource(id) { this.sources.add(id); },
  getLayer(id) { return this.layers.has(id) ? {} : undefined; },
  addLayer(layer) {
    this.layers.add(layer.id);
    this.addedLayers.push(layer);
  },
  removeLayer(id) { this.layers.delete(id); },
  removeSource(id) { this.sources.delete(id); },
  setPaintProperty(layerId, property, value) {
    this.paintUpdates.push({ layerId, property, value });
  },
});

const createEngine = (map: FakeMap) => {
  const engine = Object.create(MapLibreEngineService.prototype) as MapLibreEngineHarness;
  engine.map = map;
  engine.mapReady = false;
  engine.styleGeneration = 20;
  engine.styleReadyGeneration = 19;
  engine.initializedStyleGeneration = 0;
  engine.styleInitFrames = new Set<number>();
  engine.styleInitIdle = null;
  engine.styleInitTimer = null;
  engine.weatherApplyFrame = null;
  engine.environmentApplyFrame = null;
  engine.weatherLayers = new Map([
    ['wind', { tileUrl: 'http://localhost/weather/{z}/{x}/{y}.png', visible: true }],
  ]);
  engine.environmentVectors = new Map();
  engine.activeParticleLayers = new Map();
  engine.weatherOpacity = 0.6;
  return engine;
};

describe('MapLibre style generation guards', () => {
  it('does not mutate sources before style.load or for a stale generation', () => {
    const map = fakeMap();
    const engine = createEngine(map);

    engine.applyWeatherOverlays(20);
    expect(map.sources.size).toBe(0);

    map.loaded = true;
    engine.applyWeatherOverlays(19);
    expect(map.sources.size).toBe(0);

    engine.styleReadyGeneration = 20;
    engine.applyWeatherOverlays(20);
    expect(map.sources.has('weather-wind')).toBe(true);
    expect(map.layers.has('weather-wind-layer')).toBe(true);
  });

  it('invalidates twenty consecutive style changes without retaining overlay frames', () => {
    const map = fakeMap();
    const engine = createEngine(map);
    engine.cancelFrame = () => undefined;

    for (let index = 0; index < 20; index++) {
      engine.weatherApplyFrame = index + 1;
      engine.environmentApplyFrame = index + 21;
      engine.beginStyleChange();
    }

    expect(engine.styleGeneration).toBe(40);
    expect(engine.weatherApplyFrame).toBeNull();
    expect(engine.environmentApplyFrame).toBeNull();
  });

  it('renders standard meteorological wind barbs and wave-height symbols', () => {
    const map = fakeMap();
    const engine = createEngine(map);
    map.loaded = true;
    engine.styleReadyGeneration = 20;
    engine.environmentVectors = new Map([
      ['seaTemperature', { dataUrl: '/temperature.geojson', visible: true }],
      ['wind', { dataUrl: '/wind.geojson', visible: true }],
      ['currents', { dataUrl: '/currents.geojson', visible: true }],
      ['waves', { dataUrl: '/waves.geojson', visible: true }],
      ['marineMask', { dataUrl: '/marine-mask.geojson', visible: true }],
      ['encDepth', { dataUrl: '/depth-overlay.geojson', visible: true }],
    ]);

    engine.applyEnvironmentVectors(20);

    for (const id of ['seaTemperature', 'currents', 'waves']) {
      const field = map.addedLayers.find((layer) => layer.id === `environment-${id}-layer`);
      expect(field?.type).toBe('fill');
      expect(field?.filter).toEqual(['==', ['get', 'featureType'], 'cell']);
      expect(field?.paint?.['fill-antialias']).toBe(false);
    }

    expect(map.addedLayers.find((layer) => layer.id === 'environment-currents-layer-direction')?.type)
      .toBe('line');
    const wind = map.addedLayers.find((layer) => layer.id === 'environment-wind-layer');
    expect(wind?.type).toBe('symbol');
    expect(wind?.filter).toEqual(['==', ['get', 'featureType'], 'windDirection']);
    expect(wind?.layout?.['icon-rotate']).toEqual(['get', 'directionDeg']);
    expect(wind?.layout?.['icon-image']).toEqual(expect.arrayContaining([
      'step',
      ['get', 'speedKnots'],
      'chart-weather-wind-barb-0',
      2.5,
      'chart-weather-wind-barb-5',
    ]));

    const waves = map.addedLayers.find((layer) => layer.id === 'environment-waves-layer-direction');
    expect(waves?.type).toBe('symbol');
    expect(waves?.layout?.['icon-image']).toEqual([
      'step', ['get', 'heightMeters'],
      'chart-wave-low',
      1, 'chart-wave-moderate',
      2.5, 'chart-wave-high',
    ]);
    expect(waves?.filter).toEqual(['==', ['get', 'featureType'], 'waveSymbol']);
    expect(waves?.layout?.['icon-size']).toEqual([
      'interpolate', ['linear'], ['zoom'],
      6, ['interpolate', ['linear'], ['get', 'heightMeters'], 0, 0.76, 5, 1.07],
      10, ['interpolate', ['linear'], ['get', 'heightMeters'], 0, 0.96, 5, 1.35],
      14, ['interpolate', ['linear'], ['get', 'heightMeters'], 0, 1.14, 5, 1.61],
    ]);
    expect(waves?.layout?.['icon-rotate']).toEqual(['get', 'directionDeg']);
    expect(map.layers.has('environment-currents-layer-values')).toBe(true);
    expect(map.addedLayers.find((layer) => layer.id === 'environment-marineMask-layer')?.type)
      .toBe('line');
    expect(map.addedLayers.find((layer) => layer.id === 'environment-encDepth-layer')?.filter)
      .toEqual(['==', ['get', 'featureType'], 'depthArea']);
    expect(map.layers.has('environment-encDepth-layer-direction')).toBe(true);
    expect(map.layers.has('environment-encDepth-layer-values')).toBe(true);
    expect(map.layers.has('environment-encDepth-layer-samples')).toBe(true);
  });

  it('updates marine mask and ENC depth opacity using their actual layer types', () => {
    const map = fakeMap();
    const engine = createEngine(map);
    map.loaded = true;
    engine.styleReadyGeneration = 20;
    engine.environmentVectors = new Map([
      ['marineMask', { dataUrl: '/marine-mask.geojson', visible: true }],
      ['encDepth', { dataUrl: '/depth-overlay.geojson', visible: true }],
    ]);
    engine.applyEnvironmentVectors(20);

    (engine as unknown as MapLibreEngineService).setWeatherOpacity(0.5);

    expect(map.paintUpdates).toContainEqual({
      layerId: 'environment-marineMask-layer',
      property: 'line-opacity',
      value: 0.375,
    });
    expect(map.paintUpdates.some((update) =>
      update.layerId === 'environment-encDepth-layer'
      && update.property === 'fill-opacity'
      && Array.isArray(update.value))).toBe(true);
    expect(map.paintUpdates.some((update) =>
      update.layerId === 'environment-encDepth-layer-direction'
      && update.property === 'line-opacity')).toBe(true);
  });
});

describe('Marine condition popup', () => {
  it('prioritizes navigational wave values and translates technical properties', () => {
    const details = environmentPopupDetails('waves', {
      heightMeters: 3.2,
      directionDeg: 308.5,
      periodSeconds: 7.9,
      maximumHeight: 5.1,
      primarySwellHeight: 1.8,
      interpolated: true,
      sourceDistanceKm: 2.3,
      featureType: 'cell',
    });

    expect(details.title).toBe('Oleaje');
    expect(details.value).toBe('3.2');
    expect(details.state).toBe('Fuerte marejada');
    expect(details.severity).toBe('caution');
    expect(details.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Procedencia', value: 'NO · 309°', bearing: 308.5 }),
      expect.objectContaining({ label: 'Periodo medio', value: '7.9 s' }),
      expect.objectContaining({ label: 'Altura máxima', value: '5.1 m' }),
    ]));
    expect(details.provenance).toContain('Interpolado · nodo a 2.3 km');
  });

  it('shows current speed in knots and metres per second', () => {
    const details = environmentPopupDetails('currents', {
      speedKnots: 1.24,
      directionDeg: 181,
      interpolated: false,
    });

    expect(details.title).toBe('Corriente superficial');
    expect(details.value).toBe('1.24');
    expect(details.state).toBe('Fuerte');
    expect(details.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Dirección', value: 'S · 181°' }),
      expect.objectContaining({ label: 'Velocidad', value: '0.64 m/s' }),
    ]));
    expect(details.provenance).toBe('Nodo del modelo');
  });
});
