import maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString, Point, Polygon, Position } from 'geojson';
import type { WaypointFeatureCollection } from '../types/chart-geojson';
import type { MapOrientation } from '../types/chart-vm';
import { METERS_PER_NM, projectDestination } from '../../../state/calculations/navigation';

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

const DEFAULT_STYLE: maplibregl.StyleSpecification = {
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

const VESSEL_ICON_ID = 'chart-vessel-icon';
const VESSEL_ICON_STALE_ID = 'chart-vessel-icon-stale';
const VESSEL_ICON_NO_FIX_ID = 'chart-vessel-icon-no-fix';

const VESSEL_SOURCE_ID = 'chart-vessel-source';
const VESSEL_LAYER_ID = 'chart-vessel-layer';
const TRACK_SOURCE_ID = 'chart-track-source';
const TRACK_LAYER_ID = 'chart-track-layer';
const VECTOR_SOURCE_ID = 'chart-vector-source';
const VECTOR_LAYER_ID = 'chart-vector-layer';
const WAYPOINT_SOURCE_ID = 'chart-waypoints-source';
const WAYPOINT_LAYER_ID = 'chart-waypoints-layer';
const ROUTE_SOURCE_ID = 'chart-route-source';
const ROUTE_LAYER_ID = 'chart-route-layer';
const TRUE_WIND_SOURCE_ID = 'chart-true-wind-source';
const TRUE_WIND_LAYER_ID = 'chart-true-wind-layer';
const RANGE_RINGS_SOURCE_ID = 'chart-range-rings-source';
const RANGE_RINGS_LAYER_ID = 'chart-range-rings-layer';
const BEARING_LINE_SOURCE_ID = 'chart-bearing-line-source';
const BEARING_LINE_LAYER_ID = 'chart-bearing-line-layer';
const AIS_SOURCE_ID = 'chart-ais-source';
const AIS_LAYER_ID = 'chart-ais-layer';
const AIS_ICON_ID = 'chart-ais-icon';
const AIS_ICON_DANGEROUS_ID = 'chart-ais-icon-dangerous';
const CPA_LINE_SOURCE_ID = 'chart-cpa-line-source';
const CPA_LINE_LAYER_ID = 'chart-cpa-line-layer';

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
  private orientation: MapOrientation = 'north-up';

  private readonly handleMapClick = (event: maplibregl.MapMouseEvent): void => {
    if (!this.clickHandler) {
      return;
    }
    // Check if we clicked a feature (AIS layer for now)
    if (this.map && this.featureClickHandler) {
        const features = this.map.queryRenderedFeatures(event.point, { layers: [AIS_LAYER_ID] });
        if (features.length > 0) {
            const feature = features[0];
            this.featureClickHandler({
                featureId: feature.id as string,
                properties: feature.properties,
                layerId: AIS_LAYER_ID
            });
            return; // Stop propagation to map click (centering)
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
  private lastWaypoints: WaypointFeatureCollection = EMPTY_POINTS as unknown as WaypointFeatureCollection;
  private lastRoute: FeatureCollection<LineString> = EMPTY_LINE;
  private lastTrueWind: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastRangeRings: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] };
  private lastBearingLine: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastAisTargets: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };
  private lastCpaLines: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };

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

    this.map.on('load', () => this.onStyleReady());
    this.map.on('style.load', () => this.onStyleReady());
    this.map.on('click', this.handleMapClick);
  }

  setBaseSource(chartSourceConfig: ChartSourceConfig): void {
    this.baseSource = chartSourceConfig;
    if (!this.map) {
      return;
    }
    this.mapReady = false;
    this.map.setStyle(chartSourceConfig.style);
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

  updateTrueWind(lineStringCoords: [number, number][], visible: boolean): void {
    this.lastTrueWind = { coords: lineStringCoords, visible };
    if (!this.mapReady) {
      return;
    }
    this.applyTrueWind();
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


  destroy(): void {
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

  updateCpaLines(geojson: FeatureCollection<LineString>): void {
    this.lastCpaLines = geojson;
    if (this.mapReady) {
      this.applyCpaLines();
    }
  }

  private ensureAisLayer(): void {
    if (!this.map) return;

    if (!this.map.hasImage(AIS_ICON_ID)) {
      this.map.addImage(AIS_ICON_ID, this.createAisIcon('#9ca3af', '#4b5563')); // Gray
    }
    if (!this.map.hasImage(AIS_ICON_DANGEROUS_ID)) {
      this.map.addImage(AIS_ICON_DANGEROUS_ID, this.createAisIcon('#ef4444', '#b91c1c')); // Red
    }

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
          'icon-image': [
            'match',
            ['get', 'status'], // 'dangerous' or 'normal'
            'dangerous',
            AIS_ICON_DANGEROUS_ID,
            // default
            AIS_ICON_ID,
          ],
          'icon-size': 0.8, // Slightly smaller than own vessel (which is effectively 1.0 logic size if we consider ratio)
          'icon-allow-overlap': true,
          'icon-rotation-alignment': 'map',
          'icon-rotate': ['get', 'heading'],
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

  private applyCpaLines(): void {
    if (!this.map) return;
    const source = this.map.getSource(CPA_LINE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.lastCpaLines);
  }

  private createAisIcon(fillColor: string, strokeColor: string): ImageData {
    // Reuse the detailed vessel shape for AIS targets
    // We pass strokeColor as the "lighter" color for gradient if we want, 
    // or just use the same logic. 
    // Let's call createVesselIcon directly but we need to ensure colors make sense.
    // createVesselIcon uses (color1, color2) for gradient.
    // We can pass (strokeColor, fillColor) or similar.
    return this.createVesselIcon(strokeColor, fillColor);
  }

  private updateMapBearing(): void {
    // Legacy support or alias
    this.updateCamera();
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
      // Course-up
      const heading = this.lastVessel.rotationDeg;
      if (typeof heading === 'number') {
        options.bearing = heading;
      }
    }
    
    if (Object.keys(options).length > 0) {
        // Use easeTo for smooth tracking for both center and bearing
        console.log('[MapLibreEngine] updateCamera easing to:', options, 'Orientation:', this.orientation);
        this.map.easeTo({ 
            ...options,
            duration: 250, // slightly longer for smoothness
            easing: (t) => t // linear easing often better for tracking? or default cubic-bezier
        });
    }
  }

  private onStyleReady(): void {
    this.ensureVesselLayer();
    this.ensureTrackLayer();
    this.ensureVectorLayer();
    this.ensureTrueWindLayer();
    this.ensureWaypointsLayer();
    this.ensureRouteLayer();
    this.ensureRangeRingsLayer();
    this.ensureBearingLineLayer();
    this.ensureAisLayer();
    this.ensureCpaLinesLayer();

    this.applyVessel();
    this.applyTrack();
    this.applyVector();
    this.applyTrueWind();
    this.applyWaypoints();
    this.applyRoute();
    this.applyRangeRings();
    this.applyBearingLine();
    this.applyAisTargets();
    this.applyCpaLines();
    this.updateCamera();

    this.mapReady = true;
  }

  private ensureVesselLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.hasImage(VESSEL_ICON_ID)) {
      this.map.addImage(VESSEL_ICON_ID, this.createVesselIcon('#0284c7', '#38bdf8'), { pixelRatio: 2 });
    }
    if (!this.map.hasImage(VESSEL_ICON_STALE_ID)) {
      this.map.addImage(VESSEL_ICON_STALE_ID, this.createVesselIcon('#eab308', '#fde047'), { pixelRatio: 2 });
    }
    if (!this.map.hasImage(VESSEL_ICON_NO_FIX_ID)) {
      this.map.addImage(VESSEL_ICON_NO_FIX_ID, this.createVesselIcon('#6b7280', '#9ca3af'), { pixelRatio: 2 });
    }

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
          'icon-size': 0.8, // Increased from 0.5 to match larger canvas (96px)
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
          'line-color': '#10b981', // Emerald-500
          'line-width': 3,
          'line-opacity': 0.85,
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
    if (!source || !this.map.getLayer(TRUE_WIND_LAYER_ID)) {
      return;
    }

    if (!this.lastTrueWind.visible || this.lastTrueWind.coords.length < 2) {
      source.setData(EMPTY_LINE);
      this.map.setLayoutProperty(TRUE_WIND_LAYER_ID, 'visibility', 'none');
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastTrueWind.coords,
          },
          properties: {},
        },
      ],
    };

    source.setData(data);
    this.map.setLayoutProperty(TRUE_WIND_LAYER_ID, 'visibility', 'visible');
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

  private applyView(): void {
    if (!this.map || !this.pendingCenter) {
      return;
    }
    if (this.appliedCenter && this.isSameCenter(this.appliedCenter, this.pendingCenter)) {
      return;
    }
    this.map.jumpTo({ center: this.pendingCenter });
    this.appliedCenter = [...this.pendingCenter];
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
    coords.push(coords[0]); // Close the polygon

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

  private createVesselIcon(color1: string, color2: string): ImageData {
    const size = 96; // Increased from 64
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new ImageData(size, size);
    }

    ctx.clearRect(0, 0, size, size);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;

    // Modern Ship Shape (Boat outline)
    // Center is size/2, size/2
    const cx = size / 2;
    const cy = size / 2;
    
    // Scale factor to fit in 96x96
    // Previous target fit in ~64. Now we have 50% more space.
    // Let's scale up properly.
    const scale = 1.5;
    
    const tipY = cy - (20 * scale);
    const rearY = cy + (20 * scale);
    const widthHalf = 10 * scale;

    const gradient = ctx.createLinearGradient(0, tipY, 0, rearY);
    gradient.addColorStop(0, color2);
    gradient.addColorStop(1, color1);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = color1;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Bow (Tip)
    ctx.moveTo(cx, tipY);
    
    // Starboard side curve
    ctx.bezierCurveTo(cx + widthHalf * 1.5, tipY + (10 * scale), cx + widthHalf, rearY, cx + widthHalf, rearY);
    
    // Stern (Rear)
    ctx.lineTo(cx - widthHalf, rearY);
    
    // Port side curve
    ctx.bezierCurveTo(cx - widthHalf, rearY, cx - widthHalf * 1.5, tipY + (10 * scale), cx, tipY);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add a center dot or cockpit
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy + (5 * scale), 4, 0, Math.PI * 2);
    ctx.fill();

    return ctx.getImageData(0, 0, size, size);
  }
}
