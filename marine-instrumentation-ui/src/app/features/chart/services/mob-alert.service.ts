import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
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
  private readonly zone = inject(NgZone);
  private readonly _state$ = new BehaviorSubject<MOBState>(INITIAL_STATE);
  private readonly _elapsed$ = new BehaviorSubject<string>('00:00');
  private _audioTimer: ReturnType<typeof setTimeout> | null = null;
  private _elapsedTimer: ReturnType<typeof setTimeout> | null = null;
  private _audioCtx: AudioContext | null = null;

  readonly state$: Observable<MOBState> = this._state$.asObservable();
  readonly isActive$: Observable<boolean> = this._state$.pipe(map(s => s.active));

  /** Elapsed time observable (ticks every second while MOB is active) */
  readonly elapsed$: Observable<string> = this._elapsed$.asObservable();

  get snapshot(): MOBState {
    return this._state$.value;
  }

  constructor() {
    this._restoreFromSession();
  }

  ngOnDestroy(): void {
    this._stopAudioAlarm();
    this._stopElapsedClock();
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
    this._startElapsedClock();

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
    this._stopElapsedClock();
    this._elapsed$.next('00:00');
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
        this._startElapsedClock();
      }
    } catch {
      this._clearSession();
    }
  }

  // ---- Audio Alarm (repeating beep) ----

  private _startAudioAlarm(): void {
    if (this._audioTimer !== null) {
      return;
    }
    this._playBeep(); // Immediate beep
    this.zone.runOutsideAngular(() => {
      this._audioTimer = setTimeout(() => this._audioAlarmTick(), 2000);
    });
  }

  private _stopAudioAlarm(): void {
    if (this._audioTimer !== null) {
      clearTimeout(this._audioTimer);
      this._audioTimer = null;
    }
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }
  }

  private _audioAlarmTick(): void {
    this._audioTimer = null;
    if (!this._state$.value.active) {
      return;
    }
    this._playBeep();
    this.zone.runOutsideAngular(() => {
      this._audioTimer = setTimeout(() => this._audioAlarmTick(), 2000);
    });
  }

  private _startElapsedClock(): void {
    if (this._elapsedTimer !== null) {
      return;
    }
    this._publishElapsed();
    this.zone.runOutsideAngular(() => {
      this._elapsedTimer = setTimeout(() => this._elapsedTick(), 1000);
    });
  }

  private _stopElapsedClock(): void {
    if (this._elapsedTimer !== null) {
      clearTimeout(this._elapsedTimer);
      this._elapsedTimer = null;
    }
  }

  private _elapsedTick(): void {
    this._elapsedTimer = null;
    if (!this._state$.value.active) {
      return;
    }
    this._publishElapsed();
    this.zone.runOutsideAngular(() => {
      this._elapsedTimer = setTimeout(() => this._elapsedTick(), 1000);
    });
  }

  private _publishElapsed(): void {
    const event = this._state$.value.event;
    const value = event ? this._formatElapsed(event.timestamp) : '00:00';
    this.zone.run(() => this._elapsed$.next(value));
  }

  private _formatElapsed(timestamp: number): string {
    const elapsed = Math.floor((Date.now() - timestamp) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  private _playBeep(): void {
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;

      const ctx = this._audioCtx ?? new AudioCtor();
      this._audioCtx = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
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
