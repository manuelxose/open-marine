import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, map } from 'rxjs';
import { haversineDistanceMeters, bearingDegrees, GeoPoint, METERS_PER_NM } from '../../../state/calculations/navigation';

export interface MOBEvent {
  /** MOB position as [lon, lat] */
  position: [number, number];
  /** Timestamp when MOB was triggered */
  timestamp: number;
  /** Auto-generated waypoint id */
  waypointId: string;
}

export interface MOBState {
  active: boolean;
  event: MOBEvent | null;
  /** Distance from vessel to MOB in NM */
  distanceNm: number | null;
  /** Bearing from vessel to MOB in degrees */
  bearingDeg: number | null;
}

const INITIAL_STATE: MOBState = {
  active: false,
  event: null,
  distanceNm: null,
  bearingDeg: null,
};

const SESSION_KEY = 'omi-mob-event';

@Injectable({ providedIn: 'root' })
export class MOBAlertService implements OnDestroy {
  private readonly _state$ = new BehaviorSubject<MOBState>(INITIAL_STATE);
  private _audioInterval: ReturnType<typeof setInterval> | null = null;
  private _audioCtx: AudioContext | null = null;

  readonly state$: Observable<MOBState> = this._state$.asObservable();
  readonly isActive$: Observable<boolean> = this._state$.pipe(map(s => s.active));

  /** Elapsed time observable (ticks every second while MOB is active) */
  readonly elapsed$: Observable<string> = interval(1000).pipe(
    map(() => {
      const event = this._state$.value.event;
      if (!event) return '00:00';
      const elapsed = Math.floor((Date.now() - event.timestamp) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
    }),
  );

  get snapshot(): MOBState {
    return this._state$.value;
  }

  constructor() {
    this._restoreFromSession();
  }

  ngOnDestroy(): void {
    this._stopAudioAlarm();
  }

  /**
   * Trigger MOB at the current vessel position.
   */
  trigger(vesselPosition: [number, number]): void {
    // If already active, ignore (must cancel first)
    if (this._state$.value.active) return;

    const event: MOBEvent = {
      position: vesselPosition,
      timestamp: Date.now(),
      waypointId: `mob-${Date.now()}`,
    };

    this._state$.next({
      active: true,
      event,
      distanceNm: 0,
      bearingDeg: null,
    });

    this._persistToSession(event);
    this._startAudioAlarm();

    // eslint-disable-next-line no-console
    console.error(`🚨 MOB TRIGGERED at [${vesselPosition}] — ${new Date().toISOString()}`);
  }

  /**
   * Cancel MOB alert (false alarm or MOB recovered).
   */
  cancel(): void {
    this._state$.next(INITIAL_STATE);
    this._clearSession();
    this._stopAudioAlarm();
  }

  /**
   * Update with current vessel position to compute distance/bearing to MOB.
   */
  updateVesselPosition(vesselLon: number, vesselLat: number): void {
    const state = this._state$.value;
    if (!state.active || !state.event) return;

    const vessel: GeoPoint = { lat: vesselLat, lon: vesselLon };
    const mob: GeoPoint = { lat: state.event.position[1], lon: state.event.position[0] };

    const distanceMeters = haversineDistanceMeters(vessel, mob);
    const bearing = bearingDegrees(vessel, mob);

    this._state$.next({
      ...state,
      distanceNm: distanceMeters / METERS_PER_NM,
      bearingDeg: Math.round(bearing),
    });
  }

  // ---- Session Persistence ----

  private _persistToSession(event: MOBEvent): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(event));
    } catch {
      // Silent fail
    }
  }

  private _clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Silent fail
    }
  }

  private _restoreFromSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const event: MOBEvent = JSON.parse(raw);
      if (event.position && event.timestamp) {
        this._state$.next({
          active: true,
          event,
          distanceNm: null,
          bearingDeg: null,
        });
        this._startAudioAlarm();
      }
    } catch {
      this._clearSession();
    }
  }

  // ---- Audio Alarm (repeating beep) ----

  private _startAudioAlarm(): void {
    this._playBeep(); // Immediate beep
    this._audioInterval = setInterval(() => this._playBeep(), 2000);
  }

  private _stopAudioAlarm(): void {
    if (this._audioInterval) {
      clearInterval(this._audioInterval);
      this._audioInterval = null;
    }
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }
  }

  private _playBeep(): void {
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;

      const ctx = new AudioCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      this._audioCtx = ctx;
    } catch {
      // Audio not available
    }
  }
}
