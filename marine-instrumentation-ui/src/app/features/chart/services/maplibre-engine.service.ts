import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point, Polygon, Position } from 'geojson';
import type { IhmFeatureInfoFeature } from '../../../data-access/chart/chart-engine-api.service';
import type { WaypointFeatureCollection } from '../types/chart-geojson';
import type { MapOrientation } from '../types/chart-vm';
import { METERS_PER_NM, projectDestination } from '../../../state/calculations/navigation';
import {
  DEFAULT_VESSEL_TYPE_COLORS,
  VESSEL_TYPE_KEYS,
  getAisTargetIconId,
  getAisVesselIconId,
  type VesselTypeColors,
  type VesselTypeFilter,
} from './chart-vessel-types';
import { EnvironmentParticleLayer } from './environment-particle-layer';

export interface MapLibreInitView {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface ChartSourceConfig {
  id: string;
  style: maplibregl.StyleSpecification | string;
}

export interface WindMapUpdate {
  coords: [number, number][];
  visible: boolean;
  directionDeg: number;
  speedMps: number;
  gustMps: number | null;
  source: 'true' | 'apparent';
}

const DEFAULT_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

const VESSEL_ICON_ID = 'chart-vessel-icon';
const VESSEL_ICON_STALE_ID = 'chart-vessel-icon-stale';
const VESSEL_ICON_NO_FIX_ID = 'chart-vessel-icon-no-fix';

const VESSEL_SOURCE_ID = 'chart-vessel-source';
const VESSEL_HALO_LAYER_ID = 'chart-vessel-halo-layer';
const VESSEL_LAYER_ID = 'chart-vessel-layer';
const TRACK_SOURCE_ID = 'chart-track-source';
const TRACK_LAYER_ID = 'chart-track-layer';
const VECTOR_SOURCE_ID = 'chart-vector-source';
const VECTOR_LAYER_ID = 'chart-vector-layer';
const HEADING_LINE_SOURCE_ID = 'chart-heading-line-source';
const HEADING_LINE_LAYER_ID = 'chart-heading-line-layer';
const LAYLINES_SOURCE_ID = 'chart-laylines-source';
const LAYLINES_LAYER_ID = 'chart-laylines-layer';
const WAYPOINT_SOURCE_ID = 'chart-waypoints-source';
const WAYPOINT_LAYER_ID = 'chart-waypoints-layer';
const ROUTE_SOURCE_ID = 'chart-route-source';
const ROUTE_LAYER_ID = 'chart-route-layer';
const TRUE_WIND_SOURCE_ID = 'chart-true-wind-source';
const TRUE_WIND_LAYER_ID = 'chart-true-wind-layer';
const TRUE_WIND_ARROW_SOURCE_ID = 'chart-true-wind-arrow-source';
const TRUE_WIND_ARROW_LAYER_ID = 'chart-true-wind-arrow-layer';
const TRUE_WIND_ARROW_LIGHT_ID = 'chart-wind-arrow-light';
const TRUE_WIND_ARROW_MODERATE_ID = 'chart-wind-arrow-moderate';
const TRUE_WIND_ARROW_STRONG_ID = 'chart-wind-arrow-strong';
const APPARENT_WIND_ARROW_ID = 'chart-wind-arrow-apparent';
const WIND_BARB_SPEEDS = Array.from({ length: 21 }, (_, index) => index * 5);
const windBarbIconId = (speedKnots: number): string => `chart-weather-wind-barb-${speedKnots}`;
const WAVE_ICON_LOW_ID = 'chart-wave-low';
const WAVE_ICON_MODERATE_ID = 'chart-wave-moderate';
const WAVE_ICON_HIGH_ID = 'chart-wave-high';
const APPARENT_WIND_COLOR = '#38bdf8';
const RANGE_RINGS_SOURCE_ID = 'chart-range-rings-source';
const RANGE_RINGS_LAYER_ID = 'chart-range-rings-layer';
const BEARING_LINE_SOURCE_ID = 'chart-bearing-line-source';
const BEARING_LINE_LAYER_ID = 'chart-bearing-line-layer';
const AUTOPILOT_TARGET_SOURCE_ID = 'chart-autopilot-target-source';
const AUTOPILOT_TARGET_LAYER_ID = 'chart-autopilot-target-layer';
const BENCH_ROUTE_SOURCE_ID = 'chart-bench-route-source';
const BENCH_ROUTE_LAYER_ID = 'chart-bench-route-layer';
const BENCH_WAYPOINTS_SOURCE_ID = 'chart-bench-waypoints-source';
const BENCH_WAYPOINTS_LAYER_ID = 'chart-bench-waypoints-layer';
const BENCH_WP_LABEL_LAYER_ID = 'chart-bench-wp-label-layer';
const AIS_SOURCE_ID = 'chart-ais-source';
const AIS_LAYER_ID = 'chart-ais-layer';
const AIS_FALLBACK_ICON_ID = getAisVesselIconId('other');
const AIS_TRACKS_SOURCE_ID = 'chart-ais-tracks-source';
const AIS_TRACKS_LAYER_ID = 'chart-ais-tracks-layer';
const AIS_PREDICT_SOURCE_ID = 'chart-ais-predict-source';
const AIS_PREDICT_LAYER_ID = 'chart-ais-predict-layer';
const CPA_LINE_SOURCE_ID = 'chart-cpa-line-source';
const CPA_LINE_LAYER_ID = 'chart-cpa-line-layer';
const ANCHOR_SOURCE_ID = 'chart-anchor-source';
const ANCHOR_CIRCLE_LAYER_ID = 'chart-anchor-circle';
const ANCHOR_BORDER_LAYER_ID = 'chart-anchor-border';
const ANCHOR_CENTER_LAYER_ID = 'chart-anchor-center';
const OPENSEAMAP_SOURCE_ID = 'openseamap-overlay';
const OPENSEAMAP_LAYER_ID = 'openseamap-overlay-layer';
const MEASURE_SOURCE_ID = 'chart-measure-source';
const MEASURE_LINE_LAYER_ID = 'chart-measure-line';
const MEASURE_POINTS_SOURCE_ID = 'chart-measure-points-source';
const MEASURE_POINTS_LAYER_ID = 'chart-measure-points';
const MEASURE_LABEL_LAYER_ID = 'chart-measure-label';
const SAVED_TRACKS_SOURCE_ID = 'chart-saved-tracks-source';
const SAVED_TRACKS_LAYER_ID = 'chart-saved-tracks-layer';
const AREA_SELECTION_SOURCE_ID = 'chart-area-selection-source';
const AREA_SELECTION_FILL_LAYER_ID = 'chart-area-selection-fill';
const AREA_SELECTION_LINE_LAYER_ID = 'chart-area-selection-line';
const AREA_SELECTION_POINTS_LAYER_ID = 'chart-area-selection-points';
const ENC_DEPTH_SOURCE_ID = 'chart-enc-depth-advisory-source';
const ENC_DEPTH_SECTOR_LAYER_ID = 'chart-enc-depth-advisory-sector';
const ENC_DEPTH_HAZARD_LAYER_ID = 'chart-enc-depth-advisory-hazards';
const ENC_DEPTH_HAZARD_AREA_LAYER_ID = 'chart-enc-depth-advisory-hazard-areas';

export interface ChartAreaGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

const EMPTY_POINTS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
};

const EMPTY_LINE: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [],
};

const FRAME_LAYER_BUDGET = 1; // Reduced to 1 to prevent long RAF handlers.
// Each layer update (setData + marker updates) can take 20-50ms.
// With budget=1, each frame processes at most one layer, keeping RAF < 50ms.
const DIRTY_LAYER_ORDER = [
  'vessel',
  'camera',
  'aisTargets',
  'track',
  'vector',
  'headingLine',
  'laylines',
  'trueWind',
  'aisTracks',
  'aisPredictions',
  'cpaLines',
  'encDepth',
  'rangeRings',
  'bearingLine',
  'autopilotTarget',
  'waypoints',
  'route',
  'savedTracks',
  'benchRoute',
] as const;

type EnvironmentPopupKind = 'waves' | 'currents' | 'wind' | 'temperature';
type EnvironmentSeverity = 'normal' | 'caution' | 'danger';

interface EnvironmentPopupMetric {
  label: string;
  value: string;
  bearing?: number;
}

interface EnvironmentPopupDetails {
  title: string;
  icon: string;
  value: string;
  unit: string;
  state: string;
  severity: EnvironmentSeverity;
  metrics: EnvironmentPopupMetric[];
  provenance: string;
}

