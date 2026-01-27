import { Injectable } from '@angular/core';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString, Point } from 'geojson';
import {
  DEFAULT_CHART_SOURCE_ID,
  resolveChartStyle,
} from './chart-sources';
import type {
  ChartMapEventHandlers,
  ChartMapInit,
  ChartPosition,
  ChartVector,
  ChartWaypoint,
  TrackPoint,
} from './chart-types';

const VESSEL_ICON_ID = 'chart-vessel-icon';
const VESSEL_SOURCE_ID = 'chart-vessel-source';
const VESSEL_LAYER_ID = 'chart-vessel-layer';
const TRACK_SOURCE_ID = 'chart-track-source';
const TRACK_LAYER_ID = 'chart-track-layer';
const VECTOR_SOURCE_ID = 'chart-vector-source';
const VECTOR_LAYER_ID = 'chart-vector-layer';
const WAYPOINT_LINE_SOURCE_ID = 'chart-waypoint-line-source';
const WAYPOINT_LINE_LAYER_ID = 'chart-waypoint-line-layer';

const DEFAULT_VECTOR_NM = 0.2;
const VECTOR_TIME_SECONDS = 60;
const METERS_PER_NM = 1852;

const EMPTY_POINTS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
};

const EMPTY_LINE: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [],
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const normalizeDegrees = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const toLngLat = (position: ChartPosition): [number, number] => [position.lon, position.lat];

@Injectable({
  providedIn: 'root',
})
export class ChartMapService {
  private map: maplibregl.Map | null = null;
  private mapReady = false;
  private eventHandlers: ChartMapEventHandlers = {};

  private currentSourceId = DEFAULT_CHART_SOURCE_ID;
  private defaultCenter: ChartPosition = { lat: 42.2406, lon: -8.7207 };
  private defaultZoom = 12;
  private defaultCentered = false;

  private autoCenter = true;
  private trackVisible = true;
  private vectorVisible = true;

  private lastVessel: { position: ChartPosition; headingDeg: number | null } | null = null;
  private lastTrack: TrackPoint[] = [];
  private lastVector: ChartVector | null = null;
  private lastWaypoints: ChartWaypoint[] = [];
  private lastActiveWaypoint: ChartWaypoint | null = null;

  private waypointMarkers = new Map<string, maplibregl.Marker>();
  private waypointSelectHandler: ((id: string) => void) | null = null;

  initMap(init: ChartMapInit): void {
    if (this.map) {
      return;
    }

    const { container } = init;
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      requestAnimationFrame(() => this.initMap(init));
      return;
    }

    this.defaultCenter = init.center;
    this.defaultZoom = init.zoom;
    this.currentSourceId = init.sourceId ?? DEFAULT_CHART_SOURCE_ID;

    const style = resolveChartStyle(this.currentSourceId);

