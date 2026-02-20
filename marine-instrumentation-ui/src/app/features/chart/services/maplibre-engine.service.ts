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
            if (feature) {
                this.featureClickHandler({
                    featureId: feature.id as string,
                    properties: feature.properties,
                    layerId: AIS_LAYER_ID
                });
                return; // Stop propagation to map click (centering)
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
    this.applyOpenSeaMapOverlay();
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

    // Re-apply visibility state after style swap
    this.setAisTargetsVisible(this.aisTargetsVisible);
    this.setAisLabelsVisible(this.aisLabelsVisible);
    this.setCpaLinesVisible(this.cpaLinesVisible);
  }

  private applyOpenSeaMapOverlay(): void {
    if (!this.map) return;

    if (this.showOpenSeaMap) {
      if (!this.map.getSource(OPENSEAMAP_SOURCE_ID)) {
        this.map.addSource(OPENSEAMAP_SOURCE_ID, {
          type: 'raster',
          tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
        });
      }
      if (!this.map.getLayer(OPENSEAMAP_LAYER_ID)) {
        // Insert as first overlay, before all GeoJSON layers
        this.map.addLayer({
          id: OPENSEAMAP_LAYER_ID,
          type: 'raster',
          source: OPENSEAMAP_SOURCE_ID,
          paint: { 'raster-opacity': 0.85 },
        });
      }
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
