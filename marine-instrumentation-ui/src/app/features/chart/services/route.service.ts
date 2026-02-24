import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import type { FeatureCollection, LineString } from 'geojson';
import { WaypointService, type Waypoint } from './waypoint.service';
import { bearingDistanceNm } from '../../../state/calculations/navigation';

export interface RouteLeg {
  from: Waypoint;
  to: Waypoint;
  bearingDeg: number;
  distanceNm: number;
}

const EMPTY_LINE: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [],
};

const arraysEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

@Injectable({
  providedIn: 'root',
})
export class RouteService {
  private readonly waypointService = inject(WaypointService);
  private readonly orderSubject = new BehaviorSubject<string[]>([]);
  private waypointsCache: Waypoint[] = [];

  readonly order$ = this.orderSubject.asObservable();

  readonly orderedWaypoints$ = combineLatest([this.waypointService.waypoints$, this.order$]).pipe(
    map(([waypoints, order]) => {
      const byId = new Map(waypoints.map((wp) => [wp.id, wp]));
      const ordered = order
        .map((id) => byId.get(id))
        .filter((waypoint): waypoint is Waypoint => !!waypoint);

      const missing = waypoints.filter((wp) => !order.includes(wp.id));
      return [...ordered, ...missing];
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly activeLeg$ = combineLatest([
    this.orderedWaypoints$,
    this.waypointService.activeId$,
  ]).pipe(
    map(([waypoints, activeId]) => {
      if (!activeId) {
        return null;
      }
      const index = waypoints.findIndex((wp) => wp.id === activeId);
      if (index < 0 || index >= waypoints.length - 1) {
        return null;
      }
      const from = waypoints[index];
      const to = waypoints[index + 1];
      if (!from || !to) {
        return null;
      }
      const nav = bearingDistanceNm({ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon });
      return {
        from,
        to,
        bearingDeg: nav.bearingDeg,
        distanceNm: nav.distanceNm,
      } satisfies RouteLeg;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly routeLine$ = this.orderedWaypoints$.pipe(
    map((waypoints) => {
      if (waypoints.length < 2) {
        return EMPTY_LINE;
      }
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: waypoints.map((wp) => [wp.lon, wp.lat] as [number, number]),
            },
            properties: {},
          },
        ],
      } satisfies FeatureCollection<LineString>;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    this.waypointService.waypoints$.subscribe((waypoints) => {
      this.waypointsCache = waypoints;
      const ids = waypoints.map((wp) => wp.id);
      const current = this.orderSubject.value.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !current.includes(id));
      const next = [...current, ...missing];
      if (!arraysEqual(this.orderSubject.value, next)) {
        this.orderSubject.next(next);
      }
    });
  }

  reorderWaypoints(ids: string[]): void {
    const knownIds = this.waypointsCache.map((wp) => wp.id);
    const filtered = ids.filter((id) => knownIds.includes(id));
    const missing = knownIds.filter((id) => !filtered.includes(id));
    const next = [...filtered, ...missing];
    if (!arraysEqual(this.orderSubject.value, next)) {
      this.orderSubject.next(next);
    }
  }
}
