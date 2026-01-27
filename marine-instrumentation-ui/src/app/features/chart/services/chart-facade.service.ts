import { Injectable, inject } from '@angular/core';
import { auditTime, combineLatest, firstValueFrom, map, scan, shareReplay, startWith, timer } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import {
  isPositionValue,
  selectAwa,
  selectAws,
  selectCog,
  selectDepth,
  selectHeading,
  selectPosition,
  selectSog,
  selectTrackPoints,
  type PositionValue,
} from '../../../state/datapoints/datapoint.selectors';
import type { DataPoint, TrackPoint } from '../../../state/datapoints/datapoint.models';
import type {
  ChartCanvasVm,
  ChartControlsVm,
  ChartFixState,
  ChartHudRow,
  ChartHudVm,
  ChartPosition,
  ChartWaypointListVm,
  ChartWaypointVm,
} from '../types/chart-vm';
import { ChartSettingsService } from './chart-settings.service';
import { WaypointService, type Waypoint } from './waypoint.service';
import { RouteService } from './route.service';
import type { ChartSourceConfig, MapLibreInitView } from './maplibre-engine.service';
import type { WaypointFeatureCollection, WaypointFeatureProperties } from '../types/chart-geojson';
import {
  bearingDistanceNm,
  formatFixed,
  METERS_PER_NM,
  metersPerSecondToKnots,
  normalizeDegrees,
  projectDestination,
  toDegrees,
} from '../../../state/calculations/navigation';

const DEFAULT_CENTER: ChartPosition = { lat: 42.2406, lon: -8.7207 };
const FIX_THRESHOLD_MS = 2000;
const STALE_THRESHOLD_MS = 5000;
const VECTOR_TIME_SECONDS = 60;
const DEFAULT_VECTOR_NM = 0.2;

const DEFAULT_BASE_SOURCE: ChartSourceConfig = {
  id: 'osm-raster',
  style: {
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
  },
};

const hudRow = (label: string, value: string, unit: string): ChartHudRow => ({
  label,
  value,
  unit,
});

const EMPTY_HUD_ROWS: ChartHudRow[] = [
  hudRow('SOG', '--', 'kn'),
  hudRow('COG', '--', 'deg'),
  hudRow('HDG', '--', 'deg'),
  hudRow('Depth', '--', 'm'),
  hudRow('AWS', '--', 'kn'),
  hudRow('AWA', '--', 'deg'),
  hudRow('WP BRG', '--', 'deg'),
  hudRow('WP DST', '--', 'nm'),
];

const coerceNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const fixStateLabel = (state: ChartFixState): string => {
  switch (state) {
    case 'fix':
      return 'FIX';
    case 'stale':
      return 'STALE';
    default:
      return 'NO FIX';
  }
};

