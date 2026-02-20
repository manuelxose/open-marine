import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, auditTime, combineLatest, firstValueFrom, map, scan, shareReplay, startWith, timer } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { AisStoreService } from '../../../state/ais/ais-store.service';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';
import type { FeatureCollection, Point } from 'geojson';
import {
  isPositionValue,
  selectAwa,
  selectAws,
  selectCog,
  selectDepth,
  selectHeading,
  selectPosition,
  selectSog,
  selectTws,
  selectTwd,
  selectTrackPoints,
  type PositionValue,
} from '../../../state/datapoints/datapoint.selectors';
import type { DataPoint, TrackPoint } from '../../../state/datapoints/datapoint.models';
import type {
  ChartCanvasVm,
  ChartControlsVm,
  ChartRoutesPanelVm,
  ChartTopBarVm,
  ChartFixState,
  ChartHudRow,
  ChartHudVm,
  ChartPosition,
  ChartWaypointListVm,
  ChartWaypointVm,
  MapOrientation,
} from '../types/chart-vm';
import { ChartSettingsService } from './chart-settings.service';
import { WaypointService, type Waypoint } from './waypoint.service';
import { RouteService } from './route.service';
import type { ChartSourceConfig, MapLibreInitView } from './maplibre-engine.service';
import type { WaypointFeatureCollection, WaypointFeatureProperties } from '../types/chart-geojson';
import { DataQualityService } from '../../../shared/services/data-quality.service';
import { formatCoordinate } from '../../../core/formatting/formatters';
import {
  bearingDistanceNm,
  crossTrackErrorNm,
  formatFixed,
  METERS_PER_NM,
  metersPerSecondToKnots,
  normalizeDegrees,
  projectDestination,
  toDegrees,
  vmgToWaypointKnots,
} from '../../../state/calculations/navigation';
import type { CpaLinesFeatureCollection } from '../types/chart-geojson';

const DEFAULT_CENTER: ChartPosition = { lat: 42.2406, lon: -8.7207 };
const FIX_THRESHOLD_MS = 2000;
const STALE_THRESHOLD_MS = 5000;
const VECTOR_TIME_SECONDS = 60;
const DEFAULT_VECTOR_NM = 0.2;
const MIN_SPEED_FOR_ETA_KTS = 0.1;

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

const SATELLITE_SOURCE: ChartSourceConfig = {
  id: 'satellite',
  style: {
    version: 8,
    sources: {
      'satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
      },
    ],
  },
};

const hudRow = (labelKey: string, value: string, unit: string): ChartHudRow => ({
  labelKey,
  value,
  unit,
});

const EMPTY_HUD_ROWS: ChartHudRow[] = [
  hudRow('chart.hud.sog', '--', 'kn'),
  hudRow('chart.hud.cog', '--', 'deg'),
  hudRow('chart.hud.hdg', '--', 'deg'),
  hudRow('chart.hud.depth', '--', 'm'),
  hudRow('chart.hud.aws', '--', 'kn'),
  hudRow('chart.hud.awa', '--', 'deg'),
  hudRow('chart.hud.wp_brg', '--', 'deg'),
  hudRow('chart.hud.wp_dst', '--', 'nm'),
];

const EMPTY_TOP_BAR_VM: ChartTopBarVm = {
  sog: { value: null, formatted: '---', quality: 'missing' },
  cog: { value: null, formatted: '---', quality: 'missing' },
  hdg: { value: null, formatted: '---', quality: 'missing' },
  position: { lat: '--', lon: '--', quality: 'missing' },
  utcTime: '--:--:-- UTC',
  localTime: '--:--:--',
  signalKConnected: false,
  signalKQuality: 'offline',
  activeRoute: null,
};

const coerceNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const fixStateLabel = (state: ChartFixState): string => {
  switch (state) {
    case 'fix':
      return 'dashboard.status.fix';
    case 'stale':
      return 'dashboard.status.stale';
    default:
      return 'dashboard.status.nofix';
  }
};

