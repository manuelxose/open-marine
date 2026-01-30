import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { SignalKResourcesService } from '../../data-access/signalk/resources/signalk-resources.service';
import { SKRoute } from '../../data-access/signalk/resources/resource.models';
import { bearingDistanceNm } from '../calculations/navigation';

export interface RouteLeg {
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  bearingDeg: number;
  distanceNm: number;
}

export interface Route extends SKRoute {
  id: string;
  legs?: RouteLeg[];
  totalDistanceNm?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RouteStoreService {
  private readonly _routes = new BehaviorSubject<Map<string, Route>>(new Map());
  
  public readonly routes$ = this._routes.asObservable().pipe(
    map(m => Array.from(m.values()).sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
    }))
  );

  private readonly _loading = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this._loading.asObservable();

  constructor(private skResources: SignalKResourcesService) {
    this.loadAll();
  }

  public loadAll(): void {
    this._loading.next(true);
    this.skResources.getResources<SKRoute>('routes').subscribe({
      next: (resourceMap) => {
        const map = new Map<string, Route>();
        if (resourceMap) {
            for (const [id, route] of Object.entries(resourceMap)) {
                map.set(id, this.withLegs({ ...route, id }));
            }
        }
        this._routes.next(map);
        this._loading.next(false);
      },
      error: (err) => {
        console.error('Failed to load routes', err);
        this._loading.next(false);
      }
    });
  }

  public createRoute(route: Omit<Route, 'id'>): void {
     const payload = this.stripInternal(route);
     this.skResources.createResource<SKRoute>('routes', payload).subscribe({
        next: (res) => {
            const id = res.id;
            const newRoute = this.withLegs({ ...route, id, timestamp: new Date().toISOString() });
            const current = this._routes.value;
            const next = new Map(current);
            next.set(id, newRoute);
            this._routes.next(next);
        },
        error: err => console.error('Failed to create route', err)
     });
  }

  public updateRoute(id: string, route: Partial<Route>): void {
    const current = this._routes.value;
    const existing = current.get(id);
    if (!existing) return;

    const updated = this.withLegs({ ...existing, ...route, timestamp: new Date().toISOString() });
    
    // Optimistic
    const next = new Map(current);
    next.set(id, updated);
    this._routes.next(next);

    const payload = this.stripInternal(updated);
    this.skResources.setResource<SKRoute>('routes', id, payload).subscribe({
        error: (err) => {
            console.error('Failed to update route', err);
            // Revert
            const reverted = new Map(this._routes.value);
            reverted.set(id, existing);
            this._routes.next(reverted);
        }
    });
  }

  public deleteRoute(id: string): void {
      const current = this._routes.value;
      if (!current.has(id)) return;

      const next = new Map(current);
      next.delete(id);
      this._routes.next(next);

      this.skResources.deleteResource('routes', id).subscribe({
          error: (err) => {
              console.error('Failed to delete route', err);
              // Revert
              const reverted = new Map(this._routes.value);
              const original = current.get(id);
              if (original) reverted.set(id, original);
              this._routes.next(reverted);
          }
      });
  }
  
  public getRoute(id: string): Route | undefined {
      return this._routes.value.get(id);
  }

  private withLegs(route: Route): Route {
    const coordinates = this.extractCoordinates(route.feature);
    if (coordinates.length < 2) {
      return { ...route, legs: [], totalDistanceNm: 0 };
    }

    const legs: RouteLeg[] = [];
    let totalDistanceNm = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [fromLon, fromLat] = coordinates[i];
      const [toLon, toLat] = coordinates[i + 1];
      const nav = bearingDistanceNm({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon });
      totalDistanceNm += nav.distanceNm;
      legs.push({
        from: { latitude: fromLat, longitude: fromLon },
        to: { latitude: toLat, longitude: toLon },
        bearingDeg: nav.bearingDeg,
        distanceNm: nav.distanceNm,
      });
    }

    return { ...route, legs, totalDistanceNm: route.totalDistanceNm ?? totalDistanceNm };
  }

  private extractCoordinates(feature: unknown): [number, number][] {
    if (!feature || typeof feature !== 'object') return [];
    const geometry = (feature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (!geometry) return [];

    if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      return this.coerceLine(geometry.coordinates);
    }

    if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
      const lines = geometry.coordinates.flatMap((line) => this.coerceLine(line));
      return lines;
    }

    return [];
  }

  private coerceLine(coords: unknown): [number, number][] {
    if (!Array.isArray(coords)) return [];
    const line: [number, number][] = [];
    for (const point of coords) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const [lon, lat] = point as number[];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      line.push([lon, lat]);
    }
    return line;
  }

  private stripInternal(route: Partial<Route>): SKRoute {
    const { id: _id, legs: _legs, totalDistanceNm: _totalDistanceNm, ...rest } = route as Route & {
      totalDistanceNm?: number;
    };
    return rest as SKRoute;
  }
}