    this.map = new maplibregl.Map({
      container,
      style,
      center: toLngLat(init.center),
      zoom: init.zoom,
      attributionControl: false,
      pitchWithRotate: false,
      touchPitch: false,
      dragRotate: true,
    });

    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      'bottom-right',
    );
    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    this.map.on('load', () => this.onStyleReady());
    this.map.on('style.load', () => this.onStyleReady());
    this.map.on('click', (event) => this.handleMapClick(event));
    this.map.on('movestart', () => this.eventHandlers.onMoveStart?.());
    this.map.on('zoomstart', () => this.eventHandlers.onZoomStart?.());
    this.map.on('rotatestart', () => this.eventHandlers.onRotateStart?.());
  }

  destroy(): void {
    this.waypointMarkers.forEach((marker) => marker.remove());
    this.waypointMarkers.clear();
    this.map?.remove();
    this.map = null;
    this.mapReady = false;
  }

  resize(): void {
    this.map?.resize();
  }

  setEventHandlers(handlers: ChartMapEventHandlers): void {
    this.eventHandlers = handlers;
  }

  setAutoCenter(enabled: boolean): void {
    this.autoCenter = enabled;
  }

  setChartSource(sourceId: string): void {
    if (!this.map || sourceId === this.currentSourceId) {
      return;
    }
    this.currentSourceId = sourceId;
    this.mapReady = false;
    this.map.setStyle(resolveChartStyle(sourceId));
  }

  centerOn(position: ChartPosition, zoom?: number): void {
    if (!this.map) {
      return;
    }
    this.map.easeTo({
      center: toLngLat(position),
      zoom: zoom ?? this.map.getZoom(),
      duration: 400,
    });
  }

  updateVessel(position: ChartPosition | null, headingDeg: number | null): void {
    this.lastVessel = position ? { position, headingDeg } : null;
    if (!this.mapReady) {
      return;
    }
    this.applyVesselState(true);
  }

  updateTrack(points: TrackPoint[], visible: boolean): void {
    this.lastTrack = points;
    this.trackVisible = visible;
    if (!this.mapReady) {
      return;
    }
    this.applyTrackState();
  }

  updateVector(
    position: ChartPosition | null,
    headingDeg: number | null,
    sogMps: number | null,
    visible: boolean,
  ): void {
    if (position && headingDeg !== null) {
      this.lastVector = { position, headingDeg, sogMps };
    } else {
      this.lastVector = null;
    }
    this.vectorVisible = visible;
    if (!this.mapReady) {
      return;
    }
    this.applyVectorState();
  }

  setWaypoints(
    waypoints: ChartWaypoint[],
    activeWaypoint: ChartWaypoint | null,
    onSelect?: (id: string) => void,
  ): void {
    this.lastWaypoints = waypoints;
    this.lastActiveWaypoint = activeWaypoint;
    this.waypointSelectHandler = onSelect ?? null;
    if (!this.mapReady) {
      return;
    }
    this.applyWaypoints();
  }

  updateWaypointLine(position: ChartPosition | null, activeWaypoint: ChartWaypoint | null): void {
    this.lastActiveWaypoint = activeWaypoint;
    if (!this.mapReady) {
      return;
    }

    this.ensureWaypointLineLayer();

    if (!position || !activeWaypoint) {
      this.setLineData(WAYPOINT_LINE_SOURCE_ID, EMPTY_LINE);
      this.setLayerVisibility(WAYPOINT_LINE_LAYER_ID, false);
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [toLngLat(position), toLngLat(activeWaypoint)],
          },
          properties: {},
        },
      ],
    };

    this.setLineData(WAYPOINT_LINE_SOURCE_ID, data);
    this.setLayerVisibility(WAYPOINT_LINE_LAYER_ID, true);
  }

  private onStyleReady(): void {
    if (!this.map) {
      return;
    }

    this.mapReady = true;
    this.ensureVesselLayer();
    this.ensureTrackLayer();
    this.ensureVectorLayer();
    this.ensureWaypointLineLayer();

    this.applyVesselState(false);
    this.applyTrackState();
    this.applyVectorState();
    this.applyWaypoints();
  }

  private applyVesselState(animate: boolean): void {
    if (!this.map) {
      return;
    }

    if (!this.lastVessel) {
      this.setPointData(VESSEL_SOURCE_ID, EMPTY_POINTS);
      this.resetToDefault();
      return;
    }

    this.defaultCentered = false;

    const heading = this.lastVessel.headingDeg;
    const data: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: toLngLat(this.lastVessel.position),
          },
          properties: {
            heading: heading !== null ? normalizeDegrees(heading) : 0,
          },
        },
      ],
    };

    this.setPointData(VESSEL_SOURCE_ID, data);

    if (this.autoCenter) {
      const center = toLngLat(this.lastVessel.position);
      if (animate) {
        this.map.easeTo({ center, duration: 300 });
      } else {
        this.map.jumpTo({ center });
      }
    }
  }

  private applyTrackState(): void {
    if (!this.map) {
      return;
    }

    this.ensureTrackLayer();

    if (!this.trackVisible || this.lastTrack.length === 0) {
      this.setLineData(TRACK_SOURCE_ID, EMPTY_LINE);
      this.setLayerVisibility(TRACK_LAYER_ID, false);
      return;
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: this.lastTrack.map((point) => [point.lon, point.lat]),
          },
          properties: {},
        },
      ],
    };

    this.setLineData(TRACK_SOURCE_ID, data);
    this.setLayerVisibility(TRACK_LAYER_ID, true);
  }

  private applyVectorState(): void {
    if (!this.map) {
      return;
    }

    this.ensureVectorLayer();

    if (!this.vectorVisible || !this.lastVector) {
      this.setLineData(VECTOR_SOURCE_ID, EMPTY_LINE);
      this.setLayerVisibility(VECTOR_LAYER_ID, false);
      return;
    }

    const destination = this.computeVectorDestination(this.lastVector);
    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [toLngLat(this.lastVector.position), toLngLat(destination)],
          },
          properties: {},
        },
      ],
    };

    this.setLineData(VECTOR_SOURCE_ID, data);
    this.setLayerVisibility(VECTOR_LAYER_ID, true);
  }

  private applyWaypoints(): void {
    if (!this.map) {
      return;
    }

    const nextIds = new Set(this.lastWaypoints.map((waypoint) => waypoint.id));
    for (const [id, marker] of this.waypointMarkers.entries()) {
      if (!nextIds.has(id)) {
        marker.remove();
        this.waypointMarkers.delete(id);
      }
    }

    for (const waypoint of this.lastWaypoints) {
      const existing = this.waypointMarkers.get(waypoint.id);
      const isActive = this.lastActiveWaypoint?.id === waypoint.id;
      if (!existing) {
        const element = this.createWaypointElement(isActive);
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          this.waypointSelectHandler?.(waypoint.id);
        });
        const marker = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat(toLngLat(waypoint))
          .addTo(this.map);
        this.waypointMarkers.set(waypoint.id, marker);
      } else {
        existing.setLngLat(toLngLat(waypoint));
        const element = existing.getElement();
        element.classList.toggle('waypoint-marker--active', isActive);
      }
    }
  }

  private createWaypointElement(active: boolean): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('waypoint-marker');
    if (active) {
      element.classList.add('waypoint-marker--active');
    }
    element.innerHTML = '<span class="waypoint-marker-dot"></span>';
    return element;
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
          visibility: this.trackVisible ? 'visible' : 'none',
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
          visibility: this.vectorVisible ? 'visible' : 'none',
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

  private ensureWaypointLineLayer(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(WAYPOINT_LINE_SOURCE_ID)) {
      this.map.addSource(WAYPOINT_LINE_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_LINE,
      });
    }

    if (!this.map.getLayer(WAYPOINT_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: WAYPOINT_LINE_LAYER_ID,
        type: 'line',
        source: WAYPOINT_LINE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: 'none',
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 2,
          'line-opacity': 0.85,
          'line-dasharray': [1.2, 1.2],
        },
      });
    }
  }

  private setPointData(sourceId: string, data: FeatureCollection<Point>): void {
    if (!this.map) {
      return;
    }
    const source = this.map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    source?.setData(data);
  }

  private setLineData(sourceId: string, data: FeatureCollection<LineString>): void {
    if (!this.map) {
      return;
    }
    const source = this.map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    source?.setData(data);
  }

  private setLayerVisibility(layerId: string, visible: boolean): void {
    if (!this.map || !this.map.getLayer(layerId)) {
      return;
    }
    this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  private resetToDefault(): void {
    if (!this.map || this.defaultCentered) {
      return;
    }
    this.map.jumpTo({ center: toLngLat(this.defaultCenter), zoom: this.defaultZoom });
    this.defaultCentered = true;
  }

  private computeVectorDestination(vector: ChartVector): ChartPosition {
    const headingRad = toRadians(normalizeDegrees(vector.headingDeg));
    const vectorMeters = Math.max(
      DEFAULT_VECTOR_NM * METERS_PER_NM,
      (vector.sogMps ?? 0) * VECTOR_TIME_SECONDS,
    );

    const north = Math.cos(headingRad) * vectorMeters;
    const east = Math.sin(headingRad) * vectorMeters;
    const latOffset = north / 111320;
    const lonOffset = east / (111320 * Math.cos(toRadians(vector.position.lat)));

    return {
      lat: vector.position.lat + latOffset,
      lon: vector.position.lon + lonOffset,
    };
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

  private handleMapClick(event: maplibregl.MapMouseEvent): void {
    if (!this.map) {
      return;
    }
    this.eventHandlers.onClick?.({
      lat: event.lngLat.lat,
      lon: event.lngLat.lng,
      screenX: Math.round(event.point.x),
      screenY: Math.round(event.point.y),
    });
  }
}
