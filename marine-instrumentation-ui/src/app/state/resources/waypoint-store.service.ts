import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { SignalKResourcesService } from '../../data-access/signalk/resources/signalk-resources.service';
import { SKWaypoint } from '../../data-access/signalk/resources/resource.models';

export interface Waypoint extends SKWaypoint {
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class WaypointStoreService {
  private readonly _waypoints = new BehaviorSubject<Map<string, Waypoint>>(new Map());
  
  public readonly waypoints$ = this._waypoints.asObservable().pipe(
    map(m => Array.from(m.values()).sort((a, b) => {
        // Sort by timestamp descending if available, else name
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
    this.skResources.getResources<SKWaypoint>('waypoints').subscribe({
      next: (resourceMap) => {
        const map = new Map<string, Waypoint>();
        if (resourceMap) {
            for (const [id, wp] of Object.entries(resourceMap)) {
                const normalized = this.normalizeWaypoint({ ...wp, id });
                map.set(id, normalized);
            }
        }
        this._waypoints.next(map);
        this._loading.next(false);
      },
      error: (err) => {
        console.error('Failed to load waypoints', err);
        this._loading.next(false);
      }
    });
  }

  public createWaypoint(wp: Omit<Waypoint, 'id'>): Observable<string> {
     // For creation, we might generate a UUID if the server expects us to PUT at a specific ID, 
     // or POST to collection. 
     // Signal K Resources API: POST to /resources/waypoints, returns { id: '...' }
     const payloads = this.buildWaypointPayloadVariants(wp);

     return this.attemptCreateWaypoint(payloads).pipe(
        map(res => res.id),
        tap((id) => {
            const newWp = { ...wp, id, timestamp: new Date().toISOString() };
            const current = this._waypoints.value;
            const next = new Map(current);
            next.set(id, newWp);
            this._waypoints.next(next);
        }),
        catchError((err) => {
            console.error('Failed to create waypoint', err);
            return throwError(() => err);
        })
     );
  }

  public updateWaypoint(id: string, wp: Partial<Waypoint>): void {
    const current = this._waypoints.value;
    const existing = current.get(id);
    if (!existing) return;

    const updated = { ...existing, ...wp, timestamp: new Date().toISOString() };
    
    // Optimistic local update (or wait for confirmation?)
    // Let's do optimistic for better UI, revert on error.
    const next = new Map(current);
    next.set(id, updated);
    this._waypoints.next(next);

    const payloads = this.buildWaypointPayloadVariants(updated);
    this.attemptSetWaypoint(id, payloads).subscribe({
      error: (err) => {
        console.error('Failed to update waypoint', err);
        // Revert
        const reverted = new Map(this._waypoints.value);
        reverted.set(id, existing); // Put back original
        this._waypoints.next(reverted);
      }
    });
  }

  public deleteWaypoint(id: string): void {
      const current = this._waypoints.value;
      if (!current.has(id)) return;

      const next = new Map(current);
      next.delete(id);
      this._waypoints.next(next);

      this.skResources.deleteResource('waypoints', id).subscribe({
          error: (err) => {
              console.error('Failed to delete waypoint', err);
              // Revert
              const reverted = new Map(this._waypoints.value);
              const original = current.get(id);
              if (original) reverted.set(id, original);
              this._waypoints.next(reverted);
          }
      });
  }

  public getWaypoint(id: string): Waypoint | undefined {
      return this._waypoints.value.get(id);
  }

  private buildWaypointPayload(wp: Partial<Waypoint>): SKWaypoint {
    const latitude = wp.position?.latitude;
    const longitude = wp.position?.longitude;
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

    return {
      name: wp.name,
      description: wp.description,
      ...(hasCoords
        ? {
            position: { latitude: latitude as number, longitude: longitude as number },
            feature: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              properties: {
                name: wp.name,
                description: wp.description,
              },
            },
          }
        : {}),
    };
  }

  private buildWaypointPayloadVariants(wp: Partial<Waypoint>): SKWaypoint[] {
    const base = this.buildWaypointPayload(wp);
    const variants: SKWaypoint[] = [];

    if (base.feature) {
      const featureOnly = { ...base } as Partial<SKWaypoint>;
      delete featureOnly.position;
      variants.push(featureOnly as SKWaypoint);

      const featureOnlyMinimal = { feature: base.feature } as SKWaypoint;
      variants.push(featureOnlyMinimal);
    }

    if (base.position) {
      const positionOnly = { ...base } as Partial<SKWaypoint>;
      delete positionOnly.feature;
      variants.push(positionOnly as SKWaypoint);

      const positionOnlyMinimal = { position: base.position } as SKWaypoint;
      variants.push(positionOnlyMinimal);
    }

    variants.push(base);

    const seen = new Set<string>();
    return variants.filter((variant) => {
      const key = JSON.stringify(variant);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private attemptCreateWaypoint(payloads: SKWaypoint[], index = 0): Observable<{ id: string }> {
    const payload = payloads[index];
    return this.skResources.createResource<SKWaypoint>('waypoints', payload).pipe(
      catchError((err) => {
        if (this.isBadRequest(err) && index < payloads.length - 1) {
          return this.attemptCreateWaypoint(payloads, index + 1);
        }
        return throwError(() => err);
      })
    );
  }

  private attemptSetWaypoint(id: string, payloads: SKWaypoint[], index = 0): Observable<void> {
    const payload = payloads[index];
    return this.skResources.setResource<SKWaypoint>('waypoints', id, payload).pipe(
      catchError((err) => {
        if (this.isBadRequest(err) && index < payloads.length - 1) {
          return this.attemptSetWaypoint(id, payloads, index + 1);
        }
        return throwError(() => err);
      })
    );
  }

  private normalizeWaypoint(wp: Waypoint): Waypoint {
    if (!wp.position) {
      const position = this.positionFromFeature(wp.feature);
      if (position) {
        return { ...wp, position };
      }
    }
    return wp;
  }

  private positionFromFeature(feature: unknown): { latitude: number; longitude: number } | null {
    if (!feature || typeof feature !== 'object') return null;
    const geometry = (feature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
    const [longitude, latitude] = geometry.coordinates as number[];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }

  private isBadRequest(err: unknown): boolean {
    return !!err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 400;
  }
}
