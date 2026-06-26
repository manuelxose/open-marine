import maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString, Point, Polygon, Position } from 'geojson';
import type { WaypointFeatureCollection } from '../types/chart-geojson';
import type { MapOrientation } from '../types/chart-vm';
import { METERS_PER_NM, projectDestination } from '../../../state/calculations/navigation';
import {
  DEFAULT_VESSEL_TYPE_COLORS,
  VESSEL_TYPE_KEYS,
  getAisVesselIconId,
  type VesselTypeColors,
  type VesselTypeFilter,
} from './chart-vessel-types';

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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

const EMPTY_POINTS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
};

const EMPTY_LINE: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [],
};

export class MapLibreEngineService {
  private map: maplibregl.Map | null = null;
  private mapReady = false;
  private baseSource: ChartSourceConfig | null = null;
  private clickHandler: ((lngLat: [number, number]) => void) | null = null;
  private featureClickHandler: ((event: { featureId?: string; properties?: any; layerId: string }) => void) | null = null;
  private pendingCenter: [number, number] | null = null;
  private appliedCenter: [number, number] | null = null;
  private appliedBearing: number | null = null;
  private orientation: MapOrientation = 'north-up';
  private resizeObserver: ResizeObserver | null = null;

  private readonly handleMapClick = (event: maplibregl.MapMouseEvent): void => {
    if (!this.clickHandler) {
      return;
    }
    // Check if we clicked an interactive feature first (waypoints / AIS).
    if (this.map && this.featureClickHandler) {
      const features = this.map.queryRenderedFeatures(event.point, {
        layers: [WAYPOINT_LAYER_ID, AIS_LAYER_ID],
      });
      if (features.length > 0) {
        const feature = features[0];
        if (feature?.layer?.id) {
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

  private lastVessel: { lngLat: [number, number] | null; rotationDeg: number | null; state: 'fix' | 'stale' | 'no-fix' } = {
    lngLat: null,
    rotationDeg: null,
    state: 'no-fix',
  };
  private lastTrack: [number, number][] = [];
  private lastVector: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastHeadingLine: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastLaylines: { lines: [number, number][][]; visible: boolean } = {
    lines: [],
    visible: false,
  };
  private lastWaypoints: WaypointFeatureCollection = EMPTY_POINTS as unknown as WaypointFeatureCollection;
  private lastRoute: FeatureCollection<LineString> = EMPTY_LINE;
  private lastTrueWind: WindMapUpdate = {
    coords: [],
    visible: false,
    directionDeg: 0,
    speedMps: 0,
    gustMps: null,
    source: 'true',
  };
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
  private lastBenchRoute: { line: FeatureCollection<LineString>; points: FeatureCollection<Point> } = {
    line: EMPTY_LINE,
    points: EMPTY_POINTS,
  };
  private lastAisTargets: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };
  private lastAisTracks: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
  private lastAisPredictions: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
  private lastCpaLines: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
  private aisVesselTypeColors: VesselTypeColors = { ...DEFAULT_VESSEL_TYPE_COLORS };
  private ownVesselIconScale = 1.15;
  private aisTargetIconScale = 0.8;
  private windTrackMinZoom = 15;
  private rangeRingsMinZoom = 8;
  private showOpenSeaMap = false;
  private aisTargetsVisible = true;
  private aisLabelsVisible = true;
  private cpaLinesVisible = true;

  init(containerEl: HTMLElement, initialView: MapLibreInitView): void {
    if (this.map) {
      return;
    }

    if (containerEl.clientWidth === 0 || containerEl.clientHeight === 0) {
      requestAnimationFrame(() => this.init(containerEl, initialView));
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
    });

    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    this.map.getContainer()
      .querySelector('.maplibregl-ctrl-attrib')
      ?.classList.remove('maplibregl-compact-show');

    this.map.on('load', () => {
      this.onStyleReady();
      // Ensure map fills container after CSS transitions complete
      setTimeout(() => this.map?.resize(), 400);
    });
    this.map.on('style.load', () => this.onStyleReady());
    this.map.on('click', this.handleMapClick);

    // Watch for container size changes (grid transitions, sidenav toggle)
    this.resizeObserver = new ResizeObserver(() => {
      this.map?.resize();
    });
    this.resizeObserver.observe(containerEl);
  }

  setBaseSource(chartSourceConfig: ChartSourceConfig): void {
    this.baseSource = chartSourceConfig;
    if (!this.map) {
      return;
    }
    this.mapReady = false;
    this.map.setStyle(chartSourceConfig.style);
  }

  flyTo(center: [number, number], zoom?: number): void {
    if (!this.map) return;
    this.map.flyTo({ center, zoom: zoom ?? this.map.getZoom(), duration: 1200 });
  }

  updateVesselPosition(lngLat: [number, number] | null, rotationDeg: number | null, state: 'fix' | 'stale' | 'no-fix' = 'fix'): void {
    this.lastVessel = { lngLat, rotationDeg, state };
    if (!this.mapReady) {
      return;
    }
    this.applyVessel();
    this.updateCamera();
  }

  updateTrack(lineStringCoords: [number, number][]): void {
    this.lastTrack = lineStringCoords;
    if (!this.mapReady) {
      return;
    }
    this.applyTrack();
  }

  updateVector(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastVector = { coords: lineStringCoords, visible };
    if (!this.mapReady) {
      return;
    }
    this.applyVector();
  }

  updateHeadingLine(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastHeadingLine = { coords: lineStringCoords, visible };
    if (!this.mapReady) {
      return;
    }
    this.applyHeadingLine();
  }

  updateLaylines(lines: [number, number][][], visible: boolean): void {
    this.lastLaylines = { lines, visible };
    if (!this.mapReady) {
      return;
    }
    this.applyLaylines();
  }

  updateWaypoints(geojson: WaypointFeatureCollection): void {
    this.lastWaypoints = geojson;
    if (!this.mapReady) {
      return;
    }
    this.applyWaypoints();
  }

  updateRoute(geojson: FeatureCollection<LineString>): void {
    this.lastRoute = geojson;
    if (!this.mapReady) {
      return;
    }
    this.applyRoute();
  }

  updateTrueWind(update: WindMapUpdate): void {
    this.lastTrueWind = update;
    if (!this.mapReady) {
      return;
    }
    this.applyTrueWind();
  }

  /** Bench route: waypoint markers + connecting line with active-leg highlighting. */
  updateBenchRoute(line: FeatureCollection<LineString>, points: FeatureCollection<Point>): void {
    this.lastBenchRoute = { line, points };
    if (this.mapReady) {
      this.applyBenchRoute();
    }
  }

  /** Autopilot target heading vector, drawn from the vessel along target_heading. */
  updateAutopilotTarget(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastAutopilotTarget = { coords: lineStringCoords, visible };
    if (this.mapReady) {
      this.applyAutopilotTarget();
    }
  }

  updateBearingLine(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastBearingLine = { coords: lineStringCoords, visible };
    if (this.mapReady) {
      this.applyBearingLine();
    }
  }

  updateRangeRings(center: [number, number], intervalsNm: number[]): void {
    const features = intervalsNm.map((nm) => this.createCircle(center, nm));
    this.lastRangeRings = {
      type: 'FeatureCollection',
      features,
    };
    if (this.mapReady) {
      this.applyRangeRings();
    }
  }

  clearRangeRings(): void {
    this.lastRangeRings = {
      type: 'FeatureCollection',
      features: [],
    };
    if (this.mapReady) {
      this.applyRangeRings();
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
    this.updateCamera();
  }

  setClickHandler(handler: ((lngLat: [number, number]) => void) | null): void {
    this.clickHandler = handler;
  }

  setFeatureClickHandler(handler: ((event: { featureId?: string; properties?: any; layerId: string }) => void) | null): void {
    this.featureClickHandler = handler;
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
    const circleSource = this.map.getSource(ANCHOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    circleSource?.setData(circleGeoJson);

    const centerSource = this.map.getSource(ANCHOR_CENTER_LAYER_ID + '-src') as maplibregl.GeoJSONSource | undefined;
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

    const circleSource = this.map.getSource(ANCHOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (circleSource) {
      circleSource.setData({ type: 'FeatureCollection', features: [] });
    }

    const centerSource = this.map.getSource(ANCHOR_CENTER_LAYER_ID + '-src') as maplibregl.GeoJSONSource | undefined;
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
      const point = projectDestination(
        { lat: center[1], lon: center[0] },
        bearing,
        radiusMeters,
      );
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
    this.trueWindLabelMarker?.remove();
    this.trueWindLabelMarker = null;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.off('click', this.handleMapClick);
      this.map.remove();
    }
    this.map = null;
    this.mapReady = false;
    this.clickHandler = null;
    this.pendingCenter = null;
    this.appliedCenter = null;
  }

  /** Force the map to recalculate its container dimensions. */
  resize(): void {
    this.map?.resize();
  }

  setOrientation(orientation: MapOrientation): void {
    this.orientation = orientation;
    if (!this.map) return;
    this.updateCamera();
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  updateAisTargets(geojson: FeatureCollection<Point>): void {
    this.lastAisTargets = geojson;
    if (this.mapReady) {
      this.applyAisTargets();
    }
  }

  updateAisTracks(geojson: FeatureCollection<LineString>): void {
    this.lastAisTracks = geojson;
    if (this.mapReady) {
      this.applyAisTracks();
    }
  }

  updateAisPredictions(geojson: FeatureCollection<LineString>): void {
    this.lastAisPredictions = geojson;
    if (this.mapReady) {
      this.applyAisPredictions();
    }
  }

  updateCpaLines(geojson: FeatureCollection<LineString>): void {
    this.lastCpaLines = geojson;
    if (this.mapReady) {
      this.applyCpaLines();
    }
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
          'line-color': [
            'case',
            ['boolean', ['get', 'isDangerous'], false],
            '#ef4444',
            '#9ca3af',
          ],
          'line-width': 1.5,
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'age'],
            0, 0.75,
            1, 0.05,
          ],
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
          'line-color': [
            'case',
            ['boolean', ['get', 'isDangerous'], false],
            '#ef4444',
            '#f59e0b',
          ],
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
                'line-opacity': 0.8
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
    const source = this.map.getSource(AIS_PREDICT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastAisPredictions);
  }

  private applyCpaLines(): void {
    if (!this.map) return;
    const source = this.map.getSource(CPA_LINE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastCpaLines);
  }

  private ensureAisIcons(): void {
    if (!this.map) return;

    for (const type of VESSEL_TYPE_KEYS) {
      const color = this.aisVesselTypeColors[type] ?? DEFAULT_VESSEL_TYPE_COLORS[type];
      const normalId = getAisVesselIconId(type);
      const dangerousId = getAisVesselIconId(type, true);

      this.upsertAisIcon(normalId, this.createAisIcon(color, this.adjustHexColor(color, -0.35), type));
      this.upsertAisIcon(dangerousId, this.createDangerousAisIcon(color, type));
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
    return this.createAisIcon(
      this.adjustHexColor(baseColor, 0.12),
      '#dc2626',
      type,
    );
  }

  private createAisIcon(fillColor: string, strokeColor: string, type: VesselTypeFilter): ImageData {
    return this.createVesselIcon(strokeColor, fillColor, type === 'sailing');
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
      const current = this.map.getBearing();
      if (Math.abs(current) > 0.01) {
        options.bearing = 0;
      }
    } else {
      // Course-up: only re-orient when heading changes meaningfully, otherwise
      // sub-degree IMU jitter restarts a 250ms camera animation on every sample.
      const heading = this.lastVessel.rotationDeg;
      if (typeof heading === 'number') {
        const reference = this.appliedBearing ?? this.map.getBearing();
        if (this.bearingDelta(reference, heading) > 0.5) {
          options.bearing = heading;
          this.appliedBearing = heading;
        }
      }
    }

    if (Object.keys(options).length > 0) {
        // Use easeTo for smooth tracking for both center and bearing
        this.map.easeTo({
            ...options,
            duration: 250, // slightly longer for smoothness
            easing: (t) => t // linear easing often better for tracking? or default cubic-bezier
        });
    }
  }

  /** Smallest absolute angular difference between two bearings, in degrees [0, 180]. */
  private bearingDelta(a: number, b: number): number {
    return Math.abs(((a - b + 540) % 360) - 180);
  }

  private onStyleReady(): void {
    this.applyOpenSeaMapOverlay();
    this.ensureTrueWindIcons();
    this.ensureVesselLayer();
    this.ensureTrackLayer();
    this.ensureVectorLayer();
    this.ensureHeadingLineLayer();
    this.ensureLaylinesLayer();
    this.ensureTrueWindLayer();
    this.ensureWaypointsLayer();
    this.ensureRouteLayer();
    this.ensureRangeRingsLayer();
    this.ensureBearingLineLayer();
    this.ensureAutopilotTargetLayer();
    this.ensureBenchRouteLayers();
    this.ensureAisTracksLayer();
    this.ensureAisPredictionsLayer();
    this.ensureAisLayer();
    this.ensureCpaLinesLayer();
    // Keep the own-vessel marker above AIS targets and chart overlays.
    for (const layerId of [VESSEL_HALO_LAYER_ID, VESSEL_LAYER_ID]) {
      if (this.map?.getLayer(layerId)) {
        this.map.moveLayer(layerId);
      }
    }

    this.applyVessel();
    this.applyTrack();
    this.applyVector();
    this.applyHeadingLine();
    this.applyLaylines();
    this.applyTrueWind();
    this.applyWaypoints();
    this.applyRoute();
    this.applyRangeRings();
    this.applyBearingLine();
    this.applyAutopilotTarget();
    this.applyBenchRoute();
    this.applyAisTracks();
    this.applyAisPredictions();
    this.applyAisTargets();
    this.applyCpaLines();
    this.updateCamera();

    this.mapReady = true;

    // Re-apply visibility state after style swap
    this.setOwnVesselIconScale(this.ownVesselIconScale);
    this.setAisTargetIconScale(this.aisTargetIconScale);
    this.applyWindTrackZoomRanges();
    this.applyRangeRingZoomRange();
    this.setAisTargetsVisible(this.aisTargetsVisible);
    this.setAisLabelsVisible(this.aisLabelsVisible);
    this.setCpaLinesVisible(this.cpaLinesVisible);
  }

  private applyOpenSeaMapOverlay(): void {
    if (!this.map) return;

    const nauticalBaseActive = this.baseSource?.id === 'nautical';
    const shouldShowOverlay = nauticalBaseActive || this.showOpenSeaMap;

    if (shouldShowOverlay) {
      if (!this.map.getSource(OPENSEAMAP_SOURCE_ID)) {
        this.map.addSource(OPENSEAMAP_SOURCE_ID, {
          type: 'raster',
          tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
          tileSize: 256,
          minzoom: 8,
          maxzoom: 18,
          attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
        });
      }
      if (!this.map.getLayer(OPENSEAMAP_LAYER_ID)) {
        // Insert as first overlay, before all GeoJSON layers
        this.map.addLayer({
          id: OPENSEAMAP_LAYER_ID,
          type: 'raster',
          source: OPENSEAMAP_SOURCE_ID,
          paint: {
            'raster-opacity': nauticalBaseActive ? 0.9 : 0.85,
            'raster-fade-duration': 200,
          },
          minzoom: 8,
        });
      } else {
        this.map.setPaintProperty(OPENSEAMAP_LAYER_ID, 'raster-opacity', nauticalBaseActive ? 0.9 : 0.85);
        this.map.setPaintProperty(OPENSEAMAP_LAYER_ID, 'raster-fade-duration', 200);
      }
      this.map.setLayerZoomRange(OPENSEAMAP_LAYER_ID, 8, 24);
    } else {
      if (this.map.getLayer(OPENSEAMAP_LAYER_ID)) {
        this.map.removeLayer(OPENSEAMAP_LAYER_ID);
      }
      if (this.map.getSource(OPENSEAMAP_SOURCE_ID)) {
        this.map.removeSource(OPENSEAMAP_SOURCE_ID);
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
          'text-font': ['Open Sans Regular'],
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
      pointFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: pointA }, properties: {} });
    }
    if (pointB) {
      pointFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: pointB }, properties: {} });
    }

    const pointsSource = this.map.getSource(MEASURE_POINTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
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

    const lineSource = this.map.getSource(MEASURE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
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
          'line-width': 2,
          'line-opacity': 0.85,
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
          'line-width': 2.25,
          'line-opacity': 0.9,
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
          'line-width': 3,
          'line-opacity': 0.85,
        },
      });
    }

    if (!this.map.getLayer(VESSEL_HALO_LAYER_ID)) {
      this.map.addLayer({
        id: VESSEL_HALO_LAYER_ID,
        type: 'circle',
        source: VESSEL_SOURCE_ID,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'state'],
            'no-fix',
            16,
            'stale',
            13,
            11,
          ],
          'circle-color': [
            'match',
            ['get', 'state'],
            'no-fix',
            '#ef4444',
            'stale',
            '#eab308',
            '#0ea5e9',
          ],
          'circle-opacity': 0.32,
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
          'icon-size': 0.72,
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
          'circle-color': [
            'case',
            ['boolean', ['get', 'active'], false],
            '#0b7dbd',
            '#ffffff',
          ],
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
    const arrowSource = this.map.getSource(TRUE_WIND_ARROW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !arrowSource || !this.map.getLayer(TRUE_WIND_LAYER_ID)) {
      return;
    }

    if (!this.lastTrueWind.visible || this.lastTrueWind.coords.length < 2) {
      source.setData(EMPTY_LINE);
      arrowSource.setData(EMPTY_POINTS);
      this.map.setLayoutProperty(TRUE_WIND_LAYER_ID, 'visibility', 'none');
      this.map.setLayoutProperty(TRUE_WIND_ARROW_LAYER_ID, 'visibility', 'none');
      this.trueWindLabelMarker?.remove();
      this.trueWindLabelMarker = null;
      return;
    }

    const color = this.windColor(this.lastTrueWind.speedMps);
    const icon = this.windArrowIcon(this.lastTrueWind.speedMps);
    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastTrueWind.coords,
          },
          properties: { color },
        },
      ],
    };

    source.setData(data);
    const endpoint = this.lastTrueWind.coords[this.lastTrueWind.coords.length - 1];
    if (!endpoint) {
      return;
    }
    arrowSource.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: endpoint },
        properties: {
          direction: this.lastTrueWind.directionDeg,
          icon,
        },
      }],
    });
    this.map.setLayoutProperty(TRUE_WIND_LAYER_ID, 'visibility', 'visible');
    this.map.setLayoutProperty(TRUE_WIND_ARROW_LAYER_ID, 'visibility', 'visible');
    this.updateTrueWindLabel(endpoint, color);
  }

  private applyVector(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(VECTOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !this.map.getLayer(VECTOR_LAYER_ID)) {
      return;
    }

    if (!this.lastVector.visible || this.lastVector.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(VECTOR_LAYER_ID, 'visibility', 'none');
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastVector.coords,
          },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(VECTOR_LAYER_ID, 'visibility', 'visible');
  }

  private applyHeadingLine(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(HEADING_LINE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !this.map.getLayer(HEADING_LINE_LAYER_ID)) {
      return;
    }

    if (!this.lastHeadingLine.visible || this.lastHeadingLine.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(HEADING_LINE_LAYER_ID, 'visibility', 'none');
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastHeadingLine.coords,
          },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(HEADING_LINE_LAYER_ID, 'visibility', 'visible');
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
    const source = this.map.getSource(RANGE_RINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastRangeRings);
  }

  private applyBearingLine(): void {
    if (!this.map) {
      return;
    }

    const source = this.map.getSource(BEARING_LINE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
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
          'line-width': [
            'case',
            ['boolean', ['get', 'active'], false],
            3,
            1.5,
          ],
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
          'circle-radius': [
            'case',
            ['boolean', ['get', 'active'], false],
            7,
            5,
          ],
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
    const lineSrc = this.map.getSource(BENCH_ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    lineSrc?.setData(this.lastBenchRoute.line);
    const ptsSrc = this.map.getSource(BENCH_WAYPOINTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
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
      const point = projectDestination(
        { lat: center[1], lon: center[0] }, 
        bearing, 
        radiusMeters
      );
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
    return Math.abs(left[0] - right[0]) < 1e-7 && Math.abs(left[1] - right[1]) < 1e-7;
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }

  private isEncBaseStyleActive(): boolean {
    return this.baseSource?.id === 'enc';
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
  }

  private createWindArrowIcon(color: string): ImageData {
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
    return ctx.getImageData(0, 0, size, size);
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

  private updateTrueWindLabel(endpoint: [number, number], color: string): void {
    if (!this.map) return;
    if (!Number.isFinite(endpoint[0]) || !Number.isFinite(endpoint[1])) {
      this.trueWindLabelMarker?.remove();
      this.trueWindLabelMarker = null;
      return;
    }

    const speedKnots = this.lastTrueWind.speedMps * 1.943844;
    const gustKnots = this.lastTrueWind.gustMps === null
      ? null
      : this.lastTrueWind.gustMps * 1.943844;
    const sourceLabel = this.lastTrueWind.source === 'apparent' ? 'AWA' : 'TWD';
    const text = gustKnots !== null && gustKnots > speedKnots + 0.2
      ? `${sourceLabel} ${speedKnots.toFixed(1)} kn · G ${gustKnots.toFixed(1)}`
      : `${sourceLabel} ${speedKnots.toFixed(1)} kn`;

    if (!this.trueWindLabelMarker) {
      const element = document.createElement('div');
      element.style.padding = '3px 7px';
      element.style.borderRadius = '5px';
      element.style.background = 'rgba(2, 15, 23, 0.88)';
      element.style.border = '1px solid rgba(255, 255, 255, 0.35)';
      element.style.color = '#f8fafc';
      element.style.font = '600 11px/1.2 system-ui, sans-serif';
      element.style.whiteSpace = 'nowrap';
      element.style.pointerEvents = 'none';
      this.trueWindLabelMarker = new maplibregl.Marker({
        element,
        anchor: 'bottom',
        offset: [0, -20],
      })
        .setLngLat(endpoint)
        .addTo(this.map);
    }

    const element = this.trueWindLabelMarker.getElement();
    element.textContent = text;
    element.style.borderColor = color;
    this.trueWindLabelMarker.setLngLat(endpoint);
  }

  private createVesselIcon(color1: string, color2: string, withSails = true): ImageData {
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

    return ctx.getImageData(0, 0, size, size);
  }
}