@Injectable({
  providedIn: 'root',
})
export class ChartFacadeService {
  private readonly store = inject(DatapointStoreService);
  private readonly settingsService = inject(ChartSettingsService);
  private readonly waypointService = inject(WaypointService);
  private readonly routeService = inject(RouteService);
  private readonly tick$ = timer(0, 1000);
  private readonly position$ = selectPosition(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly trackPoints$ = selectTrackPoints(this.store).pipe(
    startWith([] as TrackPoint[]),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly sog$ = selectSog(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly cog$ = selectCog(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly heading$ = selectHeading(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly depth$ = selectDepth(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly aws$ = selectAws(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly awa$ = selectAwa(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly positionValue$ = this.position$.pipe(
    map((point) => this.extractPosition(point)),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly fixState$ = combineLatest([this.position$, this.tick$]).pipe(
    map(([point]) => {
      if (!point?.timestamp) {
        return 'no-fix' as ChartFixState;
      }
      const ageMs = Date.now() - point.timestamp;
      if (ageMs <= FIX_THRESHOLD_MS) {
        return 'fix';
      }
      if (ageMs > STALE_THRESHOLD_MS) {
        return 'stale';
      }
      return 'fix';
    }),
    startWith('no-fix' as ChartFixState),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly hasFix$ = this.positionValue$.pipe(
    map((value) => !!value),
    startWith(false),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly center$ = combineLatest({
    position: this.positionValue$,
    settings: this.settingsService.settings$,
  }).pipe(
    scan((current, { position, settings }) => {
      if (settings.autoCenter) {
        return position ? { lat: position.latitude, lon: position.longitude } : DEFAULT_CENTER;
      }
      if (current) {
        return current;
      }
      return position ? { lat: position.latitude, lon: position.longitude } : DEFAULT_CENTER;
    }, DEFAULT_CENTER),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly mapCenter$ = this.center$.pipe(
    auditTime(200),
    map((center) => [center.lon, center.lat] as [number, number]),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly positionAgeSeconds$ = combineLatest([this.position$, this.tick$]).pipe(
    map(([point]) => {
      if (!point?.timestamp) {
        return null;
      }
      return Math.max(0, (Date.now() - point.timestamp) / 1000);
    }),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly waypointNav$ = combineLatest([this.positionValue$, this.waypointService.activeWaypoint$]).pipe(
    map(([position, waypoint]) => {
      if (!position || !waypoint) {
        return null;
      }

      return bearingDistanceNm(
        { lat: position.latitude, lon: position.longitude },
        { lat: waypoint.lat, lon: waypoint.lon },
      );
    }),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly initialView: MapLibreInitView = {
    center: [DEFAULT_CENTER.lon, DEFAULT_CENTER.lat],
    zoom: 12,
  };

  readonly baseSourceConfig: ChartSourceConfig = DEFAULT_BASE_SOURCE;

  readonly hudVm$ = combineLatest({
    fixState: this.fixState$,
    position: this.positionValue$,
    sog: this.sog$,
    cog: this.cog$,
    heading: this.heading$,
    depth: this.depth$,
    aws: this.aws$,
    awa: this.awa$,
    age: this.positionAgeSeconds$,
    waypoint: this.waypointNav$,
  }).pipe(
    map(({ fixState, position, sog, cog, heading, depth, aws, awa, age, waypoint }) => {
      const sogValue = coerceNumber(sog?.value);
      const cogValue = coerceNumber(cog?.value);
      const headingValue = coerceNumber(heading?.value);
      const depthValue = coerceNumber(depth?.value);
      const awsValue = coerceNumber(aws?.value);
      const awaValue = coerceNumber(awa?.value);

      const sogLabel = formatFixed(
        sogValue !== null ? metersPerSecondToKnots(sogValue) : null,
        1,
      );
      const cogLabel = formatFixed(
        cogValue !== null ? normalizeDegrees(toDegrees(cogValue)) : null,
        0,
      );
      const headingLabel = formatFixed(
        headingValue !== null ? normalizeDegrees(toDegrees(headingValue)) : null,
        0,
      );
      const depthLabel = formatFixed(depthValue, 1);
      const awsLabel = formatFixed(
        awsValue !== null ? metersPerSecondToKnots(awsValue) : null,
        1,
      );
      const awaLabel = formatFixed(
        awaValue !== null ? normalizeDegrees(toDegrees(awaValue)) : null,
        0,
      );
      const ageLabelValue = formatFixed(age ?? null, 0);
      const waypointBearing = formatFixed(waypoint?.bearingDeg ?? null, 0);
      const waypointDistance = formatFixed(waypoint?.distanceNm ?? null, 2);

      const rows: ChartHudRow[] = [
        hudRow('SOG', sogLabel, 'kn'),
        hudRow('COG', cogLabel, 'deg'),
        hudRow('HDG', headingLabel, 'deg'),
        hudRow('Depth', depthLabel, 'm'),
        hudRow('AWS', awsLabel, 'kn'),
        hudRow('AWA', awaLabel, 'deg'),
        hudRow('WP BRG', waypointBearing, 'deg'),
        hudRow('WP DST', waypointDistance, 'nm'),
      ];

      return {
        fixState,
        statusLabel: fixStateLabel(fixState),
        ageLabel: `Age ${ageLabelValue}s`,
        latLabel: position ? formatFixed(position.latitude, 4) : '--',
        lonLabel: position ? formatFixed(position.longitude, 4) : '--',
        rows,
      } satisfies ChartHudVm;
    }),
    startWith({
      fixState: 'no-fix' as ChartFixState,
      statusLabel: fixStateLabel('no-fix'),
      ageLabel: 'Age --s',
      latLabel: '--',
      lonLabel: '--',
      rows: EMPTY_HUD_ROWS,
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly vesselUpdate$ = combineLatest({
    position: this.positionValue$,
    heading: this.heading$,
    cog: this.cog$,
  }).pipe(
    auditTime(200),
    map(({ position, heading, cog }) => {
      if (!position) {
        return { lngLat: null, rotationDeg: null };
      }

      const headingRad = coerceNumber(heading?.value);
      const cogRad = coerceNumber(cog?.value);
      const rad = headingRad ?? cogRad ?? null;
      const rotationDeg = rad !== null ? normalizeDegrees(toDegrees(rad)) : null;

      return {
        lngLat: [position.longitude, position.latitude] as [number, number],
        rotationDeg,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly trackCoords$ = combineLatest({
    points: this.trackPoints$,
    settings: this.settingsService.settings$,
  }).pipe(
    auditTime(200),
    map(({ points, settings }) =>
      settings.showTrack ? points.map((point) => [point.lon, point.lat] as [number, number]) : [],
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly vectorUpdate$ = combineLatest({
    position: this.positionValue$,
    heading: this.heading$,
    cog: this.cog$,
    sog: this.sog$,
    settings: this.settingsService.settings$,
  }).pipe(
    auditTime(200),
    map(({ position, heading, cog, sog, settings }) => {
      if (!settings.showVector || !position) {
        return { coords: [] as [number, number][], visible: false };
      }

      const headingRad = coerceNumber(heading?.value) ?? coerceNumber(cog?.value);
      if (headingRad === null) {
        return { coords: [] as [number, number][], visible: false };
      }

      const headingDeg = normalizeDegrees(toDegrees(headingRad));
      const sogMps = coerceNumber(sog?.value) ?? 0;
      const vectorMeters = Math.max(DEFAULT_VECTOR_NM * METERS_PER_NM, sogMps * VECTOR_TIME_SECONDS);
      const destination = projectDestination(
        { lat: position.latitude, lon: position.longitude },
        headingDeg,
        vectorMeters,
      );

      return {
        coords: [
          [position.longitude, position.latitude],
          [destination.lon, destination.lat],
        ] as [number, number][],
        visible: true,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly waypointsGeoJson$ = combineLatest({
    waypoints: this.routeService.orderedWaypoints$,
    activeId: this.waypointService.activeId$,
  }).pipe(
    map(({ waypoints, activeId }) => ({
      type: 'FeatureCollection',
      features: waypoints.map((waypoint) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [waypoint.lon, waypoint.lat],
        },
        properties: {
          id: waypoint.id,
          name: waypoint.name,
          active: waypoint.id === activeId,
        } satisfies WaypointFeatureProperties,
      })),
    }) satisfies WaypointFeatureCollection),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly routeGeoJson$ = this.routeService.routeLine$;

  readonly canvasVm$ = combineLatest({
    fixState: this.fixState$,
    hasFix: this.hasFix$,
    center: this.center$,
  }).pipe(
    map(({ fixState, hasFix, center }) => ({
      fixState,
      hasFix,
      center,
      statusLabel: fixStateLabel(fixState),
      centerLabel: `${formatFixed(center.lat, 4)}, ${formatFixed(center.lon, 4)}`,
    }) satisfies ChartCanvasVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly controlsVm$ = combineLatest({
    settings: this.settingsService.settings$,
    canCenter: this.hasFix$,
  }).pipe(
    map(({ settings, canCenter }) => ({
      autoCenter: settings.autoCenter,
      showTrack: settings.showTrack,
      showVector: settings.showVector,
      canCenter,
    } satisfies ChartControlsVm)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly waypointListVm$ = combineLatest({
    waypoints: this.routeService.orderedWaypoints$,
    activeId: this.waypointService.activeId$,
  }).pipe(
    map(({ waypoints, activeId }) => ({
      waypoints: waypoints.map((waypoint) => this.mapWaypoint(waypoint)),
      activeId,
    } satisfies ChartWaypointListVm)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  toggleAutoCenter(): void {
    this.settingsService.toggleAutoCenter();
  }

  toggleTrack(): void {
    this.settingsService.toggleTrack();
  }

  toggleVector(): void {
    this.settingsService.toggleVector();
  }

  centerOnBoat(): void {
    this.settingsService.enableAutoCenter();
  }

  addWaypointAt(lngLat: [number, number]): void {
    const [lon, lat] = lngLat;
    this.waypointService.addWaypoint(lat, lon);
  }

  async addWaypointAtCenter(): Promise<void> {
    const center = await firstValueFrom(this.center$);
    this.waypointService.addWaypoint(center.lat, center.lon);
  }

  selectWaypoint(id: string): void {
    this.waypointService.toggleActive(id);
  }

  renameWaypoint(id: string, name: string): void {
    this.waypointService.renameWaypoint(id, name);
  }

  deleteWaypoint(id: string): void {
    this.waypointService.deleteWaypoint(id);
  }

  clearActiveWaypoint(): void {
    this.waypointService.clearActive();
  }

  private extractPosition(point: DataPoint<PositionValue> | undefined): PositionValue | null {
    if (!point?.value || !isPositionValue(point.value)) {
      return null;
    }
    return point.value;
  }

  private mapWaypoint(waypoint: Waypoint): ChartWaypointVm {
    return {
      id: waypoint.id,
      name: waypoint.name,
      lat: waypoint.lat,
      lon: waypoint.lon,
      createdAt: waypoint.createdAt,
      positionLabel: `${formatFixed(waypoint.lat, 4)}, ${formatFixed(waypoint.lon, 4)}`,
    };
  }
}
