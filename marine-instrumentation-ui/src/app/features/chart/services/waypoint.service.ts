import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: number;
}

export interface WaypointState {
  waypoints: Waypoint[];
  activeId: string | null;
}

const STORAGE_KEY = 'omi-waypoints';
const STORAGE_VERSION = 1;

export interface WaypointStoragePayload {
  version: number;
  data: WaypointState;
}

@Injectable({
  providedIn: 'root',
})
export class WaypointService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageEnabled = isPlatformBrowser(this.platformId);

  private readonly waypointsSubject = new BehaviorSubject<Waypoint[]>([]);
  private readonly activeIdSubject = new BehaviorSubject<string | null>(null);

  readonly waypoints$ = this.waypointsSubject.asObservable();
  readonly activeId$ = this.activeIdSubject.asObservable();
  readonly activeWaypoint$ = combineLatest([this.waypoints$, this.activeId$]).pipe(
    map(([waypoints, activeId]) => waypoints.find((wp) => wp.id === activeId) ?? null),
  );

  constructor() {
    if (this.storageEnabled) {
      this.restore();
    }

    this.waypoints$.subscribe(() => this.persist());
    this.activeId$.subscribe(() => this.persist());
  }

  addWaypoint(lat: number, lon: number, name?: string): Waypoint {
    const id = this.createId();
    const index = this.waypointsSubject.value.length + 1;
    const trimmed = name?.trim();
    const waypoint: Waypoint = {
      id,
      name: trimmed && trimmed.length > 0 ? trimmed : `WP ${index.toString().padStart(2, '0')}`,
      lat,
      lon,
      createdAt: Date.now(),
    };

    this.waypointsSubject.next([...this.waypointsSubject.value, waypoint]);
    this.activeIdSubject.next(id);
    return waypoint;
  }

  setActive(id: string | null): void {
    if (id && !this.waypointsSubject.value.some((wp) => wp.id === id)) {
      return;
    }
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
    const next = this.waypointsSubject.value.map((waypoint) => {
      if (waypoint.id !== id) {
        return waypoint;
      }
      if (!trimmed) {
        return waypoint;
      }
      if (waypoint.name === trimmed) {
        return waypoint;
      }
      return { ...waypoint, name: trimmed };
    });
    this.waypointsSubject.next(next);
  }

  deleteWaypoint(id: string): void {
    this.remove(id);
  }

  remove(id: string): void {
    const next = this.waypointsSubject.value.filter((wp) => wp.id !== id);
    this.waypointsSubject.next(next);
    if (this.activeIdSubject.value === id) {
      this.activeIdSubject.next(null);
    }
  }

  private persist(): void {
    if (!this.storageEnabled) {
      return;
    }
    const payload: WaypointStoragePayload = {
      version: STORAGE_VERSION,
      data: {
        waypoints: this.waypointsSubject.value,
        activeId: this.activeIdSubject.value,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private restore(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (this.isStoragePayload(parsed)) {
        if (this.isWaypointState(parsed.data)) {
          this.applyState(parsed.data);
        }
        return;
      }
      if (this.isWaypointState(parsed)) {
        this.applyState(parsed);
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private applyState(state: WaypointState): void {
    const waypoints = Array.isArray(state.waypoints) ? state.waypoints.filter(this.isWaypoint) : [];
    this.waypointsSubject.next(waypoints);
    const activeId =
      typeof state.activeId === 'string' && waypoints.some((wp) => wp.id === state.activeId)
        ? state.activeId
        : null;
    this.activeIdSubject.next(activeId);
  }

  private isWaypointState(value: unknown): value is WaypointState {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    const activeId = record['activeId'];
    return (
      Array.isArray(record['waypoints']) &&
      (activeId === null || activeId === undefined || typeof activeId === 'string')
    );
  }

  private isWaypoint(value: unknown): value is Waypoint {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      typeof record['id'] === 'string' &&
      typeof record['name'] === 'string' &&
      typeof record['lat'] === 'number' &&
      typeof record['lon'] === 'number' &&
      typeof record['createdAt'] === 'number'
    );
  }

  private isStoragePayload(value: unknown): value is WaypointStoragePayload {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      typeof record['version'] === 'number' &&
      record['data'] !== null &&
      typeof record['data'] === 'object'
    );
  }

  private createId(): string {
    return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  }
}