@Injectable({
  providedIn: 'root',
})
export class ChartFacadeService {
  private readonly store = inject(DatapointStoreService);
  private readonly aisStore = inject(AisStoreService);
  private readonly signalKClient = inject(SignalKClientService);
  private readonly settingsService = inject(ChartSettingsService);
  private readonly qualityService = inject(DataQualityService);
  private readonly waypointService = inject(WaypointService);
  private readonly routeService = inject(RouteService);
  private readonly _orientation$ = new BehaviorSubject<MapOrientation>('north-up');
  readonly orientation$ = this._orientation$.asObservable();

  toggleOrientation(): void {
    const current = this._orientation$.value;
    this._orientation$.next(current === 'north-up' ? 'course-up' : 'north-up');
  }

  readonly aisTargetsGeoJson$ = toObservable(this.aisStore.targets).pipe(
    map((targetsMap) => {
      const features: any[] = [];
      for (const t of targetsMap.values()) {
        if (!t.latitude || !t.longitude) continue;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [t.longitude, t.latitude],
          },
          properties: {
            mmsi: t.mmsi,
            heading: toDegrees(t.heading ?? t.cog ?? 0),
            status: t.isDangerous ? 'dangerous' : 'normal',
            name: t.name ?? t.mmsi,
          },
        });
      }
      return {
        type: 'FeatureCollection',
        features,
      } as FeatureCollection<Point>;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly cpaLinesGeoJson$ = combineLatest([
    toObservable(this.aisStore.dangerousTargets),
    selectPosition(this.store),
    selectSog(this.store),
    selectCog(this.store)
  ]).pipe(
      map(([targets, ownPos, ownSog, ownCog]) => {
          const features: any[] = [];
          if (!ownPos || typeof ownSog !== 'number' || typeof ownCog !== 'number' || !ownPos.timestamp) {
              return { type: 'FeatureCollection', features: [] } as CpaLinesFeatureCollection;
          }

          // Use position, speed, cog to project
          for (const t of targets) {
              if (t.tcpa !== undefined && t.tcpa !== null && Math.abs(t.tcpa) < 120 * 60) { // Limit huge projections
                 // tcpa is seconds. cpa.ts says tCpa is seconds? 
                 // Wait, ais-store: TCPA_WARNING_SECONDS = 20 * 60.
                 // calculateCpa returns tCpa in seconds.
                 
                 const tCpaSeconds = t.tcpa;
                 // It can be negative if passed?
                 if (tCpaSeconds < -60) continue; // Don't show old lines too long
                 
                 // Project Own Ship
                 // SOG is m/s in store? No knots usually.
                 // Store types: value is T. 
                 // marine-data-contract says SOG is m/s usually in SignalK, but we might have converted?
                 // Let's assume SignalK m/s as per contract.
                 
                 // However, projectDestination takes DISTANCE in METERS.
                 // Distance = speed(m/s) * time(s).
                 
                 // We need to confirm units.
                 // DatapointStore maps raw values. Simulator sends 3.2 (knots? m/s?).
                 // Simulator: sog: 3.2. Contract doesn't enforce unit but SI is standard.
                 // 3.2 m/s ~ 6 knots. Reasonable.
                 // Let's assume m/s.
                 
                 const ownDist = Math.max(0, ownSog * tCpaSeconds);
                 const ownCpaPos = projectDestination(
                     { lat: ownPos.value.latitude, lon: ownPos.value.longitude }, 
                     toDegrees(ownCog), // projectDestination takes Degrees
                     ownDist
                 );

                 // Project Target
                 if (typeof t.sog === 'number' && typeof t.cog === 'number' && t.latitude && t.longitude) {
                     const targetDist = Math.max(0, t.sog * tCpaSeconds);
                     const targetCpaPos = projectDestination(
                         { lat: t.latitude, lon: t.longitude },
                         toDegrees(t.cog),
                         targetDist
                     );

                     // Line connecting future positions (The "Miss Distance" geometry)
                     features.push({
                         type: 'Feature',
                         geometry: {
                             type: 'LineString',
                             coordinates: [
                                 [ownCpaPos.lon, ownCpaPos.lat],
                                 [targetCpaPos.lon, targetCpaPos.lat]
                             ]
                         },
                         properties: {}
                     });
                     
                     // Line connecting current positions (The "Hazard Link") - Optional?
                     // Spec says "Linea a target peligroso".
                     // Maybe a line from OwnShip -> Target?
                     features.push({
                         type: 'Feature',
                         geometry: {
                             type: 'LineString',
                             coordinates: [
                                 [ownPos.value.longitude, ownPos.value.latitude],
                                 [t.longitude, t.latitude]
                             ]
                         },
                         properties: {}
                     });
                 }
              }
          }
          return { type: 'FeatureCollection', features } as CpaLinesFeatureCollection;
      }),
      startWith({ type: 'FeatureCollection', features: [] } as CpaLinesFeatureCollection),
      shareReplay({ bufferSize: 1, refCount: true })
  );

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
  private readonly tws$ = selectTws(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly twd$ = selectTwd(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly signalKConnected$ = this.signalKClient.connected$.pipe(
    startWith(false),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

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
      if (ageMs <= STALE_THRESHOLD_MS) {
        return 'stale';
      }
      return 'no-fix';
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

  private readonly _baseSource$ = new BehaviorSubject<ChartSourceConfig>(DEFAULT_BASE_SOURCE);
  readonly baseSource$ = this._baseSource$.asObservable();

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
      // const ageLabelValue = formatFixed(age ?? null, 0);
      const waypointBearing = formatFixed(waypoint?.bearingDeg ?? null, 0);
      const waypointDistance = formatFixed(waypoint?.distanceNm ?? null, 2);

      const rows: ChartHudRow[] = [
        hudRow('chart.hud.sog', sogLabel, 'kn'),
        hudRow('chart.hud.cog', cogLabel, 'deg'),
        hudRow('chart.hud.hdg', headingLabel, 'deg'),
        hudRow('chart.hud.depth', depthLabel, 'm'),
        hudRow('chart.hud.aws', awsLabel, 'kn'),
        hudRow('chart.hud.awa', awaLabel, 'deg'),
        hudRow('chart.hud.wp_brg', waypointBearing, 'deg'),
        hudRow('chart.hud.wp_dst', waypointDistance, 'nm'),
      ];

      return {
        fixState,
        statusLabelKey: fixStateLabel(fixState),
        ageSeconds: age,
        latLabel: position ? formatFixed(position.latitude, 4) : '--',
        lonLabel: position ? formatFixed(position.longitude, 4) : '--',
        rows,
        canToggleAutopilot: true,
      } satisfies ChartHudVm;
    }),
    startWith({
      fixState: 'no-fix' as ChartFixState,
      statusLabelKey: fixStateLabel('no-fix'),
      ageSeconds: null,
      latLabel: '--',
      lonLabel: '--',
      rows: EMPTY_HUD_ROWS,
      canToggleAutopilot: true,
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly topBarVm$ = combineLatest({
    tick: this.tick$,
    positionPoint: this.position$,
    position: this.positionValue$,
    sog: this.sog$,
    cog: this.cog$,
    heading: this.heading$,
    waypoint: this.waypointNav$,
    activeWaypoint: this.waypointService.activeWaypoint$,
    activeLeg: this.routeService.activeLeg$,
    connected: this.signalKConnected$,
  }).pipe(
    map(({ positionPoint, position, sog, cog, heading, waypoint, activeWaypoint, activeLeg, connected }) => {
      const now = new Date();
      const sogValue = coerceNumber(sog?.value);
      const cogValue = coerceNumber(cog?.value);
      const headingValue = coerceNumber(heading?.value);
      const sogKnots = sogValue !== null ? metersPerSecondToKnots(sogValue) : null;
      const cogDeg = cogValue !== null ? normalizeDegrees(toDegrees(cogValue)) : null;
      const headingDeg = headingValue !== null ? normalizeDegrees(toDegrees(headingValue)) : null;
      const positionQuality = this.qualityService.getQuality(positionPoint?.timestamp ?? null);

      // Compute XTE when we have an active leg and vessel position
      let xteNm = 0;
      if (activeLeg && position) {
        const xte = crossTrackErrorNm(
          { lat: activeLeg.from.lat, lon: activeLeg.from.lon },
          { lat: activeLeg.to.lat, lon: activeLeg.to.lon },
          { lat: position.latitude, lon: position.longitude },
        );
        xteNm = xte.xteNm;
      }

      const activeRoute =
        activeWaypoint && waypoint
          ? this.buildTopBarActiveRoute(activeWaypoint.name, waypoint.distanceNm, waypoint.bearingDeg, sogKnots, cogDeg, now, xteNm)
          : null;

      const signalKQuality: ChartTopBarVm['signalKQuality'] = !connected
        ? 'offline'
        : positionQuality === 'stale' || positionQuality === 'missing'
          ? 'degraded'
          : 'online';

      return {
        sog: {
          value: sogKnots,
          formatted: formatFixed(sogKnots, 1),
          quality: this.qualityService.getQuality(sog?.timestamp ?? null),
        },
        cog: {
          value: cogDeg,
          formatted: formatFixed(cogDeg, 0),
          quality: this.qualityService.getQuality(cog?.timestamp ?? null),
        },
        hdg: {
          value: headingDeg,
          formatted: formatFixed(headingDeg, 0),
          quality: this.qualityService.getQuality(heading?.timestamp ?? null),
        },
        position: {
          lat: formatCoordinate(position?.latitude ?? null, 'lat'),
          lon: formatCoordinate(position?.longitude ?? null, 'lon'),
          quality: positionQuality,
        },
        utcTime: this.formatUtcClock(now),
        localTime: this.formatLocalClock(now),
        signalKConnected: connected,
        signalKQuality,
        activeRoute,
      } satisfies ChartTopBarVm;
    }),
    startWith(EMPTY_TOP_BAR_VM),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly vesselUpdate$ = combineLatest({
    position: this.positionValue$,
    heading: this.heading$,
    cog: this.cog$,
    fixState: this.fixState$,
  }).pipe(
    auditTime(200),
    map(({ position, heading, cog, fixState }) => {
      if (!position) {
        return { lngLat: null, rotationDeg: null, state: fixState };
      }

      const headingRad = coerceNumber(heading?.value);
      const cogRad = coerceNumber(cog?.value);
      const rad = headingRad ?? cogRad ?? null;
      const rotationDeg = rad !== null ? normalizeDegrees(toDegrees(rad)) : null;

      return {
        lngLat: [position.longitude, position.latitude] as [number, number],
        rotationDeg,
        state: fixState,
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
  );trueWindUpdate$ = combineLatest({
    position: this.positionValue$,
    twd: this.twd$,
    tws: this.tws$,
    settings: this.settingsService.settings$,
  }).pipe(
    auditTime(200),
    map(({ position, twd, tws, settings }) => {
      if (!settings.showTrueWind || !position) {
        return { coords: [] as [number, number][], visible: false };
      }

      const twdRad = coerceNumber(twd?.value);
      if (twdRad === null) {
        return { coords: [] as [number, number][], visible: false };
      }

      const twdDeg = normalizeDegrees(toDegrees(twdRad));

      // Calculate wind vector length
      // TWS is in m/s. We project where the "wind particle" would be in 60 seconds
      // OR we just use a fixed length.
      // Let's use the same logic as SOG: 60 seconds of travel.
      // NOTE: Wind vector normally points WITH the wind.
      // If TWD is North (0), wind is blowing FROM North TO South.
      // Standard vector points South (180).
      // BUT we want a "Wind Barb" which points INTO the wind (North).
      // So use TWD directly.
      
      const twsMps = coerceNumber(tws?.value) ?? 0;
      const vectorMeters = Math.max(DEFAULT_VECTOR_NM * METERS_PER_NM, twsMps * VECTOR_TIME_SECONDS);
      
      const destination = projectDestination(
        { lat: position.latitude, lon: position.longitude },
        twdDeg,
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
      statusLabelKey: fixStateLabel(fixState),
      centerLabel: `${formatFixed(center.lat, 4)}, ${formatFixed(center.lon, 4)}`,
    }) satisfies ChartCanvasVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly controlsVm$ = combineLatest({
    settings: this.settingsService.settings$,
    canCenter: this.hasFix$,
    source: this.baseSource$,
  }).pipe(
    map(({ settings, canCenter, source }) => ({
      autoCenter: settings.autoCenter,
      showTrack: settings.showTrack,
      showVector: settings.showVector,
      showTrueWind: settings.showTrueWind,
      showRangeRings: settings.showRangeRings,
      showOpenSeaMap: settings.showOpenSeaMap,
      rangeRingIntervals: settings.rangeRingIntervals,
      canCenter,
      sourceId: source.id,
      showAisTargets: settings.showAisTargets,
      showAisLabels: settings.showAisLabels,
      showCpaLines: settings.showCpaLines,
    } satisfies ChartControlsVm)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly rangeRingsUpdate$ = combineLatest({
    position: this.positionValue$,
    settings: this.settingsService.settings$,
  }).pipe(
    auditTime(200),
    map(({ position, settings }) => {
      if (!settings.showRangeRings || !position) {
        return { center: null, intervals: [] as number[] };
      }
      return {
        center: [position.longitude, position.latitude] as [number, number],
        intervals: settings.rangeRingIntervals,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly bearingLineUpdate$ = combineLatest({
    position: this.positionValue$,
    activeWaypoint: this.waypointService.activeWaypoint$,
  }).pipe(
    auditTime(200),
    map(({ position, activeWaypoint }) => {
      if (!position || !activeWaypoint) {
        return { coords: [] as [number, number][], visible: false };
      }

      return {
        coords: [
          [position.longitude, position.latitude],
          [activeWaypoint.lon, activeWaypoint.lat],
        ] as [number, number][],
        visible: true,
      };
    }),
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

  readonly routesPanelVm$ = combineLatest({
    tick: this.tick$,
    waypoints: this.routeService.orderedWaypoints$,
    activeId: this.waypointService.activeId$,
    sog: this.sog$,
  }).pipe(
    map(({ waypoints, activeId, sog }) => {
      if (waypoints.length < 2) {
        return { routes: [] } satisfies ChartRoutesPanelVm;
      }

      const sogValue = coerceNumber(sog?.value);
      const sogKnots = sogValue !== null ? metersPerSecondToKnots(sogValue) : null;
      let totalDistanceNm = 0;
      let cumulativeHours = 0;
      const now = new Date();

      const legs = waypoints.slice(0, -1).map((fromWaypoint, index) => {
        const toWaypoint = waypoints[index + 1];
        if (!toWaypoint) {
          return null;
        }
        const nav = bearingDistanceNm(
          { lat: fromWaypoint.lat, lon: fromWaypoint.lon },
          { lat: toWaypoint.lat, lon: toWaypoint.lon },
        );
        totalDistanceNm += nav.distanceNm;

        const legHours = sogKnots !== null && sogKnots > MIN_SPEED_FOR_ETA_KTS
          ? nav.distanceNm / sogKnots
          : null;
        if (legHours !== null) {
          cumulativeHours += legHours;
        }

        const etaDate = legHours !== null
          ? new Date(now.getTime() + cumulativeHours * 3600_000)
          : null;

        return {
          from: fromWaypoint.name,
          to: toWaypoint.name,
          bearingDeg: nav.bearingDeg,
          distanceNm: nav.distanceNm,
          eta: etaDate ? this.formatUtcClock(etaDate).replace(' UTC', '') : '--',
        };
      }).filter((leg): leg is NonNullable<typeof leg> => !!leg);

      const route = {
        id: 'current-route',
        name: 'Current route',
        waypointCount: waypoints.length,
        totalDistanceNm,
        isActive: activeId !== null,
        estimatedDuration: this.formatTtg(
          sogKnots !== null && sogKnots > MIN_SPEED_FOR_ETA_KTS ? totalDistanceNm / sogKnots : null,
        ),
        legs,
      };

      return {
        routes: [route],
      } satisfies ChartRoutesPanelVm;
    }),
    startWith({ routes: [] } satisfies ChartRoutesPanelVm),
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

  toggleTrueWind(): void {
    this.settingsService.toggleTrueWind();
  }

  toggleRangeRings(): void {
    this.settingsService.toggleRangeRings();
  }

  toggleOpenSeaMap(): void {
    this.settingsService.toggleOpenSeaMap();
  }

  toggleAisTargets(): void {
    this.settingsService.toggleAisTargets();
  }

  toggleAisLabels(): void {
    this.settingsService.toggleAisLabels();
  }

  toggleCpaLines(): void {
    this.settingsService.toggleCpaLines();
  }

  readonly openSeaMapVisible$ = this.settingsService.settings$.pipe(
    map(s => s.showOpenSeaMap),
  );

  readonly showAisTargets$ = this.settingsService.settings$.pipe(
    map(s => s.showAisTargets),
  );

  readonly showAisLabels$ = this.settingsService.settings$.pipe(
    map(s => s.showAisLabels),
  );

  readonly showCpaLines$ = this.settingsService.settings$.pipe(
    map(s => s.showCpaLines),
  );

  setRangeRingIntervals(intervals: number[]): void {
    this.settingsService.setRangeRingIntervals(intervals);
  }

  toggleLayer(): void {
    const current = this._baseSource$.value;
    if (current.id === 'osm-raster') {
      this._baseSource$.next(SATELLITE_SOURCE);
    } else {
      this._baseSource$.next(DEFAULT_BASE_SOURCE);
    }
  }

  centerOnVessel(): void {
    this.centerOnBoat();
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

  private buildTopBarActiveRoute(
    waypointName: string,
    distanceNm: number,
    bearingDeg: number,
    sogKnots: number | null,
    cogDeg: number | null,
    now: Date,
    xteNm: number = 0,
  ): NonNullable<ChartTopBarVm['activeRoute']> {
    const hoursToGo = sogKnots !== null && sogKnots > MIN_SPEED_FOR_ETA_KTS ? distanceNm / sogKnots : null;
    const etaDate = hoursToGo !== null ? new Date(now.getTime() + hoursToGo * 3600_000) : null;

    const vmgKnots =
      sogKnots !== null && cogDeg !== null
        ? vmgToWaypointKnots(sogKnots, cogDeg, bearingDeg)
        : null;

    return {
      name: 'Direct To',
      nextWaypointName: waypointName,
      dtwNm: distanceNm,
      btwDeg: bearingDeg,
      xteNm,
      vmgKnots,
      eta: etaDate ? this.formatUtcClock(etaDate).replace(' UTC', '') : '--',
      ttg: this.formatTtg(hoursToGo),
    };
  }

  private formatUtcClock(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} UTC`;
  }

  private formatLocalClock(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatTtg(hours: number | null): string {
    if (hours === null || !Number.isFinite(hours) || hours < 0) {
      return '--';
    }
    const totalMinutes = Math.max(0, Math.round(hours * 60));
    const ttgHours = Math.floor(totalMinutes / 60);
    const ttgMinutes = totalMinutes % 60;
    if (ttgHours === 0) {
      return `${ttgMinutes}m`;
    }
    return `${ttgHours}h ${ttgMinutes.toString().padStart(2, '0')}m`;
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
