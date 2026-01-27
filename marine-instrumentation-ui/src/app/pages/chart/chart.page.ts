import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { auditTime, combineLatest, map, shareReplay, startWith, timer } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { metersPerSecondToKnots, radToDeg } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import type { DataPoint, TrackPoint } from '../../state/datapoints/datapoint.models';
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
} from '../../state/datapoints/datapoint.selectors';
import {
  ChartHudComponent,
  type ChartHudMetrics,
  type FixState,
} from '../../ui/components/chart-hud/chart-hud.component';
import { WaypointService, type Waypoint } from '../../services/waypoint.service';
import { ChartMapService } from '../../data-access/chart/chart-map.service';
import type { ChartPosition } from '../../data-access/chart/chart-types';

const DEFAULT_CENTER: ChartPosition = { lat: 42.2406, lon: -8.7207 };
const DEFAULT_ZOOM = 12;

const FIX_THRESHOLD_MS = 2000;
const STALE_THRESHOLD_MS = 5000;
const MAP_UPDATE_MS = 200;

const METERS_PER_NM = 1852;
const EARTH_RADIUS_METERS = 6371000;

const EMPTY_HUD_METRICS: ChartHudMetrics = {
  sogKn: null,
  cogDeg: null,
  hdgDeg: null,
  depthM: null,
  awsKn: null,
  awaDeg: null,
  dataAgeSec: null,
  bearingDeg: null,
  distanceNm: null,
};

interface PendingWaypoint {
  lat: number;
  lon: number;
  x: number;
  y: number;
}

const coerceNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const normalizeDegrees = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const haversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

const bearingDegrees = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLambda = toRadians(lon2 - lon1);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  return normalizeDegrees(radToDeg(Math.atan2(y, x)));
};

