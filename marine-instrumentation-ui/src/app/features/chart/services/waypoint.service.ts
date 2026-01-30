import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { WaypointStoreService, Waypoint as ResourceWaypoint } from '../../../state/resources/waypoint-store.service';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: number;
}

const ACTIVE_STORAGE_KEY = 'omi-waypoints-active';

@Injectable({
  providedIn: 'root',
})
export class WaypointService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageEnabled = isPlatformBrowser(this.platformId);
  private readonly waypointStore = inject(WaypointStoreService);

  private readonly activeIdSubject = new BehaviorSubject<string | null>(null);
  private waypointsCount = 0;

  readonly waypoints$ = this.waypointStore.waypoints$.pipe(
    map((waypoints) => waypoints
      .map((wp) => this.mapResourceWaypoint(wp))
      .filter((wp): wp is Waypoint => !!wp)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly activeId$ = this.activeIdSubject.asObservable();
  readonly activeWaypoint$ = combineLatest([this.waypoints$, this.activeId$]).pipe(
    map(([waypoints, activeId]) => waypoints.find((wp) => wp.id === activeId) ?? null),
  );

  constructor() {
    if (this.storageEnabled) {
      this.restoreActive();
    }

    this.waypoints$.subscribe((waypoints) => {
      this.waypointsCount = waypoints.length;
      if (waypoints.length === 0) {
        return;
      }
      const activeId = this.activeIdSubject.value;
      if (activeId && !waypoints.some((wp) => wp.id === activeId)) {
        this.activeIdSubject.next(null);
      }
    });

    this.activeId$.subscribe(() => this.persistActive());
  }

  addWaypoint(lat: number, lon: number, name?: string): void {
    const index = this.waypointsCount + 1;
    const trimmed = name?.trim();
    const waypointName = trimmed && trimmed.length > 0 ? trimmed : `WP ${index.toString().padStart(2, '0')}`;
    this.waypointStore.createWaypoint({
      name: waypointName,
      position: { latitude: lat, longitude: lon },
      timestamp: new Date().toISOString(),
    }).subscribe({
      next: (id) => this.activeIdSubject.next(id),
      error: (err) => console.error('Failed to create waypoint', err),
    });
  }

  setActive(id: string | null): void {
    // Ideally verify ID exists, but we trust the UI for now
    this.activeIdSubject.next(id);
  }

  toggleActive(id: string): void {
    if (this.activeIdSubject.value === id) {
      this.activeIdSubject.next(null);
      return;
    }
    this.setActive(id);
  }

  clearActive(): void {
    this.activeIdSubject.next(null);
  }

  renameWaypoint(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    this.waypointStore.updateWaypoint(id, { name: trimmed });
  }

  deleteWaypoint(id: string): void {
    this.remove(id);
  }

  remove(id: string): void {
    if (this.activeIdSubject.value === id) {
      this.activeIdSubject.next(null);
    }
    this.waypointStore.deleteWaypoint(id);
  }

  private persistActive(): void {
    if (!this.storageEnabled) {
      return;
    }
    const activeId = this.activeIdSubject.value;
    if (activeId) {
      localStorage.setItem(ACTIVE_STORAGE_KEY, activeId);
    } else {
      localStorage.removeItem(ACTIVE_STORAGE_KEY);
    }
  }

  private restoreActive(): void {
    const saved = localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (typeof saved === 'string' && saved.length > 0) {
      this.activeIdSubject.next(saved);
    }
  }

  private mapResourceWaypoint(resource: ResourceWaypoint): Waypoint | null {
    if (!resource) {
      return null;
    }
    const position = resource.position ?? this.positionFromFeature(resource.feature);
    if (!position) {
      return null;
    }
    const { latitude, longitude } = position;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    const createdAt = resource.timestamp ? new Date(resource.timestamp).getTime() : Date.now();
    return {
      id: resource.id,
      name: resource.name ?? 'Waypoint',
      lat: latitude,
      lon: longitude,
      createdAt,
    };
  }

  private positionFromFeature(feature: unknown): { latitude: number; longitude: number } | null {
    if (!feature || typeof feature !== 'object') return null;
    const geometry = (feature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
    const [longitude, latitude] = geometry.coordinates as number[];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }
}