const numericProperty = (
  properties: Record<string, unknown>,
  ...keys: string[]
): number | null => {
  for (const key of keys) {
    const raw = properties[key];
    if ((typeof raw === 'number' || typeof raw === 'string') && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
  }
  return null;
};

const isTruthyProperty = (value: unknown): boolean => value === true || value === 'true' || value === 1;

const compassPoint = (degrees: number): string => {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;
  return points[Math.round(((degrees % 360) + 360) % 360 / 45) % points.length]!;
};

const directionMetric = (
  properties: Record<string, unknown>,
  label = 'Dirección',
): EnvironmentPopupMetric => {
  const direction = numericProperty(properties, 'directionDeg', 'direction');
  return direction === null
    ? { label, value: 'Sin dato' }
    : {
        label,
        value: `${compassPoint(direction)} · ${Math.round(direction).toString().padStart(3, '0')}°`,
        bearing: direction,
      };
};

export const environmentPopupDetails = (
  kind: EnvironmentPopupKind,
  properties: Record<string, unknown>,
): EnvironmentPopupDetails => {
  const interpolated = isTruthyProperty(properties['interpolated']);
  const sourceDistance = numericProperty(properties, 'sourceDistanceKm');
  const sampling = interpolated
    ? `Interpolado${sourceDistance !== null ? ` · nodo a ${sourceDistance.toFixed(1)} km` : ''}`
    : 'Nodo del modelo';
  const provider = typeof properties['provider'] === 'string' ? properties['provider'] : null;
  const model = typeof properties['model'] === 'string' ? properties['model'] : null;
  const validTime = typeof properties['validTime'] === 'string'
    ? new Date(properties['validTime']).toLocaleString('es-ES', { timeZone: 'UTC', hour12: false })
    : null;
  const provenance = [
    sampling,
    provider,
    model && model !== provider ? model : null,
    validTime ? `${validTime} UTC` : null,
  ].filter(Boolean).join(' · ');

  if (kind === 'waves') {
    const height = numericProperty(properties, 'heightMeters', 'significantHeight') ?? 0;
    const period = numericProperty(properties, 'periodSeconds', 'meanPeriod');
    const maximum = numericProperty(properties, 'maximumHeight');
    const swell = numericProperty(properties, 'primarySwellHeight');
    const swellPeriod = numericProperty(properties, 'primarySwellPeriod');
    const windSea = numericProperty(properties, 'windSeaHeight');
    const state = height < 0.5
      ? 'Mar rizada'
      : height < 1.25
        ? 'Marejadilla'
        : height < 2.5
          ? 'Marejada'
          : height < 4
            ? 'Fuerte marejada'
            : 'Mar gruesa';
    return {
      title: 'Oleaje',
      icon: '🌊',
      value: height.toFixed(1),
      unit: 'm Hs',
      state,
      severity: height >= 4 ? 'danger' : height >= 2.5 ? 'caution' : 'normal',
      metrics: [
        directionMetric(properties, 'Procedencia'),
        ...(period === null ? [] : [{ label: 'Periodo medio', value: `${period.toFixed(1)} s` }]),
        ...(maximum === null ? [] : [{ label: 'Altura máxima', value: `${maximum.toFixed(1)} m` }]),
        ...(swell === null ? [] : [{
          label: 'Mar de fondo',
          value: `${swell.toFixed(1)} m${swellPeriod === null ? '' : ` · ${swellPeriod.toFixed(1)} s`}`,
        }]),
        ...(windSea === null ? [] : [{ label: 'Mar de viento', value: `${windSea.toFixed(1)} m` }]),
      ].filter((metric) => metric.value !== 'Sin dato'),
      provenance,
    };
  }

  if (kind === 'currents') {
    const speed = numericProperty(properties, 'speedKnots') ?? 0;
    return {
      title: 'Corriente superficial',
      icon: '↝',
      value: speed.toFixed(2),
      unit: 'kn',
      state: speed < 0.3 ? 'Floja' : speed < 1 ? 'Moderada' : speed < 2 ? 'Fuerte' : 'Muy fuerte',
      severity: speed >= 2 ? 'danger' : speed >= 1 ? 'caution' : 'normal',
      metrics: [
        directionMetric(properties),
        {
          label: 'Velocidad',
          value: `${(speed * 0.514444).toFixed(2)} m/s`,
        },
      ],
      provenance,
    };
  }

  if (kind === 'wind') {
    const speed = numericProperty(properties, 'speedKnots') ?? 0;
    const gust = numericProperty(properties, 'gustKnots');
    return {
      title: 'Viento',
      icon: '↗',
      value: speed.toFixed(1),
      unit: 'kn',
      state: speed < 7 ? 'Flojo' : speed < 17 ? 'Moderado' : speed < 28 ? 'Fresco' : 'Fuerte',
      severity: speed >= 28 ? 'danger' : speed >= 17 ? 'caution' : 'normal',
      metrics: [
        directionMetric(properties, 'Procedencia'),
        { label: 'Racha', value: gust === null ? 'Sin dato' : `${gust.toFixed(1)} kn` },
      ],
      provenance,
    };
  }

  const temperature = numericProperty(properties, 'value') ?? 0;
  return {
    title: 'Temperatura del mar',
    icon: '°',
    value: temperature.toFixed(1),
    unit: '°C',
    state: 'Superficie',
    severity: 'normal',
    metrics: [],
    provenance,
  };
};

export class MapLibreEngineService {
  private map: maplibregl.Map | null = null;
  private mapReady = false;
  private styleGeneration = 1;
  private styleReadyGeneration = 0;
  private initializedStyleGeneration = 0;
  private readonly styleInitFrames = new Set<number>();
  private styleInitIdle: number | null = null;
  private styleInitTimer: ReturnType<typeof setTimeout> | null = null;
  private baseSource: ChartSourceConfig | null = null;
  private clickHandler: ((lngLat: [number, number]) => void) | null = null;
  private featureClickHandler:
    | ((event: { featureId?: string; properties?: any; layerId: string }) => void)
    | null = null;
  private errorHandler: ((message: string, sourceId?: string, baseSourceId?: string) => void) | null = null;
  private zoomHandler: ((zoom: number) => void) | null = null;
  private pendingCenter: [number, number] | null = null;
  private appliedCenter: [number, number] | null = null;
  private appliedBearing: number | null = null;
  private orientation: MapOrientation = 'north-up';
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private renderFrame: number | null = null;
  private readonly dirtyLayers = new Set<string>();
  private areaSelectionMode: 'rectangle' | 'polygon' | null = null;
  private areaSelectionPoints: [number, number][] = [];
  private areaSelectionPointer: [number, number] | null = null;
  private areaSelectionComplete: ((geometry: ChartAreaGeometry) => void) | null = null;

  // Deferred marker updates: separate DOM marker work from setData() to avoid
  // long RAF handlers. Marker updates are batched into a single RAF callback.
  private pendingMarkerUpdates = new Set<() => void>();
  private markerUpdateFrame: number | null = null;

  private scheduleMarkerUpdate(update: () => void): void {
    this.pendingMarkerUpdates.add(update);
    if (this.markerUpdateFrame !== null) return;
    this.markerUpdateFrame = this.requestFrame(() => {
      this.markerUpdateFrame = null;
      const updates = Array.from(this.pendingMarkerUpdates);
      this.pendingMarkerUpdates.clear();
      for (const update of updates) {
        update();
      }
    });
  }

  // Icon cache to avoid regenerating Canvas icons on every style reload.
  // Static (shared across all instances) so icons persist between page navigations.
  private static readonly iconCache = new Map<string, ImageData>();
  private static iconsPreloaded = false;

  constructor() {
    // Pre-generate common icons on first instantiation to avoid blocking onStyleReady().
    // This prevents [Violation] 'setTimeout' handler took >50ms during map initialization.
    if (!MapLibreEngineService.iconsPreloaded) {
      MapLibreEngineService.iconsPreloaded = true;
      // Use requestIdleCallback if available, otherwise setTimeout(..., 0)
      const schedule = typeof requestIdleCallback === 'function'
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 100 })
        : (cb: () => void) => setTimeout(cb, 0);
      schedule(() => {
        this.preloadCommonIcons();
      });
    }
  }

  private preloadCommonIcons(): void {
    // Pre-generate vessel icons (most common, used on every load)
    this.createVesselIcon('#0284c7', '#38bdf8', true);
    this.createVesselIcon('#eab308', '#fde047', true);
    this.createVesselIcon('#6b7280', '#9ca3af', true);
    // Pre-generate wind arrow icons
    this.createWindArrowIcon('#22c55e');
    this.createWindArrowIcon('#f59e0b');
    this.createWindArrowIcon('#ef4444');
    this.createWindArrowIcon(APPARENT_WIND_COLOR);
    for (const speed of WIND_BARB_SPEEDS) this.createWindBarbIcon(speed);
    this.createWaveIcon(1);
    this.createWaveIcon(2);
    this.createWaveIcon(3);
  }

  private readonly handleMapClick = (event: maplibregl.MapMouseEvent): void => {
    if (this.areaSelectionMode) {
      this.addAreaSelectionPoint([event.lngLat.lng, event.lngLat.lat]);
      return;
    }
    if (!this.clickHandler) {
      return;
    }
    // Check if we clicked an interactive feature first (waypoints / AIS).
    if (this.map && this.featureClickHandler) {
      const environmentLayerIds = [...this.environmentVectors.keys()]
        .flatMap((id) => [
          `environment-${id}-layer-direction`,
          `environment-${id}-layer-values`,
          `environment-${id}-layer-samples`,
          `environment-${id}-layer`,
        ])
        .filter((id) => Boolean(this.map?.getLayer(id)));
      const tolerance = 10;
      const features = this.map.queryRenderedFeatures([
        [event.point.x - tolerance, event.point.y - tolerance],
        [event.point.x + tolerance, event.point.y + tolerance],
      ], {
        layers: [WAYPOINT_LAYER_ID, AIS_LAYER_ID, ...environmentLayerIds].filter((id) => Boolean(this.map?.getLayer(id))),
      });
      if (features.length > 0) {
        const feature = features[0];
          if (feature?.layer?.id) {
            if (feature.layer.id.startsWith('environment-')) {
              if (feature.layer.id.includes('encDepth')) {
                this.showEncDepthPopup(event.lngLat, feature.properties ?? {});
                return;
              }
              if (feature.layer.id.includes('marineMask')) {
                this.showMarineMaskPopup(event.lngLat, feature.properties ?? {});
                return;
              }
              this.showEnvironmentPopup(event.lngLat, feature.layer.id, feature.properties ?? {});
            return;
          }
          const featurePropertyId = feature.properties?.['id'];
          const featureId =
            typeof feature.id === 'string'
              ? feature.id
              : typeof featurePropertyId === 'string'
                ? featurePropertyId
                : undefined;
          this.featureClickHandler({
            ...(featureId ? { featureId } : {}),
            properties: feature.properties,
            layerId: feature.layer.id,
          });
          return; // Stop propagation to plain map click.
        }
      }
    }

    this.clickHandler([event.lngLat.lng, event.lngLat.lat]);
  };

  private readonly handleAreaSelectionMove = (event: maplibregl.MapMouseEvent): void => {
    if (!this.areaSelectionMode || this.areaSelectionPoints.length === 0) return;
    this.areaSelectionPointer = [event.lngLat.lng, event.lngLat.lat];
    this.renderAreaSelection();
  };

  private readonly handleAreaSelectionDoubleClick = (event: maplibregl.MapMouseEvent): void => {
    if (this.areaSelectionMode !== 'polygon') return;
    event.preventDefault();
    this.finishAreaSelection();
  };

  private lastVessel: {
    lngLat: [number, number] | null;
    rotationDeg: number | null;
    state: 'fix' | 'stale' | 'no-fix';
  } = {
    lngLat: null,
    rotationDeg: null,
    state: 'no-fix',
  };
  private lastTrack: [number, number][] = [];
  private lastVector: {
    coords: [number, number][];
    visible: boolean;
    label: { cogDeg: number; sogKnots: number } | null;
    timeTicks: { label: string; coords: [number, number] }[];
  } = { coords: [], visible: false, label: null, timeTicks: [] };
  private lastHeadingLine: {
    coords: [number, number][];
    visible: boolean;
    headingDeg: number | null;
  } = { coords: [], visible: false, headingDeg: null };
  private lastLaylines: { lines: [number, number][][]; visible: boolean } = {
    lines: [],
    visible: false,
  };
  private lastWaypoints: WaypointFeatureCollection =
    EMPTY_POINTS as unknown as WaypointFeatureCollection;
  private lastRoute: FeatureCollection<LineString> = EMPTY_LINE;
  private lastSavedTracks: FeatureCollection<LineString> = EMPTY_LINE;
  private lastTrueWind: WindMapUpdate = {
    coords: [],
    visible: false,
    directionDeg: 0,
    speedMps: 0,
    gustMps: null,
    source: 'true',
  };
  private lastApparentWind: WindMapUpdate = {
    coords: [],
    visible: false,
    directionDeg: 0,
    speedMps: 0,
    gustMps: null,
    source: 'apparent',
  };
  private cogLabelMarker: maplibregl.Marker | null = null;
  private headingLabelMarker: maplibregl.Marker | null = null;
  private apparentWindLabelMarker: maplibregl.Marker | null = null;
  private cogTimeTickMarkers: maplibregl.Marker[] = [];
  private trueWindLabelMarker: maplibregl.Marker | null = null;
  private lastRangeRings: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] };
  private lastBearingLine: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastAutopilotTarget: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastBenchRoute: {
    line: FeatureCollection<LineString>;
    points: FeatureCollection<Point>;
  } = {
    line: EMPTY_LINE,
    points: EMPTY_POINTS,
  };
  private lastAisTargets: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };
  private lastAisTracks: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [],
  };
  private lastAisPredictions: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [],
  };
  private lastCpaLines: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
  private lastEncDepthAdvisory: FeatureCollection = { type: 'FeatureCollection', features: [] };
  private shallowWaterAlarmActive = false;
  private aisVesselTypeColors: VesselTypeColors = { ...DEFAULT_VESSEL_TYPE_COLORS };
  private ownVesselIconScale = 1.15;
  private aisTargetIconScale = 0.8;
  private windTrackMinZoom = 0;
  private rangeRingsMinZoom = 8;
  private showOpenSeaMap = false;
  private readonly weatherLayers = new Map<string, { tileUrl: string | null; visible: boolean }>();
  private weatherOpacity = 0.6;
  private readonly environmentVectors = new Map<string, { dataUrl: string | null; visible: boolean }>();
  private readonly environmentParticles = new Map<
    'wind' | 'currents',
    { fieldUrl: string | null; maskUrl: string | null; visible: boolean; zonePolygon: number[][][] | null }
  >();
  private readonly activeParticleLayers = new Map<'wind' | 'currents', EnvironmentParticleLayer>();
  private weatherApplyFrame: number | null = null;
  private environmentApplyFrame: number | null = null;
  private particleApplyFrame: number | null = null;
  private environmentPopup: maplibregl.Popup | null = null;
  private aisTargetsVisible = true;
  private aisLabelsVisible = true;
  private cpaLinesVisible = true;

  init(containerEl: HTMLElement, initialView: MapLibreInitView): void {
    if (this.map) {
      return;
    }

    // Use ResizeObserver entry instead of clientWidth/clientHeight to avoid forced reflow.
    // The ResizeObserver guarantees the element has size when this init runs.
    const rect = containerEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      this.requestFrame(() => this.init(containerEl, initialView));
      return;
    }

    const style = this.baseSource?.style ?? DEFAULT_STYLE;

    this.map = new maplibregl.Map({
      container: containerEl,
      style,
      center: initialView.center,
      zoom: initialView.zoom,
      bearing: initialView.bearing ?? 0,
      pitch: initialView.pitch ?? 0,
      attributionControl: false,
      cancelPendingTileRequestsWhileZooming: true,
      fadeDuration: 0,
      maxTileCacheZoomLevels: 3,
      refreshExpiredTiles: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    });

    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    this.map
      .getContainer()
      .querySelector('.maplibregl-ctrl-attrib')
      ?.classList.remove('maplibregl-compact-show');

    this.map.on('load', () => {
      // Ensure map fills container after CSS transitions complete
      this.scheduleResize();
      // Seed the initial zoom so zoom-aware consumers (e.g. min-length vectors) start correct.
      this.zoomHandler?.(this.map?.getZoom() ?? initialView.zoom);
    });
    this.map.on('style.load', () => {
      this.onStyleReady(this.styleGeneration);
    });
    this.map.on('error', (event) => this.handleMapError(event));
    this.map.on('click', this.handleMapClick);
    this.map.on('mousemove', this.handleAreaSelectionMove);
    this.map.on('dblclick', this.handleAreaSelectionDoubleClick);
    this.map.on('zoomend', () => this.zoomHandler?.(this.map?.getZoom() ?? initialView.zoom));

    // Watch for container size changes (grid transitions, sidenav toggle)
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleResize();
    });
    this.resizeObserver.observe(containerEl);
  }

  setBaseSource(chartSourceConfig: ChartSourceConfig): void {
    if (
      this.baseSource?.id === chartSourceConfig.id &&
      this.baseSource.style === chartSourceConfig.style
    ) {
      return;
    }
    this.baseSource = chartSourceConfig;
    if (!this.map) {
      return;
    }
    this.beginStyleChange();
    this.map.setStyle(chartSourceConfig.style);
  }

  flyTo(center: [number, number], zoom?: number): void {
    if (!this.map) return;
    this.map.flyTo({ center, zoom: zoom ?? this.map.getZoom(), duration: 1200 });
  }

  fitBounds(bounds: [number, number, number, number]): void {
    if (!this.map) return;
    const [west, south, east, north] = bounds;
    this.map.fitBounds([[west, south], [east, north]], {
      padding: 48,
      duration: 900,
      maxZoom: 10,
    });
  }

  getViewportGeometry(): ChartAreaGeometry | null {
    if (!this.map) return null;
    const bounds = this.map.getBounds();
    const west = bounds.getWest();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const north = bounds.getNorth();
    return {
      type: 'Polygon',
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    };
  }

  beginAreaSelection(
    mode: 'rectangle' | 'polygon',
    complete: (geometry: ChartAreaGeometry) => void,
  ): void {
    this.cancelAreaSelection();
    this.areaSelectionMode = mode;
    this.areaSelectionComplete = complete;
    this.map?.getCanvas().classList.add('chart-area-selection-active');
    this.renderAreaSelection();
  }

  finishAreaSelection(): void {
    const geometry = this.areaSelectionGeometry(false);
    if (!geometry) return;
    const complete = this.areaSelectionComplete;
    this.clearAreaSelectionState();
    this.removeAreaSelectionLayers();
    complete?.(geometry);
  }

  cancelAreaSelection(): void {
    this.clearAreaSelectionState();
    this.removeAreaSelectionLayers();
  }

  updateVesselPosition(
    lngLat: [number, number] | null,
    rotationDeg: number | null,
    state: 'fix' | 'stale' | 'no-fix' = 'fix',
  ): void {
    this.lastVessel = { lngLat, rotationDeg, state };
    if (!this.mapReady) {
      return;
    }
    this.markDirty('vessel', 'camera');
  }

  updateTrack(lineStringCoords: [number, number][]): void {
    this.lastTrack = lineStringCoords;
    if (!this.mapReady) {
      return;
    }
    this.markDirty('track');
  }

  updateVector(
    lineStringCoords: [number, number][],
    visible: boolean,
    label?: { cogDeg: number; sogKnots: number } | null,
    timeTicks?: { label: string; coords: [number, number] }[],
  ): void {
    this.lastVector = {
      coords: lineStringCoords,
      visible,
      label: label ?? null,
      timeTicks: timeTicks ?? [],
    };
    if (!this.mapReady) return;
    this.markDirty('vector');
  }

  updateHeadingLine(
    lineStringCoords: [number, number][],
    visible: boolean,
    headingDeg?: number | null,
  ): void {
    this.lastHeadingLine = { coords: lineStringCoords, visible, headingDeg: headingDeg ?? null };
    if (!this.mapReady) return;
    this.markDirty('headingLine');
  }

  updateLaylines(lines: [number, number][][], visible: boolean): void {
    this.lastLaylines = { lines, visible };
    if (!this.mapReady) {
      return;
    }
    this.markDirty('laylines');
  }

  updateWaypoints(geojson: WaypointFeatureCollection): void {
    this.lastWaypoints = geojson;
    if (!this.mapReady) {
      return;
    }
    this.markDirty('waypoints');
  }

  updateRoute(geojson: FeatureCollection<LineString>): void {
    this.lastRoute = geojson;
    if (!this.mapReady) {
      return;
    }
    this.markDirty('route');
  }

  updateSavedTracks(geojson: FeatureCollection<LineString>): void {
    this.lastSavedTracks = geojson;
    if (!this.mapReady) {
      return;
    }
    this.markDirty('savedTracks');
  }

  updateTrueWind(update: WindMapUpdate): void {
    this.lastTrueWind = update;
    if (!this.mapReady) {
      return;
    }
    this.markDirty('trueWind');
  }

  updateApparentWind(update: WindMapUpdate): void {
    this.lastApparentWind = update;
    if (!this.mapReady) {
      return;
    }
    this.markDirty('trueWind');
  }

  /** Bench route: waypoint markers + connecting line with active-leg highlighting. */
  updateBenchRoute(line: FeatureCollection<LineString>, points: FeatureCollection<Point>): void {
    this.lastBenchRoute = { line, points };
    if (this.mapReady) {
      this.markDirty('benchRoute');
    }
  }

  /** Autopilot target heading vector, drawn from the vessel along target_heading. */
  updateAutopilotTarget(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastAutopilotTarget = { coords: lineStringCoords, visible };
    if (this.mapReady) {
      this.markDirty('autopilotTarget');
    }
  }

  updateBearingLine(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastBearingLine = { coords: lineStringCoords, visible };
    if (this.mapReady) {
      this.markDirty('bearingLine');
    }
  }

  updateRangeRings(center: [number, number], intervalsNm: number[]): void {
    const features = intervalsNm.map((nm) => this.createCircle(center, nm));
    this.lastRangeRings = {
      type: 'FeatureCollection',
      features,
    };
    if (this.mapReady) {
      this.markDirty('rangeRings');
    }
  }

  clearRangeRings(): void {
    this.lastRangeRings = {
      type: 'FeatureCollection',
      features: [],
    };
    if (this.mapReady) {
      this.markDirty('rangeRings');
    }
  }

  setOwnVesselIconScale(scale: number): void {
    this.ownVesselIconScale = this.clamp(scale, 0.5, 2.5);
    const effectiveScale = this.getEffectiveOwnVesselScale(this.ownVesselIconScale);
    if (!this.map || !this.mapReady || !this.map.getLayer(VESSEL_LAYER_ID)) {
      return;
    }
    this.map.setLayoutProperty(VESSEL_LAYER_ID, 'icon-size', effectiveScale);
  }

  setAisTargetIconScale(scale: number): void {
    this.aisTargetIconScale = this.clamp(scale, 0.4, 2.0);
    const effectiveScale = this.getEffectiveAisTargetScale(this.aisTargetIconScale);
    if (!this.map || !this.mapReady || !this.map.getLayer(AIS_LAYER_ID)) {
      return;
    }
    this.map.setLayoutProperty(AIS_LAYER_ID, 'icon-size', effectiveScale);
  }

  setWindTrackMinZoom(minZoom: number): void {
    this.windTrackMinZoom = this.clamp(minZoom, 0, 24);
    if (!this.map || !this.mapReady) {
      return;
    }
    this.applyWindTrackZoomRanges();
  }

  setRangeRingsMinZoom(minZoom: number): void {
    this.rangeRingsMinZoom = this.clamp(minZoom, 0, 24);
    if (!this.map || !this.mapReady) {
      return;
    }
    this.applyRangeRingZoomRange();
  }

  updateView(center: [number, number] | null): void {
    this.pendingCenter = center;
    if (!this.mapReady || !this.map || !center) {
      return;
    }
    this.markDirty('camera');
  }

  setClickHandler(handler: ((lngLat: [number, number]) => void) | null): void {
    this.clickHandler = handler;
  }

  private addAreaSelectionPoint(point: [number, number]): void {
    if (!this.areaSelectionMode) return;
    this.areaSelectionPoints.push(point);
    this.areaSelectionPointer = null;
    if (this.areaSelectionMode === 'rectangle' && this.areaSelectionPoints.length === 2) {
      this.finishAreaSelection();
      return;
    }
    this.renderAreaSelection();
  }

  private areaSelectionGeometry(includePointer: boolean): ChartAreaGeometry | null {
    const points = [...this.areaSelectionPoints];
    if (includePointer && this.areaSelectionPointer) points.push(this.areaSelectionPointer);
    if (this.areaSelectionMode === 'rectangle' && points.length >= 2) {
      const first = points[0]!;
      const second = points[points.length - 1]!;
      return {
        type: 'Polygon',
        coordinates: [[
          [first[0], first[1]],
          [second[0], first[1]],
          [second[0], second[1]],
          [first[0], second[1]],
          [first[0], first[1]],
        ]],
      };
    }
    if (this.areaSelectionMode === 'polygon' && points.length >= 3) {
      return { type: 'Polygon', coordinates: [[...points, [...points[0]!]]] };
    }
    return null;
  }

  private renderAreaSelection(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;
    this.ensureAreaSelectionLayers();
    const source = this.map.getSource(AREA_SELECTION_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const geometry = this.areaSelectionGeometry(true);
    const pointFeatures: Feature<Point>[] = [
      ...this.areaSelectionPoints,
      ...(this.areaSelectionPointer ? [this.areaSelectionPointer] : []),
    ].map((coordinates, index) => ({
      type: 'Feature',
      id: index,
      properties: {},
      geometry: { type: 'Point', coordinates },
    }));
    const features: Array<Feature<Polygon> | Feature<LineString> | Feature<Point>> = [...pointFeatures];
    if (geometry) {
      features.unshift({ type: 'Feature', properties: {}, geometry });
    } else if (pointFeatures.length > 1) {
      features.unshift({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: pointFeatures.map((feature) => feature.geometry.coordinates) },
      });
    }
    source.setData({ type: 'FeatureCollection', features } as FeatureCollection);
  }

  private ensureAreaSelectionLayers(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;
    if (!this.map.getSource(AREA_SELECTION_SOURCE_ID)) {
      this.map.addSource(AREA_SELECTION_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!this.map.getLayer(AREA_SELECTION_FILL_LAYER_ID)) {
      this.map.addLayer({
        id: AREA_SELECTION_FILL_LAYER_ID,
        type: 'fill',
        source: AREA_SELECTION_SOURCE_ID,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#38bdf8', // Mirrors --gb-tick-reference for WebGL.
          'fill-opacity': 0.18,
        },
      });
    }
    if (!this.map.getLayer(AREA_SELECTION_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: AREA_SELECTION_LINE_LAYER_ID,
        type: 'line',
        source: AREA_SELECTION_SOURCE_ID,
        filter: ['in', '$type', 'Polygon', 'LineString'],
        paint: {
          'line-color': '#38bdf8', // Mirrors --gb-tick-reference for WebGL.
          'line-width': 2.5,
          'line-dasharray': [2, 1],
        },
      });
    }
    if (!this.map.getLayer(AREA_SELECTION_POINTS_LAYER_ID)) {
      this.map.addLayer({
        id: AREA_SELECTION_POINTS_LAYER_ID,
        type: 'circle',
        source: AREA_SELECTION_SOURCE_ID,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#0b1220', // Mirrors --gb-bg-canvas for WebGL.
          'circle-stroke-color': '#38bdf8', // Mirrors --gb-tick-reference for WebGL.
          'circle-stroke-width': 3,
        },
      });
    }
  }

  private removeAreaSelectionLayers(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;
    for (const layer of [AREA_SELECTION_POINTS_LAYER_ID, AREA_SELECTION_LINE_LAYER_ID, AREA_SELECTION_FILL_LAYER_ID]) {
      if (this.map.getLayer(layer)) this.map.removeLayer(layer);
    }
    if (this.map.getSource(AREA_SELECTION_SOURCE_ID)) this.map.removeSource(AREA_SELECTION_SOURCE_ID);
  }

  private clearAreaSelectionState(): void {
    this.areaSelectionMode = null;
    this.areaSelectionPoints = [];
    this.areaSelectionPointer = null;
    this.areaSelectionComplete = null;
    this.map?.getCanvas().classList.remove('chart-area-selection-active');
  }

  setFeatureClickHandler(
    handler: ((event: { featureId?: string; properties?: any; layerId: string }) => void) | null,
  ): void {
    this.featureClickHandler = handler;
  }

  setErrorHandler(handler: ((message: string, sourceId?: string, baseSourceId?: string) => void) | null): void {
    this.errorHandler = handler;
  }

  /** Notified on zoom changes (zoomend) so the view-model can size zoom-aware overlays. */
  setZoomHandler(handler: ((zoom: number) => void) | null): void {
    this.zoomHandler = handler;
  }

  // ---- Anchor Watch Layer ----

  /**
   * Update anchor watch circle on the map.
   * Pass null position to clear.
   */
  updateAnchorWatch(
    position: [number, number] | null,
    radiusMeters: number,
    isAlarming: boolean,
  ): void {
    if (!this.map || !this.mapReady) return;

    if (!position) {
      this.clearAnchorWatch();
      return;
    }

    this.ensureAnchorLayers();

    const circleGeoJson = this.createCircleMeters(position, radiusMeters);
    const centerGeoJson: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: position },
          properties: {},
        },
      ],
    };

    const fillColor = isAlarming ? '#ff1744' : '#4a90d9';
    const fillOpacity = isAlarming ? 0.25 : 0.12;
    const borderColor = isAlarming ? '#ff1744' : '#4a90d9';
    const borderOpacity = isAlarming ? 0.8 : 0.5;

    // Update sources
    const circleSource = this.map.getSource(ANCHOR_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    circleSource?.setData(circleGeoJson);

    const centerSource = this.map.getSource(ANCHOR_CENTER_LAYER_ID + '-src') as
      | maplibregl.GeoJSONSource
      | undefined;
    centerSource?.setData(centerGeoJson);

    // Update paint properties
    this.map.setPaintProperty(ANCHOR_CIRCLE_LAYER_ID, 'fill-color', fillColor);
    this.map.setPaintProperty(ANCHOR_CIRCLE_LAYER_ID, 'fill-opacity', fillOpacity);
    this.map.setPaintProperty(ANCHOR_BORDER_LAYER_ID, 'line-color', borderColor);
    this.map.setPaintProperty(ANCHOR_BORDER_LAYER_ID, 'line-opacity', borderOpacity);
    this.map.setPaintProperty(ANCHOR_CENTER_LAYER_ID, 'circle-color', borderColor);
  }

  clearAnchorWatch(): void {
    if (!this.map || !this.mapReady) return;

    const circleSource = this.map.getSource(ANCHOR_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (circleSource) {
      circleSource.setData({ type: 'FeatureCollection', features: [] });
    }

    const centerSource = this.map.getSource(ANCHOR_CENTER_LAYER_ID + '-src') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (centerSource) {
      centerSource.setData({ type: 'FeatureCollection', features: [] } as FeatureCollection<Point>);
    }
  }

  setOpenSeaMapVisible(visible: boolean): void {
    this.showOpenSeaMap = visible;
    if (!this.map || !this.mapReady) return;
    this.applyOpenSeaMapOverlay();
  }

  updateMeasurement(
    pointA: [number, number] | null,
    pointB: [number, number] | null,
    bearingDeg: number | null,
    distanceNm: number | null,
  ): void {
    if (!this.map || !this.mapReady) return;
    this.ensureMeasurementLayers();
    this.applyMeasurement(pointA, pointB, bearingDeg, distanceNm);
  }

  clearMeasurement(): void {
    if (!this.map || !this.mapReady) return;
    this.applyMeasurement(null, null, null, null);
  }

  private ensureAnchorLayers(): void {
    if (!this.map) return;

    // Circle fill source + layer
    if (!this.map.getSource(ANCHOR_SOURCE_ID)) {
      this.map.addSource(ANCHOR_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!this.map.getLayer(ANCHOR_CIRCLE_LAYER_ID)) {
      this.map.addLayer({
        id: ANCHOR_CIRCLE_LAYER_ID,
        type: 'fill',
        source: ANCHOR_SOURCE_ID,
        paint: {
          'fill-color': '#4a90d9',
          'fill-opacity': 0.12,
        },
      });
    }
    if (!this.map.getLayer(ANCHOR_BORDER_LAYER_ID)) {
      this.map.addLayer({
        id: ANCHOR_BORDER_LAYER_ID,
        type: 'line',
        source: ANCHOR_SOURCE_ID,
        paint: {
          'line-color': '#4a90d9',
          'line-width': 2,
          'line-opacity': 0.5,
          'line-dasharray': [4, 4],
        },
      });
    }

    // Anchor center point source + layer
    const centerSourceId = ANCHOR_CENTER_LAYER_ID + '-src';
    if (!this.map.getSource(centerSourceId)) {
      this.map.addSource(centerSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] } as FeatureCollection<Point>,
      });
    }
    if (!this.map.getLayer(ANCHOR_CENTER_LAYER_ID)) {
      this.map.addLayer({
        id: ANCHOR_CENTER_LAYER_ID,
        type: 'circle',
        source: centerSourceId,
        paint: {
          'circle-radius': 6,
          'circle-color': '#4a90d9',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
  }

  private createCircleMeters(center: [number, number], radiusMeters: number, points = 64): any {
    const coords: Position[] = [];
    for (let i = 0; i < points; i++) {
      const bearing = (i / points) * 360;
      const point = projectDestination({ lat: center[1], lon: center[0] }, bearing, radiusMeters);
      coords.push([point.lon, point.lat]);
    }
    if (coords.length > 0 && coords[0]) {
      coords.push(coords[0]); // Close polygon
    }
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [coords] },
          properties: {},
        },
      ],
    };
  }

  destroy(): void {
    this.beginStyleChange();
    this.environmentPopup?.remove();
    this.environmentPopup = null;
    this.trueWindLabelMarker?.remove();
    this.trueWindLabelMarker = null;
    this.cogLabelMarker?.remove();
    this.cogLabelMarker = null;
    this.headingLabelMarker?.remove();
    this.headingLabelMarker = null;
    this.apparentWindLabelMarker?.remove();
    this.apparentWindLabelMarker = null;
    this.clearCogTimeTicks();
    this.clearHeadingTimeTicks();
    if (this.resizeFrame !== null) {
      this.cancelFrame(this.resizeFrame);
      this.resizeFrame = null;
    }
    if (this.renderFrame !== null) {
      // renderFrame may be a setTimeout id (number) or a requestFrame id.
      // cancelFrame only works for requestFrame; clearTimeout handles both.
      clearTimeout(this.renderFrame);
      this.renderFrame = null;
    }
    if (this.markerUpdateFrame !== null) {
      this.cancelFrame(this.markerUpdateFrame);
      this.markerUpdateFrame = null;
    }
    if (this.weatherApplyFrame !== null) this.cancelFrame(this.weatherApplyFrame);
    if (this.environmentApplyFrame !== null) this.cancelFrame(this.environmentApplyFrame);
    if (this.particleApplyFrame !== null) this.cancelFrame(this.particleApplyFrame);
    this.weatherApplyFrame = null;
    this.environmentApplyFrame = null;
    this.particleApplyFrame = null;
    this.pendingMarkerUpdates.clear();
    this.dirtyLayers.clear();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.off('click', this.handleMapClick);
      this.map.off('mousemove', this.handleAreaSelectionMove);
      this.map.off('dblclick', this.handleAreaSelectionDoubleClick);
      this.map.remove();
    }
    this.map = null;
    this.activeParticleLayers?.clear();
    this.mapReady = false;
    this.clickHandler = null;
    this.errorHandler = null;
    this.pendingCenter = null;
    this.appliedCenter = null;
  }

  private beginStyleChange(): void {
    this.styleGeneration++;
    this.mapReady = false;
    this.cancelStyleInitialization();
    if (this.weatherApplyFrame !== null) this.cancelFrame(this.weatherApplyFrame);
    if (this.environmentApplyFrame !== null) this.cancelFrame(this.environmentApplyFrame);
    if (this.particleApplyFrame !== null) this.cancelFrame(this.particleApplyFrame);
    this.weatherApplyFrame = null;
    this.environmentApplyFrame = null;
    this.particleApplyFrame = null;
    this.activeParticleLayers?.clear();
  }

  private cancelStyleInitialization(): void {
    for (const frame of this.styleInitFrames) {
      this.cancelFrame(frame);
    }
    this.styleInitFrames.clear();
    if (this.styleInitIdle !== null && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(this.styleInitIdle);
    }
    this.styleInitIdle = null;
    if (this.styleInitTimer !== null) {
      clearTimeout(this.styleInitTimer);
      this.styleInitTimer = null;
    }
  }

  private canMutateStyle(generation = this.styleGeneration): boolean {
    return Boolean(
      this.map &&
      generation === this.styleGeneration &&
      generation === this.styleReadyGeneration,
    );
  }

  private handleMapError(event: { error?: Error; sourceId?: unknown }): void {
    const message = event.error?.message ?? 'Map source failed to load.';
    if (!/Failed to fetch|404|glyph|tile/i.test(message)) {
      return;
    }
    const sourceId = typeof event.sourceId === 'string' ? event.sourceId : this.baseSource?.id;
    this.errorHandler?.(message, sourceId, this.baseSource?.id);
  }

  private scheduleResize(): void {
    if (!this.map || this.resizeFrame !== null) {
      return;
    }
    this.resizeFrame = this.requestFrame(() => {
      this.resizeFrame = null;
      this.map?.resize();
    });
  }

  private markDirty(...layers: string[]): void {
    if (!this.mapReady || !this.map) {
      return;
    }
    for (const layer of layers) {
      this.dirtyLayers.add(layer);
    }
    if (this.renderFrame !== null) {
      return;
    }
    // Use setTimeout(..., 0) instead of requestFrame for the first scheduling.
    // This allows the browser to paint and process other events before flushing.
    // Subsequent flushes within the same tick will use requestFrame.
    this.renderFrame = window.setTimeout(() => {
      this.renderFrame = null;
      this.flushDirtyLayers();
    }, 0) as unknown as number;
  }

  private flushDirtyLayers(): void {
    if (!this.mapReady || !this.map || this.dirtyLayers.size === 0) {
      this.dirtyLayers.clear();
      return;
    }
    let processed = 0;
    for (const layer of DIRTY_LAYER_ORDER) {
      if (!this.dirtyLayers.has(layer)) {
        continue;
      }
      this.dirtyLayers.delete(layer);
      this.applyDirtyLayer(layer);
      processed += 1;
      if (processed >= FRAME_LAYER_BUDGET) {
        break;
      }
    }
    if (this.dirtyLayers.size > 0) {
      // Use requestFrame for subsequent flushes to stay synchronized with rendering.
      this.renderFrame = this.requestFrame(() => {
        this.renderFrame = null;
        this.flushDirtyLayers();
      });
    }
  }

  private applyDirtyLayer(layer: string): void {
    switch (layer) {
      case 'vessel':
        this.applyVessel();
        break;
      case 'track':
        this.applyTrack();
        break;
      case 'vector':
        this.applyVector();
        break;
      case 'headingLine':
        this.applyHeadingLine();
        break;
      case 'laylines':
        this.applyLaylines();
        break;
      case 'trueWind':
        this.applyTrueWind();
        break;
      case 'waypoints':
        this.applyWaypoints();
        break;
      case 'route':
        this.applyRoute();
        break;
      case 'savedTracks':
        this.applySavedTracks();
        break;
      case 'benchRoute':
        this.applyBenchRoute();
        break;
      case 'rangeRings':
        this.applyRangeRings();
        break;
      case 'bearingLine':
        this.applyBearingLine();
        break;
      case 'autopilotTarget':
        this.applyAutopilotTarget();
        break;
      case 'aisTargets':
        this.applyAisTargets();
        break;
      case 'aisTracks':
        this.applyAisTracks();
        break;
      case 'aisPredictions':
        this.applyAisPredictions();
        break;
      case 'cpaLines':
        this.applyCpaLines();
        break;
      case 'encDepth':
        this.applyEncDepthAdvisory();
        break;
      case 'camera':
        this.updateCamera();
        break;
    }
  }

  private requestFrame(callback: FrameRequestCallback): number {
    const zoneWindow = window as Window & {
      __zone_symbol__requestAnimationFrame?: typeof requestAnimationFrame;
    };
    const raf =
      zoneWindow.__zone_symbol__requestAnimationFrame ?? window.requestAnimationFrame.bind(window);
    return raf(callback);
  }

  private cancelFrame(handle: number): void {
    const zoneWindow = window as Window & {
      __zone_symbol__cancelAnimationFrame?: typeof cancelAnimationFrame;
    };
    const cancel =
      zoneWindow.__zone_symbol__cancelAnimationFrame ?? window.cancelAnimationFrame.bind(window);
    cancel(handle);
  }

  /** Force the map to recalculate its container dimensions. */
  resize(): void {
    this.scheduleResize();
  }

  setOrientation(orientation: MapOrientation): void {
    if (this.orientation === orientation) {
      return;
    }
    this.orientation = orientation;
    if (!this.map) return;
    this.markDirty('camera');
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  currentZoom(): number {
    return this.map?.getZoom() ?? 0;
  }

  showChartInformation(
    lngLat: [number, number],
    features: IhmFeatureInfoFeature[],
    disclaimer: string,
  ): void {
    if (!this.map) return;
    const content = document.createElement('article');
    content.className = 'chart-information-popup';

    const header = document.createElement('header');
    header.className = 'chart-information-popup__header';
    const headerCopy = document.createElement('div');
    const primaryFeatures = features.filter((feature) => feature.kind === 'feature');
    const contextFeatures = features.filter((feature) => feature.kind === 'context');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'chart-information-popup__eyebrow';
    eyebrow.textContent = 'INFORMACIÓN ENC IHM';
    const heading = document.createElement('strong');
    heading.textContent = primaryFeatures.length === 1
      ? '1 objeto náutico'
      : `${primaryFeatures.length} objetos náuticos`;
    const position = document.createElement('span');
    position.className = 'chart-information-popup__position';
    position.textContent = `${lngLat[1].toFixed(5)}°, ${lngLat[0].toFixed(5)}°`;
    headerCopy.append(eyebrow, heading, position);
    header.append(headerCopy);

    const body = document.createElement('div');
    body.className = 'chart-information-popup__body';
    if (primaryFeatures.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'chart-information-popup__empty';
      empty.textContent = 'No hay objetos náuticos consultables en este punto.';
      body.append(empty);
    } else {
      primaryFeatures.forEach((feature) => body.append(this.createChartInformationFeature(feature)));
    }
    if (contextFeatures.length > 0) {
      const context = document.createElement('details');
      context.className = 'chart-information-popup__context';
      const summary = document.createElement('summary');
      summary.textContent = `Contexto de la carta (${contextFeatures.length})`;
      context.append(summary);
      contextFeatures.forEach((feature) =>
        context.append(this.createChartInformationFeature(feature)));
      body.append(context);
    }

    const footer = document.createElement('footer');
    footer.className = 'chart-information-popup__footer';
    const note = document.createElement('small');
    note.textContent = disclaimer;
    footer.append(note);
    content.append(header, body, footer);
    new maplibregl.Popup({
      closeButton: true,
      className: 'chart-information-map-popup',
      maxWidth: 'min(440px, calc(100vw - 24px))',
      offset: 16,
    })
      .setLngLat(lngLat)
      .setDOMContent(content)
      .addTo(this.map);
  }

  private createChartInformationFeature(feature: IhmFeatureInfoFeature): HTMLElement {
    const card = document.createElement('section');
    card.className = 'chart-information-popup__feature';
    const header = document.createElement('header');
    const title = document.createElement('strong');
    title.textContent = feature.title;
    header.append(title);
    if (feature.objectClass) {
      const badge = document.createElement('span');
      badge.className = 'chart-information-popup__badge';
      badge.textContent = feature.objectClass;
      header.append(badge);
    }
    if (feature.cell) {
      const cell = document.createElement('small');
      cell.textContent = feature.cell;
      header.append(cell);
    }
    card.append(header);
    if (feature.attributes.length > 0) {
      const attributes = document.createElement('dl');
      for (const attribute of feature.attributes) {
        const term = document.createElement('dt');
        term.textContent = attribute.acronym
          ? `${attribute.label} (${attribute.acronym})`
          : attribute.label;
        const value = document.createElement('dd');
        value.textContent = attribute.value;
        attributes.append(term, value);
      }
      card.append(attributes);
    }
    return card;
  }

  updateAisTargets(geojson: FeatureCollection<Point>): void {
    this.lastAisTargets = geojson;
    if (this.mapReady) {
      this.markDirty('aisTargets');
    }
  }

  updateAisTracks(geojson: FeatureCollection<LineString>): void {
    this.lastAisTracks = geojson;
    if (this.mapReady) {
      this.markDirty('aisTracks');
    }
  }

  updateAisPredictions(geojson: FeatureCollection<LineString>): void {
    this.lastAisPredictions = geojson;
    if (this.mapReady) {
      this.markDirty('aisPredictions');
    }
  }

  updateCpaLines(geojson: FeatureCollection<LineString>): void {
    this.lastCpaLines = geojson;
    if (this.mapReady) {
      this.markDirty('cpaLines');
    }
  }

  updateEncDepthAdvisory(
    sector: Polygon | null,
    hazards: FeatureCollection | null,
    danger: boolean,
  ): void {
    this.lastEncDepthAdvisory = {
      type: 'FeatureCollection',
      features: [
        ...(sector ? [{
          type: 'Feature' as const,
          geometry: sector,
          properties: { featureType: 'sector', danger },
        }] : []),
        ...(hazards?.features ?? []).map((feature) => ({
          ...feature,
          properties: { ...(feature.properties ?? {}), featureType: 'hazard', danger },
        })),
      ],
    };
    if (this.mapReady) this.markDirty('encDepth');
  }

  setShallowWaterAlarmActive(active: boolean): void {
    if (this.shallowWaterAlarmActive === active) return;
    this.shallowWaterAlarmActive = active;
    if (this.mapReady) this.markDirty('vessel');
  }

  setAisVesselTypeColors(colors: VesselTypeColors): void {
    this.aisVesselTypeColors = { ...DEFAULT_VESSEL_TYPE_COLORS, ...colors };
    if (!this.map || !this.mapReady) return;
    this.ensureAisIcons();
  }

  setAisTargetsVisible(visible: boolean): void {
    this.aisTargetsVisible = visible;
    if (!this.map || !this.mapReady) return;
    const layer = this.map.getLayer(AIS_LAYER_ID);
    if (layer) {
      this.map.setLayoutProperty(AIS_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
    }
  }

  setAisLabelsVisible(visible: boolean): void {
    this.aisLabelsVisible = visible;
    if (!this.map || !this.mapReady) return;
    const layer = this.map.getLayer(AIS_LAYER_ID);
    if (layer) {
      if (visible) {
        this.map.setLayoutProperty(AIS_LAYER_ID, 'text-field', ['get', 'name']);
        this.map.setLayoutProperty(AIS_LAYER_ID, 'text-offset', [0, 1.8]);
        this.map.setLayoutProperty(AIS_LAYER_ID, 'text-size', 11);
        this.map.setLayoutProperty(AIS_LAYER_ID, 'text-optional', true);
        this.map.setPaintProperty(AIS_LAYER_ID, 'text-color', '#e2e8f0');
        this.map.setPaintProperty(AIS_LAYER_ID, 'text-halo-color', '#0f172a');
        this.map.setPaintProperty(AIS_LAYER_ID, 'text-halo-width', 1);
      } else {
        this.map.setLayoutProperty(AIS_LAYER_ID, 'text-field', '');
      }
    }
  }

  setCpaLinesVisible(visible: boolean): void {
    this.cpaLinesVisible = visible;
    if (!this.map || !this.mapReady) return;
    const layer = this.map.getLayer(CPA_LINE_LAYER_ID);
    if (layer) {
      this.map.setLayoutProperty(CPA_LINE_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
    }
  }

  private ensureAisTracksLayer(): void {
    if (!this.map) return;

    if (!this.map.getSource(AIS_TRACKS_SOURCE_ID)) {
      this.map.addSource(AIS_TRACKS_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!this.map.getLayer(AIS_TRACKS_LAYER_ID)) {
      this.map.addLayer({
        id: AIS_TRACKS_LAYER_ID,
        type: 'line',
        source: AIS_TRACKS_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['case', ['boolean', ['get', 'isDangerous'], false], '#ef4444', '#9ca3af'],
          'line-width': 1.5,
          'line-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 0.75, 1, 0.05],
        },
      });
    }
  }

  private ensureAisPredictionsLayer(): void {
    if (!this.map) return;

    if (!this.map.getSource(AIS_PREDICT_SOURCE_ID)) {
      this.map.addSource(AIS_PREDICT_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!this.map.getLayer(AIS_PREDICT_LAYER_ID)) {
      this.map.addLayer({
        id: AIS_PREDICT_LAYER_ID,
        type: 'line',
        source: AIS_PREDICT_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['case', ['boolean', ['get', 'isDangerous'], false], '#ef4444', '#f59e0b'],
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [2, 3],
        },
      });
    }
  }

  private ensureAisLayer(): void {
    if (!this.map) return;

    this.ensureAisIcons();
    const effectiveScale = this.getEffectiveAisTargetScale(this.aisTargetIconScale);

    if (!this.map.getSource(AIS_SOURCE_ID)) {
      this.map.addSource(AIS_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!this.map.getLayer(AIS_LAYER_ID)) {
      this.map.addLayer({
        id: AIS_LAYER_ID,
        type: 'symbol',
        source: AIS_SOURCE_ID,
        layout: {
          'icon-image': ['case', ['has', 'iconId'], ['get', 'iconId'], AIS_FALLBACK_ICON_ID],
          'icon-size': effectiveScale,
          'icon-allow-overlap': true,
          'icon-rotation-alignment': 'map',
          'icon-rotate': ['get', 'heading'],
        },
        paint: {
          'icon-opacity': ['case', ['boolean', ['get', 'inactive'], false], 0.55, 1],
          'text-opacity': ['case', ['boolean', ['get', 'inactive'], false], 0.6, 1],
        },
      });
    }
  }

  private ensureCpaLinesLayer(): void {
    if (!this.map) return;

    if (!this.map.getSource(CPA_LINE_SOURCE_ID)) {
      this.map.addSource(CPA_LINE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!this.map.getLayer(CPA_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: CPA_LINE_LAYER_ID,
        type: 'line',
        source: CPA_LINE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#ef4444', // Red-500
          'line-width': 2,
          'line-dasharray': [2, 2], // Dashed line
          'line-opacity': 0.8,
        },
      });
    }
  }

  private ensureEncDepthAdvisoryLayer(): void {
    if (!this.map) return;
    if (!this.map.getSource(ENC_DEPTH_SOURCE_ID)) {
      this.map.addSource(ENC_DEPTH_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!this.map.getLayer(ENC_DEPTH_SECTOR_LAYER_ID)) {
      this.map.addLayer({
        id: ENC_DEPTH_SECTOR_LAYER_ID,
        type: 'fill',
        source: ENC_DEPTH_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'sector'],
        paint: {
          // Mirrors --gb-alarm-warning / --gb-data-ok.
          'fill-color': ['case', ['boolean', ['get', 'danger'], false], '#f97316', '#22c55e'],
          'fill-opacity': ['case', ['boolean', ['get', 'danger'], false], 0.3, 0.08],
        },
      });
    }
    if (!this.map.getLayer(ENC_DEPTH_HAZARD_LAYER_ID)) {
      this.map.addLayer({
        id: ENC_DEPTH_HAZARD_LAYER_ID,
        type: 'circle',
        source: ENC_DEPTH_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'hazard'],
        paint: {
          // Mirrors --gb-alarm-critical.
          'circle-color': '#ef4444',
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 11],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
    if (!this.map.getLayer(ENC_DEPTH_HAZARD_AREA_LAYER_ID)) {
      this.map.addLayer({
        id: ENC_DEPTH_HAZARD_AREA_LAYER_ID,
        type: 'line',
        source: ENC_DEPTH_SOURCE_ID,
        filter: ['==', ['get', 'featureType'], 'hazard'],
        paint: {
          // Mirrors --gb-alarm-critical.
          'line-color': '#ef4444',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      });
    }
  }

  private applyAisTargets(): void {
    if (!this.map) return;
    const source = this.map.getSource(AIS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastAisTargets);
  }

  private applyAisTracks(): void {
    if (!this.map) return;
    const source = this.map.getSource(AIS_TRACKS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastAisTracks);
  }

  private applyAisPredictions(): void {
    if (!this.map) return;
    const source = this.map.getSource(AIS_PREDICT_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    source?.setData(this.lastAisPredictions);
  }

  private applyCpaLines(): void {
    if (!this.map) return;
    const source = this.map.getSource(CPA_LINE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastCpaLines);
  }

  private applyEncDepthAdvisory(): void {
    if (!this.map) return;
    const source = this.map.getSource(ENC_DEPTH_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastEncDepthAdvisory);
  }

  private ensureAisIcons(): void {
    if (!this.map) return;

    for (const type of VESSEL_TYPE_KEYS) {
      const color = this.aisVesselTypeColors[type] ?? DEFAULT_VESSEL_TYPE_COLORS[type];
      const normalId = getAisVesselIconId(type);
      const dangerousId = getAisVesselIconId(type, true);

      this.upsertAisIcon(
        normalId,
        this.createAisIcon(color, this.adjustHexColor(color, -0.35), type),
      );
      this.upsertAisIcon(dangerousId, this.createDangerousAisIcon(color, type));
    }

    for (const kind of ['navigation-aid', 'shore-station', 'sart'] as const) {
      this.upsertAisIcon(getAisTargetIconId(kind, 'other'), this.createAisObjectIcon(kind));
      this.upsertAisIcon(
        getAisTargetIconId(kind, 'other', true),
        this.createAisObjectIcon(kind, true),
      );
    }
  }

  private upsertAisIcon(iconId: string, image: ImageData): void {
    this.upsertIcon(iconId, image);
  }

  private upsertIcon(iconId: string, image: ImageData, pixelRatio = 1): void {
    if (!this.map) return;

    if (this.map.hasImage(iconId)) {
      this.map.updateImage(iconId, image);
      return;
    }

    this.map.addImage(iconId, image, { pixelRatio });
  }

  private createDangerousAisIcon(baseColor: string, type: VesselTypeFilter): ImageData {
    return this.createAisIcon(this.adjustHexColor(baseColor, 0.12), '#dc2626', type);
  }

  private createAisIcon(fillColor: string, strokeColor: string, type: VesselTypeFilter): ImageData {
    return this.createVesselIcon(strokeColor, fillColor, type === 'sailing');
  }

  private createAisObjectIcon(
    kind: 'navigation-aid' | 'shore-station' | 'sart',
    dangerous = false,
  ): ImageData {
    const cacheKey = `ais-object:${kind}:${dangerous}`;
    const cached = MapLibreEngineService.iconCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new ImageData(size, size);
    }

    const cx = size / 2;
    const cy = size / 2;
    const accent = dangerous
      ? '#dc2626'
      : kind === 'navigation-aid'
        ? '#f59e0b'
        : kind === 'sart'
          ? '#ef4444'
          : '#38bdf8';
    const stroke = this.adjustHexColor(accent, -0.35);
    const fill = this.adjustHexColor(accent, 0.24);

    ctx.clearRect(0, 0, size, size);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = 5;

    if (kind === 'shore-station') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 42);
      ctx.lineTo(cx + 28, cy + 34);
      ctx.lineTo(cx - 28, cy + 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 4;
      for (const radius of [22, 34]) {
        ctx.beginPath();
        ctx.arc(cx, cy - 24, radius, -0.85, -0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy - 24, radius, Math.PI + 0.2, Math.PI + 0.85);
        ctx.stroke();
      }
      const imageData = ctx.getImageData(0, 0, size, size);
      MapLibreEngineService.iconCache.set(cacheKey, imageData);
      return imageData;
    }

    if (kind === 'sart') {
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();
      const imageData = ctx.getImageData(0, 0, size, size);
      MapLibreEngineService.iconCache.set(cacheKey, imageData);
      return imageData;
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy - 42);
    ctx.lineTo(cx + 34, cy);
    ctx.lineTo(cx, cy + 42);
    ctx.lineTo(cx - 34, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = stroke;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, size, size);
    MapLibreEngineService.iconCache.set(cacheKey, imageData);
    return imageData;
  }

  private cachedBearing: number | null = null;
  private lastBearingReadTime = 0;

  private getCachedBearing(): number {
    const now = performance.now();
    // Cache bearing for 50ms to avoid repeated layout reads in the same frame
    if (this.cachedBearing !== null && now - this.lastBearingReadTime < 50) {
      return this.cachedBearing;
    }
    this.cachedBearing = this.map!.getBearing();
    this.lastBearingReadTime = now;
    return this.cachedBearing;
  }

  private updateCamera(): void {
    if (!this.map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {};

    // 1. Handle Center
    if (this.pendingCenter) {
      // Only update center if strictly needed or if we are syncing bearing too
      // When course-up, we almost always want to sync if center changes (tracking)
      if (!this.appliedCenter || !this.isSameCenter(this.appliedCenter, this.pendingCenter)) {
        options.center = this.pendingCenter;
        this.appliedCenter = [...this.pendingCenter];
      }
    }

    // 2. Handle Bearing (Orientation)
    if (this.orientation === 'north-up') {
      const current = this.getCachedBearing();
      if (Math.abs(current) > 0.01) {
        options.bearing = 0;
      }
    } else {
      // Course-up: only re-orient when heading changes meaningfully, otherwise
      // sub-degree IMU jitter restarts the camera animation on every sample.
      const heading = this.lastVessel.rotationDeg;
      if (typeof heading === 'number') {
        const reference = this.appliedBearing ?? this.getCachedBearing();
        // Ignore sub-degree IMU noise at rest. A real turn crosses this
        // threshold immediately while the map remains visually stable.
        if (this.bearingDelta(reference, heading) > 0.75) {
          options.bearing = heading;
          this.appliedBearing = heading;
        }
      }
    }

    if (Object.keys(options).length > 0) {
      // Complete before the next 10 Hz IMU sample. Longer animations are
      // continually interrupted and make the map visibly trail the sensor.
      this.map.easeTo({
        ...options,
        duration: 80,
        easing: (t) => t,
      });
    }
  }

  /** Smallest absolute angular difference between two bearings, in degrees [0, 180]. */
  private bearingDelta(a: number, b: number): number {
    return Math.abs(((a - b + 540) % 360) - 180);
  }

  private onStyleReady(generation: number): void {
    if (
      !this.map ||
      generation !== this.styleGeneration ||
      this.initializedStyleGeneration === generation
    ) {
      return;
    }
    // MapLibre's style.load means the style graph accepts mutations. Its
    // isStyleLoaded() may turn false again while newly added sources fetch
    // data, which must not stall creation of the remaining navigation layers.
    this.styleReadyGeneration = generation;
    this.initializedStyleGeneration = generation;
    this.cancelStyleInitialization();

    // Phase 1: Layer creation (heavy, blocks rendering). Spread across frames.
    const layerEnsures = [
      () => this.applyOpenSeaMapOverlay(),
      () => {
        if (this.areaSelectionMode) this.renderAreaSelection();
      },
      () => this.applyWeatherOverlays(),
      () => this.ensureTrueWindIcons(),
      () => this.applyEnvironmentVectors(),
      () => this.applyEnvironmentParticles(),
      () => this.ensureVesselLayer(),
      () => this.ensureTrackLayer(),
      () => this.ensureVectorLayer(),
      () => this.ensureHeadingLineLayer(),
      () => this.ensureLaylinesLayer(),
      () => this.ensureTrueWindLayer(),
      () => this.ensureWaypointsLayer(),
      () => this.ensureRouteLayer(),
      () => this.ensureSavedTracksLayer(),
      () => this.ensureRangeRingsLayer(),
      () => this.ensureBearingLineLayer(),
      () => this.ensureAutopilotTargetLayer(),
      () => this.ensureBenchRouteLayers(),
      () => this.ensureAisTracksLayer(),
      () => this.ensureAisPredictionsLayer(),
      () => this.ensureAisLayer(),
      () => this.ensureCpaLinesLayer(),
      () => this.ensureEncDepthAdvisoryLayer(),
    ];

    // Phase 2: Data application + camera (lighter but still can block)
    const dataApplies = [
      () => {
        // Keep the own-vessel marker above AIS targets and chart overlays.
        for (const layerId of [VESSEL_HALO_LAYER_ID, VESSEL_LAYER_ID]) {
          if (this.map?.getLayer(layerId)) {
            this.map.moveLayer(layerId);
          }
        }
      },
      () => this.applyVessel(),
      () => this.applyTrack(),
      () => this.applyVector(),
      () => this.applyHeadingLine(),
      () => this.applyLaylines(),
      () => this.applyTrueWind(),
      () => this.applyWaypoints(),
      () => this.applyRoute(),
      () => this.applySavedTracks(),
      () => this.applyRangeRings(),
      () => this.applyBearingLine(),
      () => this.applyAutopilotTarget(),
      () => this.applyBenchRoute(),
      () => this.applyAisTracks(),
      () => this.applyAisPredictions(),
      () => this.applyAisTargets(),
      () => this.applyCpaLines(),
      () => this.applyEncDepthAdvisory(),
      () => this.updateCamera(),
      () => {
        this.mapReady = true;
        // Re-apply visibility state after style swap
        this.setOwnVesselIconScale(this.ownVesselIconScale);
        this.setAisTargetIconScale(this.aisTargetIconScale);
        this.applyWindTrackZoomRanges();
        this.applyRangeRingZoomRange();
        this.setAisTargetsVisible(this.aisTargetsVisible);
        this.setAisLabelsVisible(this.aisLabelsVisible);
        this.setCpaLinesVisible(this.cpaLinesVisible);
      },
    ];

    // Spread work across multiple animation frames to prevent [Violation] RAF took >50ms.
    // Each task is measured individually. If a single task exceeds the budget,
    // the next task is deferred to the next frame.
    const BATCH_BUDGET_MS = 4; // Reduced from 5 to be more aggressive
    let phase = 0;
    let taskIndex = 0;
    const tasks = [layerEnsures, dataApplies];

    const isCurrentGeneration = (): boolean =>
      this.map !== null && generation === this.styleGeneration;

    const scheduleStyleReadyRetry = (): void => {
      if (!isCurrentGeneration() || this.styleInitTimer !== null) return;
      this.styleInitTimer = setTimeout(() => {
        this.styleInitTimer = null;
        runBatch();
      }, 16);
    };

    const scheduleFrame = (): void => {
      if (!isCurrentGeneration()) return;
      if (!this.canMutateStyle(generation)) {
        scheduleStyleReadyRetry();
        return;
      }
      const handle = this.requestFrame(() => {
        this.styleInitFrames.delete(handle);
        runBatch();
      });
      this.styleInitFrames.add(handle);
    };

    const runBatch = () => {
      if (!isCurrentGeneration()) return;
      if (!this.canMutateStyle(generation)) {
        scheduleStyleReadyRetry();
        return;
      }
      const currentTasks = tasks[phase];
      if (!currentTasks || taskIndex >= currentTasks.length) {
        // Phase complete; move to next phase or finish
        phase++;
        taskIndex = 0;
        if (phase < tasks.length) {
          scheduleFrame();
        }
        return;
      }

      const start = performance.now();
      const task = currentTasks[taskIndex];
      if (!task) {
        // Should not happen, but guard against undefined
        taskIndex++;
        scheduleFrame();
        return;
      }
      if (!this.canMutateStyle(generation)) {
        scheduleStyleReadyRetry();
        return;
      }
      taskIndex++;
      try {
        task();
      } catch (error) {
        this.handleMapError({
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
      const elapsed = performance.now() - start;

      if (elapsed > BATCH_BUDGET_MS) {
        // This single task was heavy. Yield immediately and continue on next frame.
        scheduleFrame();
        return;
      }

      // Check if we have time for another task in this frame
      if (taskIndex < currentTasks.length && performance.now() - start < BATCH_BUDGET_MS) {
        // Schedule microtask to allow browser to paint if needed
        queueMicrotask(() => {
          if (isCurrentGeneration()) runBatch();
        });
      } else if (taskIndex < currentTasks.length) {
        // Budget exceeded, continue on next frame
        scheduleFrame();
      } else {
        // Phase complete
        phase++;
        taskIndex = 0;
        if (phase < tasks.length) {
          scheduleFrame();
        }
      }
    };

    // Defer first batch to next macrotask so the 'load'/'style.load' event handler returns immediately.
    // Use requestIdleCallback if available for non-critical initialization work.
    if (typeof requestIdleCallback === 'function') {
      this.styleInitIdle = requestIdleCallback(() => {
        this.styleInitIdle = null;
        runBatch();
      }, { timeout: 50 });
    } else {
      this.styleInitTimer = setTimeout(() => {
        this.styleInitTimer = null;
        runBatch();
      }, 0);
    }
  }

  private applyOpenSeaMapOverlay(): void {
    const map = this.map;
    if (!map || !this.canMutateStyle()) return;

    const nauticalBaseActive = this.baseSource?.id === 'nautical';
    const shouldShowOverlay = nauticalBaseActive || this.showOpenSeaMap;

    if (shouldShowOverlay) {
      if (!map.getSource(OPENSEAMAP_SOURCE_ID)) {
        map.addSource(OPENSEAMAP_SOURCE_ID, {
          type: 'raster',
          tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
          tileSize: 256,
          minzoom: 8,
          maxzoom: 18,
          attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
        });
      }
      if (!map.getLayer(OPENSEAMAP_LAYER_ID)) {
        // Insert as first overlay, before all GeoJSON layers
        map.addLayer({
          id: OPENSEAMAP_LAYER_ID,
          type: 'raster',
          source: OPENSEAMAP_SOURCE_ID,
          paint: {
            'raster-opacity': nauticalBaseActive ? 0.9 : 0.85,
            'raster-fade-duration': 0,
          },
          minzoom: 8,
        });
      } else {
        map.setPaintProperty(
          OPENSEAMAP_LAYER_ID,
          'raster-opacity',
          nauticalBaseActive ? 0.9 : 0.85,
        );
        map.setPaintProperty(OPENSEAMAP_LAYER_ID, 'raster-fade-duration', 0);
      }
      map.setLayerZoomRange(OPENSEAMAP_LAYER_ID, 8, 24);
    } else {
      if (map.getLayer(OPENSEAMAP_LAYER_ID)) {
        map.removeLayer(OPENSEAMAP_LAYER_ID);
      }
      if (map.getSource(OPENSEAMAP_SOURCE_ID)) {
        map.removeSource(OPENSEAMAP_SOURCE_ID);
      }
    }
  }

  /**
   * Show/hide a weather raster overlay (e.g. OpenWeatherMap temperature/wind),
   * served through the chart-engine tile proxy. Re-applied on every style load.
   */
  setWeatherLayer(id: string, tileUrlTemplate: string | null, visible: boolean, opacity?: number): void {
    if (opacity !== undefined) {
      this.weatherOpacity = opacity;
    }
    const existing = this.weatherLayers.get(id);
    this.weatherLayers.set(id, { tileUrl: tileUrlTemplate, visible });
    if (!existing || existing.tileUrl !== tileUrlTemplate || existing.visible !== visible) {
      this.scheduleWeatherOverlays();
    }
  }

  /** Update the opacity of all visible weather overlays. */
  setWeatherOpacity(opacity: number): void {
    this.weatherOpacity = opacity;
    const map = this.map;
    if (!map || !this.canMutateStyle()) return;
    for (const id of this.weatherLayers.keys()) {
      const layerId = `weather-${id}-layer`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'raster-opacity', opacity);
      }
    }
    for (const id of this.environmentVectors.keys()) {
      const layerId = `environment-${id}-layer`;
      if (!map.getLayer(layerId)) continue;
      if (id === 'sourceGrid') {
        map.setPaintProperty(layerId, 'circle-opacity', opacity);
        continue;
      }
      if (id === 'marineMask') {
        map.setPaintProperty(layerId, 'line-opacity', opacity * 0.75);
        continue;
      }
      if (id === 'encDepth') {
        map.setPaintProperty(layerId, 'fill-opacity', [
          'case',
          ['==', ['get', 'unsafe'], true], opacity * 0.42,
          opacity * 0.2,
        ]);
        const contourLayerId = `${layerId}-direction`;
        if (map.getLayer(contourLayerId)) {
          map.setPaintProperty(contourLayerId, 'line-opacity', opacity * 0.86);
        }
        const soundingLayerId = `${layerId}-values`;
        if (map.getLayer(soundingLayerId)) {
          map.setPaintProperty(soundingLayerId, 'text-opacity', opacity);
        }
        const hazardLayerId = `${layerId}-samples`;
        if (map.getLayer(hazardLayerId)) {
          map.setPaintProperty(hazardLayerId, 'circle-opacity', opacity * 0.82);
        }
        continue;
      }
      if (id === 'wind') {
        map.setPaintProperty(layerId, 'icon-opacity', opacity);
        continue;
      }
      const fillOpacity = id === 'currents'
        ? opacity * 0.48
        : id === 'waves'
          ? opacity * 0.58
          : opacity * 0.64;
      map.setPaintProperty(layerId, 'fill-opacity', fillOpacity);
      const directionLayerId = `${layerId}-direction`;
      if (map.getLayer(directionLayerId)) {
        map.setPaintProperty(directionLayerId, id === 'waves' ? 'icon-opacity' : 'line-opacity', opacity);
      }
      const samplesLayerId = `${layerId}-samples`;
      if (map.getLayer(samplesLayerId)) {
        map.setPaintProperty(samplesLayerId, 'circle-opacity', opacity * 0.72);
      }
    }
    for (const layer of this.activeParticleLayers.values()) {
      layer.setOpacity(opacity);
    }
  }

  setEnvironmentVector(id: string, dataUrl: string | null, visible: boolean): void {
    const existing = this.environmentVectors.get(id);
    this.environmentVectors.set(id, { dataUrl, visible });
    if (!existing || existing.dataUrl !== dataUrl || existing.visible !== visible) {
      this.scheduleEnvironmentVectors();
    }
  }

  setEnvironmentParticles(
    kind: 'wind' | 'currents',
    fieldUrl: string | null,
    maskUrl: string | null,
    visible: boolean,
    zonePolygon: number[][][] | null = null,
  ): void {
    const existing = this.environmentParticles.get(kind);
    const polygonChanged = JSON.stringify(existing?.zonePolygon) !== JSON.stringify(zonePolygon);
    this.environmentParticles.set(kind, { fieldUrl, maskUrl, visible, zonePolygon });
    if (!existing
      || existing.fieldUrl !== fieldUrl
      || existing.maskUrl !== maskUrl
      || existing.visible !== visible
      || polygonChanged) {
      this.scheduleEnvironmentParticles();
    }
  }

  getEnvironmentParticleMetrics(): Record<string, ReturnType<EnvironmentParticleLayer['getMetrics']>> {
    return Object.fromEntries(
      [...this.activeParticleLayers].map(([kind, layer]) => [kind, layer.getMetrics()]),
    );
  }

  private scheduleWeatherOverlays(): void {
    if (this.weatherApplyFrame !== null) return;
    const generation = this.styleGeneration;
    this.weatherApplyFrame = this.requestFrame(() => {
      this.weatherApplyFrame = null;
      if (this.canMutateStyle(generation)) this.applyWeatherOverlays(generation);
    });
  }

  private scheduleEnvironmentVectors(): void {
    if (this.environmentApplyFrame !== null) return;
    const generation = this.styleGeneration;
    this.environmentApplyFrame = this.requestFrame(() => {
      this.environmentApplyFrame = null;
      if (this.canMutateStyle(generation)) this.applyEnvironmentVectors(generation);
    });
  }

  private scheduleEnvironmentParticles(): void {
    if (this.particleApplyFrame !== null) return;
    const generation = this.styleGeneration;
    this.particleApplyFrame = this.requestFrame(() => {
      this.particleApplyFrame = null;
      if (this.canMutateStyle(generation)) this.applyEnvironmentParticles(generation);
    });
  }

  private applyEnvironmentParticles(generation = this.styleGeneration): void {
    const map = this.map;
    if (!map || !this.canMutateStyle(generation)) return;
    for (const [kind, config] of this.environmentParticles) {
      const layerId = `environment-${kind}-particles`;
      const active = this.activeParticleLayers.get(kind);
      if (!config.visible || !config.fieldUrl || !config.maskUrl) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        this.activeParticleLayers.delete(kind);
        continue;
      }
      if (map.getLayer(layerId) && active) {
        active.setUrls(config.fieldUrl, config.maskUrl, config.zonePolygon);
        active.setOpacity(this.weatherOpacity);
        continue;
      }
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      const layer = new EnvironmentParticleLayer(
        layerId,
        kind,
        config.fieldUrl,
        config.maskUrl,
        this.weatherOpacity,
        config.zonePolygon,
      );
      this.activeParticleLayers.set(kind, layer);
      map.addLayer(layer);
    }
  }

  private applyEnvironmentVectors(generation = this.styleGeneration): void {
    const map = this.map;
    if (!map || !this.canMutateStyle(generation)) return;
    for (const [id, config] of this.environmentVectors) {
      const sourceId = `environment-${id}`;
      const layerId = `${sourceId}-layer`;
      const directionLayerId = `${layerId}-direction`;
      const valueLayerId = `${layerId}-values`;
      const samplesLayerId = `${layerId}-samples`;
      if (!config.visible || !config.dataUrl) {
        if (map.getLayer(samplesLayerId)) map.removeLayer(samplesLayerId);
        if (map.getLayer(valueLayerId)) map.removeLayer(valueLayerId);
        if (map.getLayer(directionLayerId)) map.removeLayer(directionLayerId);
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        continue;
      }
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(config.dataUrl);
      else map.addSource(sourceId, { type: 'geojson', data: config.dataUrl });
      if (map.getLayer(layerId)) continue;
      if (id === 'sourceGrid') {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          minzoom: 5,
          filter: ['==', ['get', 'featureType'], 'sourceNode'],
          paint: {
            // MapLibre cannot read CSS variables; this mirrors --gb-data-warn.
            'circle-color': '#facc15',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 14, 6],
            'circle-opacity': this.weatherOpacity,
            // Mirrors --gb-bg-canvas to keep nodes visible on scalar fields.
            'circle-stroke-color': '#07111f',
            'circle-stroke-width': 1.5,
          },
        });
      } else if (id === 'marineMask') {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          filter: ['==', ['get', 'featureType'], 'marineMask'],
          paint: {
            // Mirrors --gb-border-active; identifies effective marine coverage.
            'line-color': '#38bdf8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 14, 2.2],
            'line-opacity': this.weatherOpacity * 0.75,
            'line-dasharray': [3, 2],
          },
        });
      } else if (id === 'encDepth') {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['get', 'featureType'], 'depthArea'],
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'unsafe'], true], '#ef4444',
              ['interpolate', ['linear'], ['coalesce', ['get', 'shallowestDepth'], 50],
                0, '#ef4444', 5, '#facc15', 10, '#38bdf8', 20, '#0e7490'],
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'unsafe'], true], 0.42,
              0.2,
            ],
            'fill-antialias': true,
          },
        });
        map.addLayer({
          id: directionLayerId,
          type: 'line',
          source: sourceId,
          minzoom: 10,
          filter: ['==', ['get', 'featureType'], 'depthContour'],
          paint: {
            'line-color': '#7ab3c8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 2.2],
            'line-opacity': 0.86,
          },
        });
        map.addLayer({
          id: valueLayerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 13,
          filter: ['==', ['get', 'featureType'], 'sounding'],
          layout: {
            'text-field': [
              'to-string',
              ['coalesce', ['get', 'soundingDepth'], ''],
            ],
            'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 17, 13],
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#2a6080',
            'text-halo-color': '#f0f9fd',
            'text-halo-width': 1.5,
          },
        });
        map.addLayer({
          id: samplesLayerId,
          type: 'circle',
          source: sourceId,
          minzoom: 10,
          filter: ['==', ['get', 'featureType'], 'hazard'],
          paint: {
            'circle-color': '#ef4444',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 8],
            'circle-opacity': 0.82,
            'circle-stroke-color': '#facc15',
            'circle-stroke-width': 1.5,
          },
        });
      } else if (id === 'wind') {
        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 6,
          filter: ['==', ['get', 'featureType'], 'windDirection'],
          layout: {
            'icon-image': [
              'step', ['get', 'speedKnots'],
              windBarbIconId(0),
              2.5, windBarbIconId(5),
              7.5, windBarbIconId(10),
              12.5, windBarbIconId(15),
              17.5, windBarbIconId(20),
              22.5, windBarbIconId(25),
              27.5, windBarbIconId(30),
              32.5, windBarbIconId(35),
              37.5, windBarbIconId(40),
              42.5, windBarbIconId(45),
              47.5, windBarbIconId(50),
              52.5, windBarbIconId(55),
              57.5, windBarbIconId(60),
              62.5, windBarbIconId(65),
              67.5, windBarbIconId(70),
              72.5, windBarbIconId(75),
              77.5, windBarbIconId(80),
              82.5, windBarbIconId(85),
              87.5, windBarbIconId(90),
              92.5, windBarbIconId(95),
              97.5, windBarbIconId(100),
            ],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.72, 10, 0.92, 14, 1.08],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
            // Meteorological convention: the shaft points FROM the wind source.
            'icon-rotate': ['get', 'directionDeg'],
          },
          paint: {
            'icon-opacity': this.weatherOpacity,
          },
        });
      } else if (id === 'currents') {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['get', 'featureType'], 'cell'],
          paint: {
            // Marine current scale; WebGL paint cannot read Glass Bridge tokens.
            'fill-color': [
              'interpolate', ['linear'], ['get', 'speedKnots'],
              0, '#0e7490',
              0.5, '#38bdf8',
              1, '#facc15',
              2, '#ef4444',
            ],
            'fill-opacity': this.weatherOpacity * 0.48,
            'fill-antialias': false,
          },
        });
        map.addLayer({
          id: directionLayerId,
          type: 'line',
          source: sourceId,
          minzoom: 6,
          filter: ['==', ['get', 'featureType'], 'direction'],
          paint: {
            // Vector geometry avoids font/glyph dependencies across base-map styles.
            'line-color': '#e0f2fe',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              6, ['interpolate', ['linear'], ['get', 'speedKnots'], 0, 1.8, 2, 3],
              14, ['interpolate', ['linear'], ['get', 'speedKnots'], 0, 2.8, 2, 4.8],
            ],
            'line-opacity': this.weatherOpacity,
          },
        });
        map.addLayer({
          id: valueLayerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 8,
          filter: ['==', ['get', 'featureType'], 'cell'],
          layout: {
            'text-field': [
              'format',
              ['number-format', ['get', 'speedKnots'], { 'min-fraction-digits': 1, 'max-fraction-digits': 1 }],
              {},
              ' kn',
              { 'font-scale': 0.78 },
            ],
            'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 14],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-optional': true,
          },
          paint: {
            // Mirrors --gb-text-value and --gb-bg-canvas.
            'text-color': '#e0f2fe',
            'text-halo-color': '#07111f',
            'text-halo-width': 2,
            'text-opacity': this.weatherOpacity,
          },
        });
      } else if (id === 'waves') {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['get', 'featureType'], 'cell'],
          paint: {
            // Glass Bridge blue/yellow/red scale for modeled wave height.
            'fill-color': [
              'interpolate', ['linear'], ['get', 'heightMeters'],
              0, '#0e7490',
              0.5, '#38bdf8',
              1.5, '#facc15',
              3, '#f97316',
              5, '#ef4444',
            ],
            'fill-opacity': this.weatherOpacity * 0.58,
            'fill-antialias': false,
          },
        });
        map.addLayer({
          id: directionLayerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 6,
          filter: ['==', ['get', 'featureType'], 'waveSymbol'],
          layout: {
            'symbol-placement': 'point',
            'icon-image': [
              'step', ['get', 'heightMeters'],
              WAVE_ICON_LOW_ID,
              1, WAVE_ICON_MODERATE_ID,
              2.5, WAVE_ICON_HIGH_ID,
            ],
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              6, ['interpolate', ['linear'], ['get', 'heightMeters'], 0, 0.76, 5, 1.07],
              10, ['interpolate', ['linear'], ['get', 'heightMeters'], 0, 0.96, 5, 1.35],
              14, ['interpolate', ['linear'], ['get', 'heightMeters'], 0, 1.14, 5, 1.61],
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-padding': 3,
            'icon-rotation-alignment': 'map',
            // The breaking-wave glyph points north before MapLibre rotation.
            'icon-rotate': ['get', 'directionDeg'],
            'text-field': [
              'format',
              ['number-format', ['get', 'heightMeters'], { 'min-fraction-digits': 1, 'max-fraction-digits': 1 }],
              {},
              ' m',
              { 'font-scale': 0.82 },
              '\n',
              {},
              ['number-format', ['get', 'periodSeconds'], { 'min-fraction-digits': 0, 'max-fraction-digits': 1 }],
              { 'font-scale': 0.78 },
              ' s',
              { 'font-scale': 0.68 },
            ],
            'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 14, 14],
            'text-offset': [0, 2.7],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-optional': true,
          },
          paint: {
            'icon-opacity': this.weatherOpacity,
            // Mirrors --gb-text-value and --gb-bg-canvas.
            'text-color': '#e0f2fe',
            'text-halo-color': '#07111f',
            'text-halo-width': 2,
            'text-opacity': this.weatherOpacity,
          },
        });
      } else {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['get', 'featureType'], 'cell'],
          paint: {
            // Temperature is mapped by its value, not by point density.
            'fill-color': [
              'interpolate', ['linear'], ['get', 'value'],
              10, '#1e3a8a',
              14, '#0e7490',
              18, '#38bdf8',
              21, '#facc15',
              24, '#ef4444',
            ],
            'fill-opacity': this.weatherOpacity * 0.64,
            'fill-antialias': false,
          },
        });
        map.addLayer({
          id: `${layerId}-samples`,
          type: 'circle',
          source: sourceId,
          filter: ['==', ['get', 'featureType'], 'marineSample'],
          paint: {
            'circle-color': [
              'interpolate', ['linear'], ['get', 'value'],
              10, '#1e3a8a',
              14, '#0e7490',
              18, '#38bdf8',
              21, '#facc15',
              24, '#ef4444',
            ],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 9, 14, 15],
            'circle-opacity': this.weatherOpacity * 0.72,
            'circle-blur': 0.28,
          },
        });
      }
    }
    this.orderEnvironmentLayers(map);
  }

  private orderEnvironmentLayers(map: maplibregl.Map): void {
    if (typeof map.moveLayer !== 'function' || typeof map.getStyle !== 'function') return;
    const depthAreaId = 'environment-encDepth-layer';
    const depthDetailIds = [
      'environment-marineMask-layer',
      'environment-encDepth-layer-direction',
      'environment-encDepth-layer-values',
      'environment-encDepth-layer-samples',
    ];
    const layerIds = (map.getStyle().layers ?? []).map((layer) => layer.id);
    const firstEnvironmentalField = layerIds.find((id) =>
      id.startsWith('environment-')
      && id !== depthAreaId
      && !depthDetailIds.includes(id));

    // Conservative depth tint belongs above the base chart, but below weather
    // fields. Contours, soundings, hazards and the effective-mask outline remain
    // readable above those fields while staying below navigation/AIS overlays.
    if (map.getLayer(depthAreaId) && firstEnvironmentalField) {
      map.moveLayer(depthAreaId, firstEnvironmentalField);
    }
    const firstNavigationLayer = layerIds.find((id) => id.startsWith('chart-'));
    for (const layerId of depthDetailIds) {
      if (!map.getLayer(layerId)) continue;
      if (firstNavigationLayer && map.getLayer(firstNavigationLayer)) {
        map.moveLayer(layerId, firstNavigationLayer);
      } else {
        map.moveLayer(layerId);
      }
    }
  }

  private showEncDepthPopup(
    lngLat: maplibregl.LngLat,
    properties: Record<string, unknown>,
  ): void {
    const featureType = String(properties['featureType'] ?? '');
    const title = featureType === 'sounding'
      ? 'Sonda ENC'
      : featureType === 'depthContour'
        ? 'Veril ENC'
        : featureType === 'hazard'
          ? 'Peligro ENC'
          : 'Área de profundidad ENC';
    const attributes = [
      ['Profundidad mínima', properties['shallowestDepth']],
      ['Profundidad máxima', properties['deepestDepth']],
      ['Profundidad de sonda', properties['soundingDepth']],
      ['Profundidad del veril', properties['contourDepth']],
      ['Calidad de datos', properties['catzoc']],
      ['Escala mínima', properties['scamin']],
      ['Carta', properties['chartId']],
    ].flatMap(([label, value]) =>
      value === null || value === undefined || value === '' ? [] : [{
        label: String(label),
        acronym: null,
        value: String(value),
      }]);
    this.showChartInformation(
      [lngLat.lng, lngLat.lat],
      [{
        title,
        objectClass: typeof properties['objectClass'] === 'string' ? properties['objectClass'] : null,
        cell: typeof properties['chartId'] === 'string' ? properties['chartId'] : null,
        kind: 'feature',
        attributes,
        details: '',
      }],
      'Ayuda consultiva no certificada. Requiere una ENC autorizada y actualizada.',
    );
  }

  private showMarineMaskPopup(
    lngLat: maplibregl.LngLat,
    properties: Record<string, unknown>,
  ): void {
    const source = properties['source'] === 'enc'
      ? 'ENC vectorial autorizada'
      : 'Máscara costera de respaldo';
    this.showChartInformation(
      [lngLat.lng, lngLat.lat],
      [{
        title: 'Cobertura marina efectiva',
        objectClass: null,
        cell: null,
        kind: 'feature',
        attributes: [
          { label: 'Fuente', acronym: null, value: source },
          { label: 'Precisión', acronym: null, value: String(properties['precision'] ?? 'desconocida') },
          { label: 'Cobertura', acronym: null, value: String(properties['coverage'] ?? 'desconocida') },
          {
            label: 'Respaldo parcial',
            acronym: null,
            value: properties['fallbackUsed'] === true ? 'Sí' : 'No',
          },
        ],
        details: '',
      }],
      'El contorno limita la visualización ambiental; no determina por sí solo agua navegable.',
    );
  }

  private showEnvironmentPopup(lngLat: maplibregl.LngLat, layerId: string, properties: Record<string, unknown>): void {
    if (!this.map) return;
    const kind: EnvironmentPopupKind = layerId.includes('currents')
      ? 'currents'
      : layerId.includes('waves')
        ? 'waves'
        : layerId.includes('wind')
          ? 'wind'
          : 'temperature';
    const details = environmentPopupDetails(kind, properties);
    const content = document.createElement('article');
    content.className = 'environment-feature-popup';

    const header = document.createElement('header');
    header.className = 'environment-feature-popup__header';
    const icon = document.createElement('span');
    icon.className = `environment-feature-popup__icon environment-feature-popup__icon--${kind}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = details.icon;
    const heading = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'environment-feature-popup__eyebrow';
    eyebrow.textContent = 'CONDICIÓN EN EL PUNTO';
    const title = document.createElement('strong');
    title.textContent = details.title;
    const position = document.createElement('span');
    position.className = 'environment-feature-popup__position';
    position.textContent = `${Math.abs(lngLat.lat).toFixed(4)}° ${lngLat.lat >= 0 ? 'N' : 'S'} · ${Math.abs(lngLat.lng).toFixed(4)}° ${lngLat.lng >= 0 ? 'E' : 'W'}`;
    heading.append(eyebrow, title, position);
    header.append(icon, heading);

    const hero = document.createElement('section');
    hero.className = 'environment-feature-popup__hero';
    const heroValue = document.createElement('span');
    heroValue.className = 'environment-feature-popup__value';
    heroValue.textContent = details.value;
    const heroUnit = document.createElement('span');
    heroUnit.className = 'environment-feature-popup__unit';
    heroUnit.textContent = details.unit;
    const heroState = document.createElement('span');
    heroState.className = `environment-feature-popup__state environment-feature-popup__state--${details.severity}`;
    heroState.textContent = details.state;
    hero.append(heroValue, heroUnit, heroState);

    const metrics = document.createElement('section');
    metrics.className = 'environment-feature-popup__metrics';
    for (const metric of details.metrics) {
      const card = document.createElement('div');
      card.className = 'environment-feature-popup__metric';
      const label = document.createElement('span');
      label.textContent = metric.label;
      const value = document.createElement('strong');
      value.textContent = metric.value;
      if (metric.bearing !== undefined) {
        const bearing = document.createElement('span');
        bearing.className = 'environment-feature-popup__bearing';
        bearing.style.transform = `rotate(${metric.bearing}deg)`;
        bearing.textContent = '↑';
        bearing.setAttribute('aria-hidden', 'true');
        value.prepend(bearing);
      }
      card.append(label, value);
      metrics.appendChild(card);
    }

    const footer = document.createElement('footer');
    footer.className = 'environment-feature-popup__footer';
    const provenance = document.createElement('span');
    provenance.textContent = details.provenance;
    const advisory = document.createElement('span');
    advisory.textContent = 'Apoyo a la navegación';
    footer.append(provenance, advisory);

    content.append(header, hero, metrics, footer);
    this.environmentPopup?.remove();
    this.environmentPopup = new maplibregl.Popup({
      anchor: 'top',
      className: 'environment-map-popup',
      closeButton: true,
      closeOnClick: true,
      focusAfterOpen: true,
      maxWidth: 'min(370px, calc(100vw - 24px))',
      offset: 18,
    })
      .setLngLat(lngLat)
      .setDOMContent(content)
      .addTo(this.map);
  }

  private applyWeatherOverlays(generation = this.styleGeneration): void {
    const map = this.map;
    if (!map || !this.canMutateStyle(generation)) return;

    for (const [id, layer] of this.weatherLayers) {
      const sourceId = `weather-${id}`;
      const layerId = `weather-${id}-layer`;

      if (layer.visible && layer.tileUrl) {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [layer.tileUrl],
            tileSize: 256,
            minzoom: 3,
            maxzoom: 10,
            attribution: 'Atmospheric forecast &copy; OpenWeatherMap',
          });
        }
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': this.weatherOpacity,
              'raster-fade-duration': 0,
              // Boost low-contrast weather tiles so they remain readable over
              // the dark Glass Bridge chart base at night.
              'raster-brightness-max': 1,
              'raster-saturation': 0.15,
            },
          });
        } else {
          map.setPaintProperty(layerId, 'raster-opacity', this.weatherOpacity);
        }
      } else {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    }
  }

  private ensureMeasurementLayers(): void {
    if (!this.map) return;

    // Line source
    if (!this.map.getSource(MEASURE_SOURCE_ID)) {
      this.map.addSource(MEASURE_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }
    // Line layer — dashed orange
    if (!this.map.getLayer(MEASURE_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: MEASURE_LINE_LAYER_ID,
        type: 'line',
        source: MEASURE_SOURCE_ID,
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.5,
          'line-dasharray': [4, 3],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    }
    // Label layer — text along line midpoint
    if (!this.map.getLayer(MEASURE_LABEL_LAYER_ID)) {
      this.map.addLayer({
        id: MEASURE_LABEL_LAYER_ID,
        type: 'symbol',
        source: MEASURE_SOURCE_ID,
        layout: {
          'symbol-placement': 'line-center',
          'text-field': ['get', 'label'],
          'text-size': 13,
          'text-font': ['Noto Sans Regular'],
          'text-offset': [0, -1],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#f59e0b',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 2,
        },
      });
    }

    // Points source
    if (!this.map.getSource(MEASURE_POINTS_SOURCE_ID)) {
      this.map.addSource(MEASURE_POINTS_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_POINTS,
      });
    }
    // Points layer — circle markers
    if (!this.map.getLayer(MEASURE_POINTS_LAYER_ID)) {
      this.map.addLayer({
        id: MEASURE_POINTS_LAYER_ID,
        type: 'circle',
        source: MEASURE_POINTS_SOURCE_ID,
        paint: {
          'circle-radius': 5,
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#000',
          'circle-stroke-width': 1.5,
        },
      });
    }
  }

  private applyMeasurement(
    pointA: [number, number] | null,
    pointB: [number, number] | null,
    bearingDeg: number | null,
    distanceNm: number | null,
  ): void {
    if (!this.map) return;

    // Build points
    const pointFeatures: Array<GeoJSON.Feature<GeoJSON.Point>> = [];
    if (pointA) {
      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pointA },
        properties: {},
      });
    }
    if (pointB) {
      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pointB },
        properties: {},
      });
    }

    const pointsSource = this.map.getSource(MEASURE_POINTS_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (pointsSource) {
      pointsSource.setData({ type: 'FeatureCollection', features: pointFeatures });
    }

    // Build line
    const lineFeatures: Array<GeoJSON.Feature<GeoJSON.LineString>> = [];
    if (pointA && pointB) {
      const label = `${bearingDeg !== null ? bearingDeg.toFixed(0) : '--'}° · ${distanceNm !== null ? distanceNm.toFixed(2) : '--'} NM`;
      lineFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [pointA, pointB] },
        properties: { label },
      });
    }

    const lineSource = this.map.getSource(MEASURE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (lineSource) {
      lineSource.setData({ type: 'FeatureCollection', features: lineFeatures });
    }
  }

  private ensureVesselLayer(): void {
    if (!this.map) {
      return;
    }

    const effectiveScale = this.getEffectiveOwnVesselScale(this.ownVesselIconScale);

    this.upsertIcon(VESSEL_ICON_ID, this.createVesselIcon('#0284c7', '#38bdf8'), 2);
    this.upsertIcon(VESSEL_ICON_STALE_ID, this.createVesselIcon('#eab308', '#fde047'), 2);
    this.upsertIcon(VESSEL_ICON_NO_FIX_ID, this.createVesselIcon('#6b7280', '#9ca3af'), 2);

    if (!this.map.getSource(VESSEL_SOURCE_ID)) {
      this.map.addSource(VESSEL_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_POINTS,
      });
    }

    if (!this.map.getLayer(VESSEL_LAYER_ID)) {
      this.map.addLayer({
        id: VESSEL_LAYER_ID,
        type: 'symbol',
        source: VESSEL_SOURCE_ID,
        layout: {
          'icon-image': [
            'match',
            ['get', 'state'],
            'stale',
            VESSEL_ICON_STALE_ID,
            'no-fix',
            VESSEL_ICON_NO_FIX_ID,
            // default
            VESSEL_ICON_ID,
          ],
          'icon-size': effectiveScale,
          'icon-allow-overlap': true,
          'icon-rotation-alignment': 'map',
          'icon-rotate': ['get', 'heading'],
        },
      });
    }
  }

  private ensureTrackLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(TRACK_SOURCE_ID)) {
      this.map.addSource(TRACK_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(TRACK_LAYER_ID)) {
      this.map.addLayer({
        id: TRACK_LAYER_ID,
        type: 'line',
        source: TRACK_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 3,
          'line-opacity': 0.7,
        },
      });
    }
  }

  private ensureVectorLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(VECTOR_SOURCE_ID)) {
      this.map.addSource(VECTOR_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(VECTOR_LAYER_ID)) {
      this.map.addLayer({
        id: VECTOR_LAYER_ID,
        type: 'line',
        source: VECTOR_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: 'none',
        },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3.5,
          'line-opacity': 0.95,
          'line-dasharray': [1.5, 1.5],
        },
      });
    }
  }

  private ensureHeadingLineLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(HEADING_LINE_SOURCE_ID)) {
      this.map.addSource(HEADING_LINE_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(HEADING_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: HEADING_LINE_LAYER_ID,
        type: 'line',
        source: HEADING_LINE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: 'none',
        },
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 3.2,
          'line-opacity': 0.95,
          'line-dasharray': [4, 2],
        },
      });
    }
  }

  private ensureLaylinesLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(LAYLINES_SOURCE_ID)) {
      this.map.addSource(LAYLINES_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(LAYLINES_LAYER_ID)) {
      this.map.addLayer({
        id: LAYLINES_LAYER_ID,
        type: 'line',
        source: LAYLINES_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: 'none',
        },
        paint: {
          'line-color': '#a855f7',
          'line-width': 1.8,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      });
    }
  }

  private ensureTrueWindLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(TRUE_WIND_SOURCE_ID)) {
      this.map.addSource(TRUE_WIND_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(TRUE_WIND_LAYER_ID)) {
      this.map.addLayer({
        id: TRUE_WIND_LAYER_ID,
        type: 'line',
        source: TRUE_WIND_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: 'none',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#10b981'],
          'line-width': 4,
          'line-opacity': 0.92,
        },
      });
    }

    if (!this.map.getLayer(VESSEL_HALO_LAYER_ID)) {
      this.map.addLayer({
        id: VESSEL_HALO_LAYER_ID,
        type: 'circle',
        source: VESSEL_SOURCE_ID,
        paint: {
          'circle-radius': ['match', ['get', 'state'], 'no-fix', 16, 'stale', 13, 11],
          'circle-color': [
            'case',
            ['boolean', ['get', 'shallowAlarm'], false],
            '#ef4444',
            ['match', ['get', 'state'], 'no-fix', '#ef4444', 'stale', '#eab308', '#0ea5e9'],
          ],
          'circle-opacity': ['case', ['boolean', ['get', 'shallowAlarm'], false], 0.58, 0.32],
          'circle-stroke-color': [
            'match',
            ['get', 'state'],
            'no-fix',
            '#fecaca',
            'stale',
            '#fef08a',
            '#e0f2fe',
          ],
          'circle-stroke-width': 3,
        },
      });
    }

    if (!this.map.getSource(TRUE_WIND_ARROW_SOURCE_ID)) {
      this.map.addSource(TRUE_WIND_ARROW_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_POINTS,
      });
    }

    if (!this.map.getLayer(TRUE_WIND_ARROW_LAYER_ID)) {
      this.map.addLayer({
        id: TRUE_WIND_ARROW_LAYER_ID,
        type: 'symbol',
        source: TRUE_WIND_ARROW_SOURCE_ID,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.9,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-rotation-alignment': 'map',
          'icon-rotate': ['get', 'direction'],
          visibility: 'none',
        },
      });
    }
  }

  private ensureWaypointsLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(WAYPOINT_SOURCE_ID)) {
      this.map.addSource(WAYPOINT_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_POINTS,
      });
    }

    if (!this.map.getLayer(WAYPOINT_LAYER_ID)) {
      this.map.addLayer({
        id: WAYPOINT_LAYER_ID,
        type: 'circle',
        source: WAYPOINT_SOURCE_ID,
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['boolean', ['get', 'active'], false], '#0b7dbd', '#ffffff'],
          'circle-stroke-color': '#22c55e',
          'circle-stroke-width': 2,
        },
      });
    }
  }

  private ensureRouteLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(ROUTE_SOURCE_ID)) {
      this.map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(ROUTE_LAYER_ID)) {
      this.map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 2,
          'line-opacity': 0.85,
          'line-dasharray': [2, 1.2],
        },
      });
    }
  }

  private applyVessel(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(VESSEL_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    if (!this.lastVessel.lngLat) {
      source.setData(EMPTY_POINTS);
      return;
    }

    const data: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: this.lastVessel.lngLat,
          },
          properties: {
            heading: this.lastVessel.rotationDeg ?? 0,
            state: this.lastVessel.state,
            label: this.lastVessel.state === 'no-fix' ? 'MI BARCO · SIN GPS' : 'MI BARCO',
            shallowAlarm: this.shallowWaterAlarmActive,
          },
        },
      ],
    };

    source.setData(data);
  }

  private applyTrack(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    if (this.lastTrack.length === 0) {
      source.setData(EMPTY_LINE);
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastTrack,
          },
          properties: {},
        },
      ],
    };

    source.setData(data);
  }

  private applyTrueWind(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(TRUE_WIND_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const arrowSource = this.map.getSource(TRUE_WIND_ARROW_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source || !arrowSource || !this.map.getLayer(TRUE_WIND_LAYER_ID)) {
      return;
    }

    const winds: Array<{ wind: WindMapUpdate; color: string; icon: string }> = [];
    if (this.lastTrueWind.visible && this.lastTrueWind.coords.length >= 2) {
      winds.push({
        wind: this.lastTrueWind,
        color: this.windColor(this.lastTrueWind.speedMps),
        icon: this.windArrowIcon(this.lastTrueWind.speedMps),
      });
    }
    if (this.lastApparentWind.visible && this.lastApparentWind.coords.length >= 2) {
      winds.push({
        wind: this.lastApparentWind,
        color: APPARENT_WIND_COLOR,
        icon: APPARENT_WIND_ARROW_ID,
      });
    }

    if (winds.length === 0) {
      source.setData(EMPTY_LINE);
      arrowSource.setData(EMPTY_POINTS);
      this.map.setLayoutProperty(TRUE_WIND_LAYER_ID, 'visibility', 'none');
      this.map.setLayoutProperty(TRUE_WIND_ARROW_LAYER_ID, 'visibility', 'none');
      this.trueWindLabelMarker?.remove();
      this.trueWindLabelMarker = null;
      return;
    }

    const lineFeatures: Feature<LineString>[] = winds.map(({ wind, color }) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: wind.coords },
      properties: { color },
    }));
    const arrowFeatures: Feature<Point>[] = [];
    for (const { wind, icon } of winds) {
      const endpoint = wind.coords[wind.coords.length - 1];
      if (!endpoint) {
        continue;
      }
      arrowFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: endpoint },
        properties: { direction: (wind.directionDeg + 180) % 360, icon },
      });
    }

    source.setData({ type: 'FeatureCollection', features: lineFeatures });
    arrowSource.setData({ type: 'FeatureCollection', features: arrowFeatures });
    this.map.setLayoutProperty(TRUE_WIND_LAYER_ID, 'visibility', 'visible');
    this.map.setLayoutProperty(TRUE_WIND_ARROW_LAYER_ID, 'visibility', 'visible');

    // Defer DOM marker updates to a separate RAF to avoid long RAF handlers.
    // Label the primary (true) wind when shown.
    const primary = winds[0]!;
    const labelEndpoint = primary.wind.coords[primary.wind.coords.length - 1];
    if (labelEndpoint) {
      this.scheduleMarkerUpdate(() =>
        this.updateTrueWindLabel(primary.wind, labelEndpoint, primary.color),
      );
    }

    // Separate label for apparent wind when both winds are visible
    if (winds.length >= 2) {
      const apparent = winds[1]!;
      const appEndpoint = apparent.wind.coords[apparent.wind.coords.length - 1];
      if (appEndpoint) {
        this.scheduleMarkerUpdate(() =>
          this.updateApparentWindLabel(apparent.wind, appEndpoint, APPARENT_WIND_COLOR),
        );
      }
    } else {
      this.scheduleMarkerUpdate(() => {
        this.apparentWindLabelMarker?.remove();
        this.apparentWindLabelMarker = null;
      });
    }
  }

  private applyVector(): void {
    if (!this.map) return;

    const source = this.map.getSource(VECTOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !this.map.getLayer(VECTOR_LAYER_ID)) return;

    if (!this.lastVector.visible || this.lastVector.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(VECTOR_LAYER_ID, 'visibility', 'none');
      this.cogLabelMarker?.remove();
      this.cogLabelMarker = null;
      this.clearCogTimeTicks();
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: this.lastVector.coords },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(VECTOR_LAYER_ID, 'visibility', 'visible');

    // Defer DOM marker updates to a separate RAF to avoid long RAF handlers.
    // COG label at vector endpoint
    const endpoint = this.lastVector.coords[this.lastVector.coords.length - 1];
    if (endpoint && this.lastVector.label) {
      this.scheduleMarkerUpdate(() => this.updateCogLabel(endpoint, this.lastVector.label!));
    } else {
      this.scheduleMarkerUpdate(() => {
        this.cogLabelMarker?.remove();
        this.cogLabelMarker = null;
      });
    }

    // Time-tick markers along the COG predictor line
    this.scheduleMarkerUpdate(() => this.updateCogTimeTicks(this.lastVector.timeTicks));
  }

  private applyHeadingLine(): void {
    if (!this.map) return;

    const source = this.map.getSource(HEADING_LINE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source || !this.map.getLayer(HEADING_LINE_LAYER_ID)) return;

    if (!this.lastHeadingLine.visible || this.lastHeadingLine.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(HEADING_LINE_LAYER_ID, 'visibility', 'none');
      this.headingLabelMarker?.remove();
      this.headingLabelMarker = null;
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: this.lastHeadingLine.coords },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(HEADING_LINE_LAYER_ID, 'visibility', 'visible');

    // Defer DOM marker update to a separate RAF to avoid long RAF handlers.
    // Heading label at line endpoint
    const endpoint = this.lastHeadingLine.coords[this.lastHeadingLine.coords.length - 1];
    if (endpoint && this.lastHeadingLine.headingDeg !== null) {
      this.scheduleMarkerUpdate(() =>
        this.updateHeadingLabel(endpoint, this.lastHeadingLine.headingDeg!),
      );
    } else {
      this.scheduleMarkerUpdate(() => {
        this.headingLabelMarker?.remove();
        this.headingLabelMarker = null;
      });
    }
  }

  private applyLaylines(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(LAYLINES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !this.map.getLayer(LAYLINES_LAYER_ID)) {
      return;
    }

    if (!this.lastLaylines.visible || this.lastLaylines.lines.length === 0) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(LAYLINES_LAYER_ID, 'visibility', 'none');
      return;
    }

    const features: FeatureCollection<LineString>['features'] = [];
    for (const line of this.lastLaylines.lines) {
      if (line.length < 2) {
        continue;
      }
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: line,
        },
        properties: {},
      });
    }

    if (features.length === 0) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(LAYLINES_LAYER_ID, 'visibility', 'none');
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
    this.map.setLayoutProperty(LAYLINES_LAYER_ID, 'visibility', 'visible');
  }

  private applyWaypoints(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(WAYPOINT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastWaypoints ?? EMPTY_POINTS);
  }

  private applyRoute(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastRoute ?? EMPTY_LINE);
  }

  private applySavedTracks(): void {
    if (!this.map) {
      return;
    }
    this.ensureSavedTracksLayer();
    const source = this.map.getSource(SAVED_TRACKS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastSavedTracks ?? EMPTY_LINE);
  }

  private ensureSavedTracksLayer(): void {
    if (!this.map) {
      return;
    }
    if (!this.map.getSource(SAVED_TRACKS_SOURCE_ID)) {
      this.map.addSource(SAVED_TRACKS_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }
    if (!this.map.getLayer(SAVED_TRACKS_LAYER_ID)) {
      this.map.addLayer({
        id: SAVED_TRACKS_LAYER_ID,
        type: 'line',
        source: SAVED_TRACKS_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#a78bfa', // --gb-violet — saved tracks
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [4, 3],
        },
      });
    }
  }

  private ensureRangeRingsLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(RANGE_RINGS_SOURCE_ID)) {
      this.map.addSource(RANGE_RINGS_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!this.map.getLayer(RANGE_RINGS_LAYER_ID)) {
      this.map.addLayer({
        id: RANGE_RINGS_LAYER_ID,
        type: 'line',
        source: RANGE_RINGS_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#e11d48', // distinct red
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2],
        },
      });
    }
  }

  private ensureBearingLineLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(BEARING_LINE_SOURCE_ID)) {
      this.map.addSource(BEARING_LINE_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(BEARING_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: BEARING_LINE_LAYER_ID,
        type: 'line',
        source: BEARING_LINE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#f59e0b', // amber-500
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [3, 3],
        },
      });
    }
  }

  private applyRangeRings(): void {
    if (!this.map) {
      return;
    }
    const source = this.map.getSource(RANGE_RINGS_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    source?.setData(this.lastRangeRings);
  }

  private applyBearingLine(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(BEARING_LINE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source || !this.map.getLayer(BEARING_LINE_LAYER_ID)) {
      return;
    }

    if (!this.lastBearingLine.visible || this.lastBearingLine.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(BEARING_LINE_LAYER_ID, 'visibility', 'none');
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastBearingLine.coords,
          },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(BEARING_LINE_LAYER_ID, 'visibility', 'visible');
  }

  private ensureAutopilotTargetLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(AUTOPILOT_TARGET_SOURCE_ID)) {
      this.map.addSource(AUTOPILOT_TARGET_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(AUTOPILOT_TARGET_LAYER_ID)) {
      this.map.addLayer({
        id: AUTOPILOT_TARGET_LAYER_ID,
        type: 'line',
        source: AUTOPILOT_TARGET_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#00e676', // gb-data-good green — autopilot is steering here
          'line-width': 3,
          'line-opacity': 0.9,
          'line-dasharray': [2, 1.5],
        },
      });
    }
  }

  private ensureBenchRouteLayers(): void {
    if (!this.map) return;

    if (!this.map.getSource(BENCH_ROUTE_SOURCE_ID)) {
      this.map.addSource(BENCH_ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }
    if (!this.map.getLayer(BENCH_ROUTE_LAYER_ID)) {
      this.map.addLayer({
        id: BENCH_ROUTE_LAYER_ID,
        type: 'line',
        source: BENCH_ROUTE_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'active'], false],
            '#00e676',
            'rgba(255,255,255,0.35)',
          ],
          'line-width': ['case', ['boolean', ['get', 'active'], false], 3, 1.5],
          'line-dasharray': [3, 2],
          'line-opacity': 0.9,
        },
      });
    }

    if (!this.map.getSource(BENCH_WAYPOINTS_SOURCE_ID)) {
      this.map.addSource(BENCH_WAYPOINTS_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_POINTS,
      });
    }
    if (!this.map.getLayer(BENCH_WAYPOINTS_LAYER_ID)) {
      this.map.addLayer({
        id: BENCH_WAYPOINTS_LAYER_ID,
        type: 'circle',
        source: BENCH_WAYPOINTS_SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'active'], false], 7, 5],
          'circle-color': [
            'case',
            ['boolean', ['get', 'completed'], false],
            'rgba(255,255,255,0.25)',
            ['boolean', ['get', 'active'], false],
            '#00e676',
            '#ffffff',
          ],
          'circle-stroke-color': '#00e676',
          'circle-stroke-width': 2,
        },
      });
    }
    if (!this.map.getLayer(BENCH_WP_LABEL_LAYER_ID)) {
      this.map.addLayer({
        id: BENCH_WP_LABEL_LAYER_ID,
        type: 'symbol',
        source: BENCH_WAYPOINTS_SOURCE_ID,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.4],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1,
        },
      });
    }
  }

  private applyBenchRoute(): void {
    if (!this.map) return;
    const lineSrc = this.map.getSource(BENCH_ROUTE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    lineSrc?.setData(this.lastBenchRoute.line);
    const ptsSrc = this.map.getSource(BENCH_WAYPOINTS_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    ptsSrc?.setData(this.lastBenchRoute.points);
  }

  private applyAutopilotTarget(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(AUTOPILOT_TARGET_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source || !this.map.getLayer(AUTOPILOT_TARGET_LAYER_ID)) {
      return;
    }

    if (!this.lastAutopilotTarget.visible || this.lastAutopilotTarget.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(AUTOPILOT_TARGET_LAYER_ID, 'visibility', 'none');
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastAutopilotTarget.coords,
          },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(AUTOPILOT_TARGET_LAYER_ID, 'visibility', 'visible');
  }

  private applyWindTrackZoomRanges(): void {
    if (!this.map) {
      return;
    }
    const minZoom = this.windTrackMinZoom;
    for (const layerId of [
      TRACK_LAYER_ID,
      VECTOR_LAYER_ID,
      HEADING_LINE_LAYER_ID,
      LAYLINES_LAYER_ID,
      TRUE_WIND_LAYER_ID,
      TRUE_WIND_ARROW_LAYER_ID,
    ]) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayerZoomRange(layerId, minZoom, 24);
      }
    }
  }

  private applyRangeRingZoomRange(): void {
    if (!this.map) {
      return;
    }
    if (this.map.getLayer(RANGE_RINGS_LAYER_ID)) {
      this.map.setLayerZoomRange(RANGE_RINGS_LAYER_ID, this.rangeRingsMinZoom, 24);
    }
  }

  private createCircle(center: [number, number], radiusNm: number, points = 64): any {
    const coords: Position[] = [];
    const radiusMeters = radiusNm * METERS_PER_NM;

    // Project points for the circle using geodesic projection
    for (let i = 0; i < points; i++) {
      const bearing = (i / points) * 360;
      const point = projectDestination({ lat: center[1], lon: center[0] }, bearing, radiusMeters);
      coords.push([point.lon, point.lat]);
    }
    if (coords.length > 0 && coords[0]) {
      coords.push(coords[0]); // Close the polygon
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
      properties: {},
    };
  }

  private isSameCenter(left: [number, number], right: [number, number]): boolean {
    return Math.abs(left[0] - right[0]) < 1e-5 && Math.abs(left[1] - right[1]) < 1e-5;
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }

  private isEncBaseStyleActive(): boolean {
    return this.baseSource?.id === 'enc' || this.baseSource?.id === 'enc-vector';
  }

  private getEffectiveOwnVesselScale(scale: number): number {
    const adjusted = this.isEncBaseStyleActive() ? scale * 0.55 : scale;
    return this.clamp(adjusted, 0.3, 2.5);
  }

  private getEffectiveAisTargetScale(scale: number): number {
    const adjusted = this.isEncBaseStyleActive() ? scale * 0.42 : scale;
    return this.clamp(adjusted, 0.2, 2.0);
  }

  private adjustHexColor(hex: string, factor: number): string {
    const rgb = this.parseHexColor(hex);
    if (!rgb) {
      return hex;
    }

    const apply = (channel: number): number => {
      if (factor >= 0) {
        return Math.round(channel + (255 - channel) * factor);
      }
      return Math.round(channel * (1 + factor));
    };

    return this.toHexColor({
      r: apply(rgb.r),
      g: apply(rgb.g),
      b: apply(rgb.b),
    });
  }

  private parseHexColor(hex: string): { r: number; g: number; b: number } | null {
    const value = hex.trim().replace('#', '');
    if (/^[0-9a-fA-F]{3}$/.test(value)) {
      const rDigit = value.slice(0, 1);
      const gDigit = value.slice(1, 2);
      const bDigit = value.slice(2, 3);
      const r = Number.parseInt(rDigit + rDigit, 16);
      const g = Number.parseInt(gDigit + gDigit, 16);
      const b = Number.parseInt(bDigit + bDigit, 16);
      return { r, g, b };
    }

    if (/^[0-9a-fA-F]{6}$/.test(value)) {
      const r = Number.parseInt(value.slice(0, 2), 16);
      const g = Number.parseInt(value.slice(2, 4), 16);
      const b = Number.parseInt(value.slice(4, 6), 16);
      return { r, g, b };
    }

    return null;
  }

  private toHexColor(rgb: { r: number; g: number; b: number }): string {
    const clamp = (value: number): number => Math.max(0, Math.min(255, value));
    return `#${[rgb.r, rgb.g, rgb.b]
      .map((channel) => clamp(channel).toString(16).padStart(2, '0'))
      .join('')}`;
  }

  private ensureTrueWindIcons(): void {
    this.upsertIcon(TRUE_WIND_ARROW_LIGHT_ID, this.createWindArrowIcon('#22c55e'), 2);
    this.upsertIcon(TRUE_WIND_ARROW_MODERATE_ID, this.createWindArrowIcon('#f59e0b'), 2);
    this.upsertIcon(TRUE_WIND_ARROW_STRONG_ID, this.createWindArrowIcon('#ef4444'), 2);
    this.upsertIcon(APPARENT_WIND_ARROW_ID, this.createWindArrowIcon(APPARENT_WIND_COLOR), 2);
    for (const speed of WIND_BARB_SPEEDS) {
      this.upsertIcon(windBarbIconId(speed), this.createWindBarbIcon(speed), 3);
    }
    this.upsertIcon(WAVE_ICON_LOW_ID, this.createWaveIcon(1), 2);
    this.upsertIcon(WAVE_ICON_MODERATE_ID, this.createWaveIcon(2), 2);
    this.upsertIcon(WAVE_ICON_HIGH_ID, this.createWaveIcon(3), 2);
  }

  private createWindArrowIcon(color: string): ImageData {
    const cacheKey = `wind-arrow:${color}`;
    const cached = MapLibreEngineService.iconCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new ImageData(size, size);
    }
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#052e2b';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(size / 2, 5);
    ctx.lineTo(size - 8, size - 10);
    ctx.lineTo(size / 2, size - 23);
    ctx.lineTo(8, size - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const imageData = ctx.getImageData(0, 0, size, size);
    MapLibreEngineService.iconCache.set(cacheKey, imageData);
    return imageData;
  }

  private createWindBarbIcon(speedKnots: number): ImageData {
    const roundedSpeed = Math.max(0, Math.min(100, Math.round(speedKnots / 5) * 5));
    const cacheKey = `weather-wind-barb:${roundedSpeed}`;
    const cached = MapLibreEngineService.iconCache.get(cacheKey);
    if (cached) return cached;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new ImageData(size, size);

    ctx.clearRect(0, 0, size, size);
    // Draw in the original 96-unit coordinate system on a 128 px backing
    // canvas. Registered at pixelRatio 3, this keeps barbs crisp without
    // increasing their footprint or collision cost.
    ctx.scale(4 / 3, 4 / 3);
    // Canvas/MapLibre images cannot consume CSS tokens. These mirror
    // --gb-bg-canvas (outline) and --gb-text-value (meteorological symbol).
    const outline = '#07131f';
    const foreground = '#eaf7ff';
    const originX = 42;
    const originY = 78;
    const tipY = 10;

    const draw = (color: string, width: number): void => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (roundedSpeed < 3) {
        ctx.beginPath();
        ctx.arc(originX, originY, 9, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, tipY);
      ctx.stroke();

      let remaining = roundedSpeed;
      let y = tipY + 3;
      while (remaining >= 50) {
        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(originX + 27, y + 11);
        ctx.lineTo(originX, y + 15);
        ctx.closePath();
        ctx.fill();
        remaining -= 50;
        y += 17;
      }
      while (remaining >= 10) {
        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(originX + 27, y + 11);
        ctx.stroke();
        remaining -= 10;
        y += 10;
      }
      if (remaining >= 5) {
        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(originX + 15, y + 6);
        ctx.stroke();
      }
    };

    draw(outline, 8);
    draw(foreground, 4);
    const imageData = ctx.getImageData(0, 0, size, size);
    MapLibreEngineService.iconCache.set(cacheKey, imageData);
    return imageData;
  }

  private createWaveIcon(crests: 1 | 2 | 3): ImageData {
    const cacheKey = `material-wave-icon:v1:${crests}`;
    const cached = MapLibreEngineService.iconCache.get(cacheKey);
    if (cached) return cached;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new ImageData(size, size);

    ctx.clearRect(0, 0, size, size);
    // Canvas/MapLibre images cannot consume CSS tokens. Palette mirrors
    // --gb-bg-canvas, --gb-tick-reference, --gb-data-warn and
    // --gb-needle-primary for low/moderate/high sea states.
    const foreground = crests === 1 ? '#38bdf8' : crests === 2 ? '#facc15' : '#f97316';
    const outline = '#07111f';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Google Material Symbols rounded "tsunami" path, Apache-2.0. The source
    // SVG and notice live in public/assets/icons.
    const wavePath = new Path2D('M481-157q-30 20-64.5 28.5T347-120q-35 0-69-9.5T213-157q-22 13-45.5 21.5T119-123q-16 2-27.5-9T80-160q0-17 11-29t28-16q19-5 35.5-13t32.5-19q11-8 25.5-8t25.5 8q24 17 52 26.5t57 9.5q29 0 57.5-9t52.5-26q11-8 25-7.5t25 8.5q24 17 51.5 25.5T615-201q30 0 58-10.5t53-27.5q11-7 23-7.5t23 7.5q16 11 32 20t35 14q17 5 29 16.5t12 28.5q0 17-12 28.5t-29 8.5q-24-4-46.5-13T749-157q-30 18-64.5 27.5T615-120q-35 0-69.5-9.5T481-157ZM80-300v-80q0-97 37.5-181T220-707q65-62 152.5-97.5T560-840q17 0 35.5.5T631-836q20 3 29.5 21t.5 36q-10 21-15.5 42t-5.5 44q0 55 39 94t94 39h67q17 0 28.5 11.5T880-520q0 17-11.5 28.5T840-480h-67q-89 0-151-62t-62-151q0-14 2-29.5t6-30.5q-74 18-121 76.5T400-540q0 36 11.5 68.5T444-410l13-9q11-8 23-8t23 8q23 16 53.5 27t58.5 11q28 0 58.5-11t53.5-27q11-7 22.5-7.5T772-420l22 15q11 6 22.5 11.5T840-385q17 5 28.5 16.5T880-340q0 17-12 28.5t-29 8.5q-23-4-45.5-12.5T749-337q-32 20-65 28.5t-69 8.5q-36 0-72-10t-62-27q-31 19-65 27.5t-69 9.5q-35 1-69-9t-65-28q-31 18-64.5 27.5T80-300Zm265-81h10q5 0 10-1-22-35-33.5-75T320-540q0-81 37-146.5T460-794v44q-62 16-114.5 48.5t-92 78.5Q214-577 190-520.5T161-400q8-5 15-9t14-9q11-8 23-8.5t23 7.5q9 6 18 11t19 10q17 8 35 12.5t37 4.5Zm-34-207Z');
    ctx.save();
    ctx.translate(0, size);
    ctx.scale(size / 960, size / 960);
    ctx.strokeStyle = outline;
    ctx.fillStyle = foreground;
    ctx.lineWidth = 46;
    ctx.stroke(wavePath);
    ctx.fill(wavePath);
    ctx.restore();
    const imageData = ctx.getImageData(0, 0, size, size);
    MapLibreEngineService.iconCache.set(cacheKey, imageData);
    return imageData;
  }

  private windColor(speedMps: number): string {
    if (speedMps >= 10.8) return '#ef4444';
    if (speedMps >= 5.5) return '#f59e0b';
    return '#22c55e';
  }

  private windArrowIcon(speedMps: number): string {
    if (speedMps >= 10.8) return TRUE_WIND_ARROW_STRONG_ID;
    if (speedMps >= 5.5) return TRUE_WIND_ARROW_MODERATE_ID;
    return TRUE_WIND_ARROW_LIGHT_ID;
  }

  private updateTrueWindLabel(
    wind: WindMapUpdate,
    endpoint: [number, number],
    color: string,
  ): void {
    if (!this.map) return;
    if (!Number.isFinite(endpoint[0]) || !Number.isFinite(endpoint[1])) {
      this.trueWindLabelMarker?.remove();
      this.trueWindLabelMarker = null;
      return;
    }

    const speedKnots = wind.speedMps * 1.943844;
    const gustKnots = wind.gustMps === null ? null : wind.gustMps * 1.943844;
    const dirLabel = wind.directionDeg.toFixed(0).padStart(3, '0');
    const textParts: string[] = [];
    if (wind.source === 'apparent') {
      textParts.push(`AWA ${speedKnots.toFixed(1)} kn`);
    } else {
      textParts.push(`${dirLabel}° · ${speedKnots.toFixed(1)} kn`);
    }
    if (gustKnots !== null && gustKnots > speedKnots + 0.2) {
      textParts.push(`G ${gustKnots.toFixed(1)}`);
    }
    const text = textParts.join(' · ');

    if (!this.trueWindLabelMarker) {
      const element = document.createElement('div');
      element.style.padding = '4px 10px';
      element.style.borderRadius = '6px';
      element.style.background = 'rgba(2, 15, 23, 0.92)';
      element.style.border = '1.5px solid rgba(255, 255, 255, 0.4)';
      element.style.color = '#f8fafc';
      element.style.font = '600 12px/1.3 system-ui, sans-serif';
      element.style.whiteSpace = 'nowrap';
      element.style.pointerEvents = 'none';
      element.style.letterSpacing = '0.02em';
      element.style.backdropFilter = 'blur(8px)';
      element.style.boxShadow = '0 2px 12px rgba(0,0,0,0.5)';
      this.trueWindLabelMarker = new maplibregl.Marker({
        element,
        anchor: 'bottom',
        offset: [0, -24],
      })
        .setLngLat(endpoint)
        .addTo(this.map);
    }

    const element = this.trueWindLabelMarker.getElement();
    // Batch DOM writes: check before modifying to avoid unnecessary invalidation.
    if (element.textContent !== text) {
      element.textContent = text;
    }
    if (element.style.borderColor !== color) {
      element.style.borderColor = color;
    }
    this.trueWindLabelMarker.setLngLat(endpoint);
  }

  // ── COG / Heading labels ────────────────────────────────────────────────

  private updateCogLabel(
    endpoint: [number, number],
    label: { cogDeg: number; sogKnots: number },
  ): void {
    if (!this.map) return;
    if (!Number.isFinite(endpoint[0]) || !Number.isFinite(endpoint[1])) {
      this.cogLabelMarker?.remove();
      this.cogLabelMarker = null;
      return;
    }

    const dirLabel = label.cogDeg.toFixed(0).padStart(3, '0');
    const text = `COG ${dirLabel}° · ${label.sogKnots.toFixed(1)} kn`;

    if (!this.cogLabelMarker) {
      const el = this.labelElement('#f59e0b');
      this.cogLabelMarker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, -24],
      })
        .setLngLat(endpoint)
        .addTo(this.map);
    }

    const el = this.cogLabelMarker.getElement();
    if (el.textContent !== text) {
      el.textContent = text;
    }
    this.cogLabelMarker.setLngLat(endpoint);
  }

  private updateHeadingLabel(endpoint: [number, number], headingDeg: number): void {
    if (!this.map) return;
    if (!Number.isFinite(endpoint[0]) || !Number.isFinite(endpoint[1])) {
      this.headingLabelMarker?.remove();
      this.headingLabelMarker = null;
      return;
    }

    const text = `HDG ${headingDeg.toFixed(0).padStart(3, '0')}°`;

    if (!this.headingLabelMarker) {
      const el = this.labelElement('#0ea5e9');
      this.headingLabelMarker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, -24],
      })
        .setLngLat(endpoint)
        .addTo(this.map);
    }

    const el = this.headingLabelMarker.getElement();
    if (el.textContent !== text) {
      el.textContent = text;
    }
    this.headingLabelMarker.setLngLat(endpoint);
  }

  private updateApparentWindLabel(
    wind: WindMapUpdate,
    endpoint: [number, number],
    color: string,
  ): void {
    if (!this.map) return;
    if (!Number.isFinite(endpoint[0]) || !Number.isFinite(endpoint[1])) {
      this.apparentWindLabelMarker?.remove();
      this.apparentWindLabelMarker = null;
      return;
    }

    const speedKnots = wind.speedMps * 1.943844;
    const gustKnots = wind.gustMps === null ? null : wind.gustMps * 1.943844;
    const parts: string[] = [
      `AWA ${wind.directionDeg.toFixed(0).padStart(3, '0')}° · ${speedKnots.toFixed(1)} kn`,
    ];
    if (gustKnots !== null && gustKnots > speedKnots + 0.2) {
      parts.push(`G ${gustKnots.toFixed(1)}`);
    }
    const text = parts.join(' · ');

    if (!this.apparentWindLabelMarker) {
      const el = this.labelElement(color);
      this.apparentWindLabelMarker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, -24],
      })
        .setLngLat(endpoint)
        .addTo(this.map);
    }

    const el = this.apparentWindLabelMarker.getElement();
    if (el.textContent !== text) {
      el.textContent = text;
    }
    if (el.style.borderColor !== color) {
      el.style.borderColor = color;
    }
    this.apparentWindLabelMarker.setLngLat(endpoint);
  }

  // ── COG Time Ticks ──────────────────────────────────────────────────────

  private updateCogTimeTicks(ticks: { label: string; coords: [number, number] }[]): void {
    this.clearCogTimeTicks();
    if (!this.map || ticks.length === 0) return;

    // Batch all marker creation into a single DocumentFragment to minimize reflows,
    // then add to map in one go. This prevents [Violation] Forced reflow.
    const fragment = document.createDocumentFragment();
    const markerConfigs: { element: HTMLElement; coords: [number, number] }[] = [];

    for (const tick of ticks) {
      if (!Number.isFinite(tick.coords[0]) || !Number.isFinite(tick.coords[1])) continue;
      const el = document.createElement('div');
      el.style.padding = '1px 5px';
      el.style.borderRadius = '3px';
      el.style.background = 'rgba(2, 15, 23, 0.85)';
      el.style.border = '1px solid rgba(245, 158, 11, 0.5)';
      el.style.color = '#f59e0b';
      el.style.font = '600 9px/1.3 system-ui, sans-serif';
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'none';
      el.textContent = tick.label;
      fragment.appendChild(el);
      markerConfigs.push({ element: el, coords: tick.coords });
    }

    // Append fragment to a hidden container to force single layout calculation,
    // then move elements to markers.
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.appendChild(fragment);
    document.body.appendChild(tempContainer);

    // Force layout once for all elements
    void tempContainer.offsetHeight;

    // Now create markers with laid-out elements
    for (const config of markerConfigs) {
      const marker = new maplibregl.Marker({ element: config.element, anchor: 'center' })
        .setLngLat(config.coords)
        .addTo(this.map!);
      this.cogTimeTickMarkers.push(marker);
    }

    document.body.removeChild(tempContainer);
  }

  private clearCogTimeTicks(): void {
    for (const m of this.cogTimeTickMarkers) m.remove();
    this.cogTimeTickMarkers = [];
  }

  private clearHeadingTimeTicks(): void {
    // future: heading time tick markers
  }

  /** Shared DOM element factory for enterprise vector labels */
  private labelElement(borderColor: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.padding = '4px 10px';
    el.style.borderRadius = '6px';
    el.style.background = 'rgba(2, 15, 23, 0.92)';
    el.style.border = '1.5px solid rgba(255, 255, 255, 0.4)';
    el.style.color = '#f8fafc';
    el.style.font = '600 12px/1.3 system-ui, sans-serif';
    el.style.whiteSpace = 'nowrap';
    el.style.pointerEvents = 'none';
    el.style.letterSpacing = '0.02em';
    el.style.backdropFilter = 'blur(8px)';
    el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.5)';
    el.style.borderColor = borderColor;
    return el;
  }

  private createVesselIcon(color1: string, color2: string, withSails = true): ImageData {
    const cacheKey = `vessel:${color1}:${color2}:${withSails}`;
    const cached = MapLibreEngineService.iconCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new ImageData(size, size);
    }

    ctx.clearRect(0, 0, size, size);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;

    const cx = size / 2;
    const cy = size / 2;

    // Hull
    const bowY = cy - 36;
    const sternY = cy + 34;
    const beamHalf = 18;
    const hullGradient = ctx.createLinearGradient(0, bowY, 0, sternY);
    hullGradient.addColorStop(0, color2);
    hullGradient.addColorStop(1, color1);
    ctx.fillStyle = hullGradient;
    ctx.strokeStyle = this.adjustHexColor(color1, -0.15);
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(cx, bowY);
    ctx.bezierCurveTo(cx + 24, bowY + 18, cx + beamHalf, sternY - 8, cx + beamHalf, sternY);
    ctx.lineTo(cx - beamHalf, sternY);
    ctx.bezierCurveTo(cx - beamHalf, sternY - 8, cx - 24, bowY + 18, cx, bowY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    if (withSails) {
      const sailFill = this.adjustHexColor(color2, 0.52);
      const sailStroke = this.adjustHexColor(color1, 0.12);

      // Mast
      ctx.strokeStyle = this.adjustHexColor(color1, -0.3);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 20);
      ctx.lineTo(cx, cy - 26);
      ctx.stroke();

      // Main sail
      ctx.fillStyle = sailFill;
      ctx.strokeStyle = sailStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 24);
      ctx.lineTo(cx + 18, cy + 12);
      ctx.lineTo(cx, cy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Jib sail
      ctx.beginPath();
      ctx.moveTo(cx, cy - 22);
      ctx.lineTo(cx - 15, cy + 2);
      ctx.lineTo(cx, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit dot
      ctx.fillStyle = this.adjustHexColor(color2, 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy + 12, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    MapLibreEngineService.iconCache.set(cacheKey, imageData);
    return imageData;
  }
}