@Component({
  selector: 'app-chart-page',
  standalone: true,
  imports: [CommonModule, ChartHudComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart.page.html',
  styleUrls: ['./chart.page.css'],
})
export class ChartPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly store = inject(DatapointStoreService);
  private readonly waypointService = inject(WaypointService);
  private readonly chartMap = inject(ChartMapService);

  autoCenter = signal(true);
  showTrack = signal(true);
  showHeadingVector = signal(true);
  pendingWaypoint = signal<PendingWaypoint | null>(null);

  private readonly position$ = selectPosition(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly positionMap$ = this.position$.pipe(
    auditTime(MAP_UPDATE_MS),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly trackPoints$ = selectTrackPoints(this.store).pipe(
    auditTime(MAP_UPDATE_MS),
    startWith([] as TrackPoint[]),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly sog$ = selectSog(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly cog$ = selectCog(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly heading$ = selectHeading(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly depth$ = selectDepth(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly aws$ = selectAws(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly awa$ = selectAwa(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly tick$ = timer(0, 1000);

  private readonly positionValue$ = this.position$.pipe(
    map((point) => this.extractPosition(point)),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly fixState$ = combineLatest([this.position$, this.tick$]).pipe(
    map(([point]) => {
      if (!point?.timestamp) {
        return 'no-fix' as FixState;
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
    startWith('no-fix' as FixState),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly hasFix$ = this.positionValue$.pipe(
    map((value) => !!value),
    startWith(false),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly currentLat$ = this.positionValue$.pipe(
    map((value) => value?.latitude ?? null),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly currentLon$ = this.positionValue$.pipe(
    map((value) => value?.longitude ?? null),
    startWith(null),
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

  private readonly waypoints$ = this.waypointService.waypoints$.pipe(
    startWith([] as Waypoint[]),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly activeWaypoint$ = this.waypointService.activeWaypoint$.pipe(
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly activeWaypointId$ = this.activeWaypoint$.pipe(
    map((waypoint) => waypoint?.id ?? null),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly waypointNav$ = combineLatest([this.positionValue$, this.activeWaypoint$]).pipe(
    map(([position, waypoint]) => {
      if (!position || !waypoint) {
        return null;
      }

      const distanceMeters = haversineDistanceMeters(
        position.latitude,
        position.longitude,
        waypoint.lat,
        waypoint.lon,
      );

      return {
        distanceNm: distanceMeters / METERS_PER_NM,
        bearingDeg: bearingDegrees(
          position.latitude,
          position.longitude,
          waypoint.lat,
          waypoint.lon,
        ),
      };
    }),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly hudMetrics$ = combineLatest({
    sog: this.sog$,
    cog: this.cog$,
    heading: this.heading$,
    depth: this.depth$,
    aws: this.aws$,
    awa: this.awa$,
    age: this.positionAgeSeconds$,
    waypoint: this.waypointNav$,
  }).pipe(
    map(({ sog, cog, heading, depth, aws, awa, age, waypoint }) => {
      const sogValue = coerceNumber(sog?.value);
      const cogValue = coerceNumber(cog?.value);
      const headingValue = coerceNumber(heading?.value);
      const depthValue = coerceNumber(depth?.value);
      const awsValue = coerceNumber(aws?.value);
      const awaValue = coerceNumber(awa?.value);

      return {
        sogKn: sogValue !== null ? metersPerSecondToKnots(sogValue) : null,
        cogDeg: cogValue !== null ? radToDeg(cogValue) : null,
        hdgDeg: headingValue !== null ? radToDeg(headingValue) : null,
        depthM: depthValue,
        awsKn: awsValue !== null ? metersPerSecondToKnots(awsValue) : null,
        awaDeg: awaValue !== null ? radToDeg(awaValue) : null,
        dataAgeSec: age,
        bearingDeg: waypoint?.bearingDeg ?? null,
        distanceNm: waypoint?.distanceNm ?? null,
      } satisfies ChartHudMetrics;
    }),
    startWith(EMPTY_HUD_METRICS),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly viewModel$ = combineLatest({
    fixState: this.fixState$,
    hasFix: this.hasFix$,
    currentLat: this.currentLat$,
    currentLon: this.currentLon$,
    positionAgeSeconds: this.positionAgeSeconds$,
    hudMetrics: this.hudMetrics$,
    waypoints: this.waypoints$,
    activeWaypointId: this.activeWaypointId$,
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly headingMapDeg$ = combineLatest([
    this.heading$.pipe(startWith(undefined)),
    this.cog$.pipe(startWith(undefined)),
  ]).pipe(
    auditTime(MAP_UPDATE_MS),
    map(([heading, cog]) => {
      const headingRad = coerceNumber(heading?.value);
      const cogRad = coerceNumber(cog?.value);
      const rad = headingRad ?? cogRad ?? null;
      return rad !== null ? radToDeg(rad) : null;
    }),
    startWith(null),
  );

  private readonly sogMap$ = this.sog$.pipe(
    auditTime(MAP_UPDATE_MS),
    map((point) => coerceNumber(point?.value) ?? null),
    startWith(null),
  );

  private readonly positionMapSignal = toSignal(this.positionMap$, { initialValue: undefined });
  private readonly trackPointsSignal = toSignal(this.trackPoints$, {
    initialValue: [] as TrackPoint[],
  });
  private readonly headingMapSignal = toSignal(this.headingMapDeg$, { initialValue: null });
  private readonly sogMapSignal = toSignal(this.sogMap$, { initialValue: null });
  private readonly waypointsSignal = toSignal(this.waypoints$, { initialValue: [] as Waypoint[] });
  private readonly activeWaypointSignal = toSignal(this.activeWaypoint$, { initialValue: null });

  constructor() {
    effect(() => {
      const point = this.positionMapSignal();
      const positionValue = this.extractPosition(point);
      const position = this.toChartPosition(positionValue);
      const headingDeg = this.headingMapSignal();
      const sog = this.sogMapSignal();

      this.chartMap.updateVessel(position, headingDeg);
      this.chartMap.updateVector(position, headingDeg, sog, this.showHeadingVector());
    });

    effect(() => {
      this.chartMap.updateTrack(this.trackPointsSignal(), this.showTrack());
    });

    effect(() => {
      this.chartMap.setAutoCenter(this.autoCenter());
    });

    effect(() => {
      const waypoints = this.waypointsSignal();
      const active = this.activeWaypointSignal();
      const chartWaypoints = waypoints.map((waypoint) => ({
        id: waypoint.id,
        lat: waypoint.lat,
        lon: waypoint.lon,
        label: waypoint.name,
      }));
      const activeWaypoint = active
        ? { id: active.id, lat: active.lat, lon: active.lon, label: active.name }
        : null;

      this.chartMap.setWaypoints(chartWaypoints, activeWaypoint, (id) =>
        this.waypointService.setActive(id),
      );
    });

    effect(() => {
      const point = this.positionMapSignal();
      const positionValue = this.extractPosition(point);
      const position = this.toChartPosition(positionValue);
      const active = this.activeWaypointSignal();
      const activeWaypoint = active
        ? { id: active.id, lat: active.lat, lon: active.lon, label: active.name }
        : null;
      this.chartMap.updateWaypointLine(position, activeWaypoint);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const container = this.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.chartMap.initMap({
      container,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    this.chartMap.setEventHandlers({
      onClick: (event) => {
        this.pendingWaypoint.set({
          lat: event.lat,
          lon: event.lon,
          x: event.screenX,
          y: event.screenY,
        });
      },
      onMoveStart: () => this.pendingWaypoint.set(null),
      onZoomStart: () => this.pendingWaypoint.set(null),
      onRotateStart: () => this.pendingWaypoint.set(null),
    });

    requestAnimationFrame(() => this.chartMap.resize());
  }

  ngOnDestroy(): void {
    this.chartMap.destroy();
  }

  addWaypoint(pending: PendingWaypoint): void {
    this.waypointService.addWaypoint(pending.lat, pending.lon);
    this.pendingWaypoint.set(null);
  }

  closeWaypointMenu(): void {
    this.pendingWaypoint.set(null);
  }

  selectWaypoint(id: string): void {
    this.waypointService.toggleActive(id);
  }

  clearActiveWaypoint(): void {
    this.waypointService.clearActive();
  }

  centerOnVessel(): void {
    const point = this.positionMapSignal();
    const position = this.toChartPosition(this.extractPosition(point));
    if (position) {
      this.chartMap.centerOn(position);
      if (!this.autoCenter()) {
        this.autoCenter.set(true);
      }
    }
  }

  toggleAutoCenter(): void {
    this.autoCenter.update((value) => !value);
  }

  toggleTrack(): void {
    this.showTrack.update((value) => !value);
  }

  toggleHeadingVector(): void {
    this.showHeadingVector.update((value) => !value);
  }

  formatLat(lat: number | null): string {
    if (lat === null) return '--';
    const abs = Math.abs(lat);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const dir = lat >= 0 ? 'N' : 'S';
    return `${deg}deg ${min.toFixed(3)}' ${dir}`;
  }

  formatLon(lon: number | null): string {
    if (lon === null) return '--';
    const abs = Math.abs(lon);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const dir = lon >= 0 ? 'E' : 'W';
    return `${deg.toString().padStart(3, '0')}deg ${min.toFixed(3)}' ${dir}`;
  }

  private extractPosition(point: DataPoint<PositionValue> | undefined): PositionValue | null {
    if (!point?.value || !isPositionValue(point.value)) {
      return null;
    }
    return point.value;
  }

  private toChartPosition(position: PositionValue | null): ChartPosition | null {
    if (!position) {
      return null;
    }
    return { lat: position.latitude, lon: position.longitude };
  }
}
