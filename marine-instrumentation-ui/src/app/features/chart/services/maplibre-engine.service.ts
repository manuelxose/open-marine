import maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { WaypointFeatureCollection } from '../types/chart-geojson';

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

const EMPTY_POINTS: WaypointFeatureCollection = {
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
  private pendingCenter: [number, number] | null = null;
  private appliedCenter: [number, number] | null = null;

  private readonly handleMapClick = (event: maplibregl.MapMouseEvent): void => {
    if (!this.clickHandler) {
      return;
    }
    this.clickHandler([event.lngLat.lng, event.lngLat.lat]);
  };

  private lastVessel: { lngLat: [number, number] | null; rotationDeg: number | null } = {
    lngLat: null,
    rotationDeg: null,
  };
  private lastTrack: [number, number][] = [];
  private lastVector: { coords: [number, number][]; visible: boolean } = {
    coords: [],
    visible: false,
  };
  private lastWaypoints: WaypointFeatureCollection = EMPTY_POINTS;
  private lastRoute: FeatureCollection<LineString> = EMPTY_LINE;

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

    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      'bottom-right',
    );
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

  updateVesselPosition(lngLat: [number, number] | null, rotationDeg: number | null): void {
    this.lastVessel = { lngLat, rotationDeg };
    if (!this.mapReady) {
      return;
    }
    this.applyVessel();
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

  updateView(center: [number, number] | null): void {
    this.pendingCenter = center;
    if (!this.mapReady || !this.map || !center) {
      return;
    }
    this.applyView();
  }

  setClickHandler(handler: ((lngLat: [number, number]) => void) | null): void {
    this.clickHandler = handler;
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

  private onStyleReady(): void {
    if (!this.map) {
      return;
    }

    this.mapReady = true;
    this.ensureVesselLayer();
    this.ensureTrackLayer();
    this.ensureVectorLayer();
    this.ensureWaypointsLayer();
    this.ensureRouteLayer();

    this.applyVessel();
    this.applyTrack();
    this.applyVector();
    this.applyWaypoints();
    this.applyRoute();
    this.applyView();
  }

  private ensureVesselLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.hasImage(VESSEL_ICON_ID)) {
      this.map.addImage(VESSEL_ICON_ID, this.createVesselIcon(), { pixelRatio: 2 });
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
          'icon-image': VESSEL_ICON_ID,
          'icon-size': 0.9,
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

  private isSameCenter(left: [number, number], right: [number, number]): boolean {
    return Math.abs(left[0] - right[0]) < 1e-7 && Math.abs(left[1] - right[1]) < 1e-7;
  }

  private createVesselIcon(): ImageData {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new ImageData(size, size);
    }

    ctx.clearRect(0, 0, size, size);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 6;

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(1, '#0284c7');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(size / 2, 4);
    ctx.lineTo(6, size - 6);
    ctx.lineTo(size - 6, size - 6);
    ctx.closePath();
    ctx.fill();

    return ctx.getImageData(0, 0, size, size);
  }
}
