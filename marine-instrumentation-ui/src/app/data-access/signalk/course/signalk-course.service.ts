import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { APP_ENVIRONMENT, AppEnvironment } from '../../../core/config/app-environment.token';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { WaypointStoreService } from '../../../state/resources/waypoint-store.service';
import { RouteStoreService } from '../../../state/resources/route-store.service';
import { bearingDegrees, haversineDistanceMeters } from '../../../state/calculations/navigation';
import type { DataPoint } from '../../../state/datapoints/datapoint.models';

const LOCAL_COURSE_SOURCE = 'local-course-fallback';

@Injectable({
  providedIn: 'root',
})
export class SignalKCourseService {
  private readonly courseBase: string;
  private apiUnavailable = false;

  constructor(
    private http: HttpClient,
    private datapointStore: DatapointStoreService,
    private waypointStore: WaypointStoreService,
    private routeStore: RouteStoreService,
    @Inject(APP_ENVIRONMENT) env: AppEnvironment,
  ) {
    const base = env.signalKBaseUrl.replace(/\/$/, '');
    const baseNoApi = base.endsWith('/api') ? base.slice(0, -4) : base;
    const baseNoV1 = baseNoApi.replace(/\/v1$/, '');
    this.courseBase = `${baseNoV1}/v2/api/vessels/self/navigation/course`;
  }

  setDestination(waypointId: string): Observable<void> {
    if (this.shouldUseLocalFallback()) {
      this.applyLocalDestination(waypointId);
      return of(void 0);
    }
    return this.http.put<void>(`${this.courseBase}/destination`, {
      href: `/resources/waypoints/${waypointId}`,
    }).pipe(
      catchError((err) => {
        if (this.isUnavailable(err)) {
          this.apiUnavailable = true;
          this.applyLocalDestination(waypointId);
          console.debug('Signal K Course API unavailable; using local waypoint destination fallback.');
          return of(void 0);
        }
        return throwError(() => err);
      }),
    );
  }

  activateRoute(routeId: string): Observable<void> {
    if (this.shouldUseLocalFallback()) {
      this.applyLocalRoute(routeId);
      return of(void 0);
    }
    return this.http.put<void>(`${this.courseBase}/activeRoute`, {
      href: `/resources/routes/${routeId}`,
    }).pipe(
      catchError((err) => {
        if (this.isUnavailable(err)) {
          this.apiUnavailable = true;
          this.applyLocalRoute(routeId);
          console.debug('Signal K Course API unavailable; using local route fallback.');
          return of(void 0);
        }
        return throwError(() => err);
      }),
    );
  }

  clearCourse(): Observable<void> {
    if (this.shouldUseLocalFallback()) {
      this.applyLocalClear();
      return of(void 0);
    }
    return this.http.delete<void>(this.courseBase).pipe(
      catchError((err) => {
        if (this.isUnavailable(err)) {
          this.apiUnavailable = true;
          this.applyLocalClear();
          return of(void 0);
        }
        return throwError(() => err);
      }),
    );
  }

  private applyLocalDestination(waypointId: string): void {
    const waypoint = this.waypointStore.getWaypoint(waypointId);
    const destination = waypoint?.position;
    if (!destination) return;

    const origin = this.currentPosition();
    const bearingDeg = origin
      ? bearingDegrees({ lat: origin.latitude, lon: origin.longitude }, { lat: destination.latitude, lon: destination.longitude })
      : 0;
    const distanceM = origin
      ? haversineDistanceMeters({ lat: origin.latitude, lon: origin.longitude }, { lat: destination.latitude, lon: destination.longitude })
      : 0;

    this.publishLocal({
      [PATHS.navigation.courseGreatCircle.nextPoint.bearingTrue]: bearingDeg * Math.PI / 180,
      [PATHS.navigation.courseGreatCircle.nextPoint.distance]: distanceM,
      [PATHS.navigation.courseGreatCircle.crossTrackError]: 0,
      [PATHS.steering.autopilot.route.activeLeg]: 1,
      [PATHS.steering.autopilot.route.length]: 1,
      [PATHS.steering.autopilot.route.complete]: false,
      [PATHS.steering.autopilot.route.waypoints]: [
        ...(origin ? [{ latitude: origin.latitude, longitude: origin.longitude }] : []),
        { latitude: destination.latitude, longitude: destination.longitude },
      ],
    });
  }

  private applyLocalRoute(routeId: string): void {
    const route = this.routeStore.getRoute(routeId);
    const coords = this.extractRouteCoordinates(route?.feature);
    if (coords.length === 0) return;
    const origin = this.currentPosition();
    const first = coords[0];
    const bearingDeg = origin && first
      ? bearingDegrees({ lat: origin.latitude, lon: origin.longitude }, { lat: first.latitude, lon: first.longitude })
      : 0;
    const distanceM = origin && first
      ? haversineDistanceMeters({ lat: origin.latitude, lon: origin.longitude }, { lat: first.latitude, lon: first.longitude })
      : 0;

    this.publishLocal({
      [PATHS.navigation.courseGreatCircle.nextPoint.bearingTrue]: bearingDeg * Math.PI / 180,
      [PATHS.navigation.courseGreatCircle.nextPoint.distance]: distanceM,
      [PATHS.navigation.courseGreatCircle.crossTrackError]: 0,
      [PATHS.steering.autopilot.route.activeLeg]: coords.length > 0 ? 1 : 0,
      [PATHS.steering.autopilot.route.length]: coords.length,
      [PATHS.steering.autopilot.route.complete]: false,
      [PATHS.steering.autopilot.route.waypoints]: coords,
    });
  }

  private applyLocalClear(): void {
    this.publishLocal({
      [PATHS.navigation.courseGreatCircle.nextPoint.distance]: 0,
      [PATHS.navigation.courseGreatCircle.crossTrackError]: 0,
      [PATHS.steering.autopilot.route.activeLeg]: 0,
      [PATHS.steering.autopilot.route.length]: 0,
      [PATHS.steering.autopilot.route.complete]: false,
      [PATHS.steering.autopilot.route.waypoints]: [],
    });
  }

  private currentPosition(): { latitude: number; longitude: number } | null {
    const value = this.datapointStore.get<{ latitude: number; longitude: number }>(PATHS.navigation.position)?.value;
    if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
      return null;
    }
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) {
      return null;
    }
    return value;
  }

  private extractRouteCoordinates(feature: unknown): Array<{ latitude: number; longitude: number }> {
    if (!feature || typeof feature !== 'object') return [];
    const geometry = (feature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return [];
    const result: Array<{ latitude: number; longitude: number }> = [];
    for (const point of geometry.coordinates) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const [longitude, latitude] = point as number[];
      if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      result.push({ latitude, longitude });
    }
    return result;
  }

  private publishLocal(values: Record<string, unknown>): void {
    const timestamp = Date.now();
    const points: DataPoint[] = Object.entries(values).map(([path, value]) => ({
      path,
      value,
      timestamp,
      source: LOCAL_COURSE_SOURCE,
    }));
    this.datapointStore.update(points);
  }

  private isUnavailable(err: unknown): boolean {
    return !!err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 0;
  }

  private shouldUseLocalFallback(): boolean {
    return this.apiUnavailable;
  }
}
