import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { haversineDistanceMeters, GeoPoint } from '../../../state/calculations/navigation';

export interface AnchorWatchConfig {
  /** Anchor position as [lon, lat] */
  anchorPosition: [number, number];
  /** Safety radius in meters */
  radiusMeters: number;
  /** Timestamp when anchor watch was activated */
  activatedAt: number;
}

export interface AnchorWatchState {
  active: boolean;
  config: AnchorWatchConfig | null;
  currentDistanceMeters: number | null;
  isOutsideRadius: boolean;
  alarmActive: boolean;
}

const INITIAL_STATE: AnchorWatchState = {
  active: false,
  config: null,
  currentDistanceMeters: null,
  isOutsideRadius: false,
  alarmActive: false,
};

const STORAGE_KEY = 'omi-anchor-watch';

@Injectable({ providedIn: 'root' })
export class AnchorWatchService {
  private readonly _state$ = new BehaviorSubject<AnchorWatchState>(INITIAL_STATE);

  readonly state$: Observable<AnchorWatchState> = this._state$.asObservable();
  readonly isActive$: Observable<boolean> = this._state$.pipe(map(s => s.active));
  readonly isAlarming$: Observable<boolean> = this._state$.pipe(map(s => s.alarmActive));

  private _audioCtx: AudioContext | null = null;

  constructor() {
    this._restoreFromStorage();
  }

  /** Get current snapshot */
  get snapshot(): AnchorWatchState {
    return this._state$.value;
  }

  /**
   * Activate anchor watch at a given position with a safety radius.
   */
  activate(anchorPosition: [number, number], radiusMeters: number = 40): void {
    const config: AnchorWatchConfig = {
      anchorPosition,
      radiusMeters,
      activatedAt: Date.now(),
    };

    const state: AnchorWatchState = {
      active: true,
      config,
      currentDistanceMeters: 0,
      isOutsideRadius: false,
      alarmActive: false,
    };

    this._state$.next(state);
    this._persistToStorage(config);
  }

  /**
   * Deactivate anchor watch and clear all alarms.
   */
  deactivate(): void {
    this._state$.next(INITIAL_STATE);
    this._clearStorage();
    this._stopAudio();
  }

  /**
   * Toggle anchor watch on/off.
   * When toggling ON without a position, uses the provided fallback position.
   */
  toggle(currentVesselPosition: [number, number] | null, radiusMeters: number = 40): void {
    if (this._state$.value.active) {
      this.deactivate();
    } else if (currentVesselPosition) {
      this.activate(currentVesselPosition, radiusMeters);
    }
  }

  /**
   * Update with current vessel position. Called on every position update.
   * Calculates distance to anchor and triggers alarm if outside radius.
   */
  updateVesselPosition(vesselLon: number, vesselLat: number): void {
    const state = this._state$.value;
    if (!state.active || !state.config) return;

    const anchorPoint: GeoPoint = {
      lat: state.config.anchorPosition[1],
      lon: state.config.anchorPosition[0],
    };
    const vesselPoint: GeoPoint = { lat: vesselLat, lon: vesselLon };

    const distance = haversineDistanceMeters(anchorPoint, vesselPoint);
    const isOutside = distance > state.config.radiusMeters;
    const wasOutside = state.isOutsideRadius;

    this._state$.next({
      ...state,
      currentDistanceMeters: distance,
      isOutsideRadius: isOutside,
      alarmActive: isOutside,
    });

    // Trigger audio alarm on rising edge (entering alarm zone)
    if (isOutside && !wasOutside) {
      this._playAlarmTone();
    }
  }

  /**
   * Update the safety radius while anchor watch is active.
   */
  setRadius(radiusMeters: number): void {
    const state = this._state$.value;
    if (!state.active || !state.config) return;

    const updatedConfig: AnchorWatchConfig = {
      ...state.config,
      radiusMeters,
    };

    this._state$.next({
      ...state,
      config: updatedConfig,
      isOutsideRadius: (state.currentDistanceMeters ?? 0) > radiusMeters,
      alarmActive: (state.currentDistanceMeters ?? 0) > radiusMeters,
    });

    this._persistToStorage(updatedConfig);
  }

  // ---- Persistence ----

  private _persistToStorage(config: AnchorWatchConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage unavailable — silent fail
    }
  }

  private _clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — silent fail
    }
  }

  private _restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const config: AnchorWatchConfig = JSON.parse(raw);
      if (config.anchorPosition && config.radiusMeters) {
        this._state$.next({
          active: true,
          config,
          currentDistanceMeters: null,
          isOutsideRadius: false,
          alarmActive: false,
        });
      }
    } catch {
      this._clearStorage();
    }
  }

  // ---- Audio Alarm ----

  private _playAlarmTone(): void {
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;

      const ctx = new AudioCtor();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Two-tone alarm: high → low
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);

      this._audioCtx = ctx;
    } catch {
      // Audio not available — silent fail
    }
  }

  private _stopAudio(): void {
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }
  }
}
