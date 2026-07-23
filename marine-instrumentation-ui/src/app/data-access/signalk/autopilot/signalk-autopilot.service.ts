import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, switchMap, throwError, Subscription, filter, tap } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { AppEnvironment } from '../../../core/config/app-environment.token';
import { EnvironmentStateService } from '../../../core/services/environment-state.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import type { DataPoint } from '../../../state/datapoints/datapoint.models';

const LOCAL_AUTOPILOT_TUNING_KEY = 'omi-autopilot:tuning';
const LOCAL_AUTOPILOT_SOURCE = 'local-autopilot-fallback';

const AUTOPILOT_PATHS = {
  state: PATHS.steering?.autopilot?.state ?? 'steering.autopilot.state',
  mode: PATHS.steering?.autopilot?.mode ?? 'steering.autopilot.mode',
  fault: PATHS.steering?.autopilot?.fault ?? 'steering.autopilot.fault',
  engaged: PATHS.steering?.autopilot?.engaged ?? 'steering.autopilot.engaged',
  targetHeadingTrue:
    PATHS.steering?.autopilot?.target?.headingTrue ?? 'steering.autopilot.target.headingTrue',
  targetWindAngleApparent:
    PATHS.steering?.autopilot?.target?.windAngleApparent ??
    'steering.autopilot.target.windAngleApparent',
  driveEnabled:
    PATHS.steering?.autopilot?.drive?.enabled ?? 'steering.autopilot.drive.enabled',
  motorCurrent:
    PATHS.steering?.autopilot?.drive?.motorCurrent ?? 'steering.autopilot.drive.motorCurrent',
} as const;

@Injectable({
  providedIn: 'root',
})
export class SignalKAutopilotService implements OnDestroy {
  private apiV2Url: string;
  private envSub: Subscription;
  private apiUnavailable = false;

  constructor(
    private http: HttpClient,
    envState: EnvironmentStateService,
    private datapointStore: DatapointStoreService,
  ) {
    this.apiV2Url = this.buildApiUrl(envState.snapshot);

    // Rebuild URL whenever the environment is updated (after host detection).
    this.envSub = envState.env$
      .pipe(filter((e): e is AppEnvironment => e !== null))
      .subscribe((env) => {
        this.apiV2Url = this.buildApiUrl(env);
        this.apiUnavailable = false;
      });
  }

  private buildApiUrl(env: AppEnvironment | null): string {
    if (!env) return '';
    const base = env.autopilotApiUrl.replace(/\/$/, '');
    return `${base}/v2/api`;
  }

  ngOnDestroy(): void {
    this.envSub?.unsubscribe();
  }

  private putAutopilot(path: string, body: Record<string, unknown>): Observable<void> {
    if (this.shouldUseLocalFallback()) {
      this.applyLocalPut(path, body);
      return of(void 0);
    }
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.put<void>(url, body).pipe(
      catchError((err) => {
        if (this.isUnavailable(err)) {
          this.apiUnavailable = true;
          this.logLocalFallback(`put autopilot ${path}`, err);
          this.applyLocalPut(path, body);
          return of(void 0);
        }
        console.error(`Error putting autopilot ${path}:`, err);
        return throwError(() => err);
      }),
    );
  }

  private postAutopilot(path: string, body: Record<string, unknown> = {}): Observable<void> {
    if (this.shouldUseLocalFallback()) {
      this.applyLocalPost(path);
      return of(void 0);
    }
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.post<void>(url, body).pipe(
      catchError((err) => {
        const message = this.errorMessage(err);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          console.warn(`Autopilot rejected ${path}: ${message}`);
        } else if (this.isUnavailable(err)) {
          this.apiUnavailable = true;
          this.logLocalFallback(`post autopilot ${path}`, err);
          this.applyLocalPost(path);
          return of(void 0);
        } else {
          console.error(`Error posting autopilot ${path}:`, err);
        }
        return throwError(() => new Error(message));
      }),
    );
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.error;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.status === 0
        ? 'autopilot API unavailable'
        : `autopilot request failed (${error.status})`;
    }
    return error instanceof Error ? error.message : 'autopilot request failed';
  }

  private getAutopilot<T>(path: string): Observable<T> {
    if (this.shouldUseLocalFallback()) {
      return throwError(() => new Error('autopilot API unavailable'));
    }
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.get<T>(url).pipe(
      catchError((err) => {
        console.error(`Error getting autopilot ${path}:`, err);
        return throwError(() => err);
      }),
    );
  }

  private mapMode(state: string): string {
    switch (state) {
      case 'wind':
        return 'wind';
      case 'route':
        return 'gps';
      case 'auto':
      default:
        return 'compass';
    }
  }

  private setMode(mode: string): Observable<void> {
    return this.putAutopilot('mode', { value: mode });
  }

  private engagePilot(): Observable<void> {
    return this.postAutopilot('engage');
  }

  private disengagePilot(): Observable<void> {
    return this.postAutopilot('disengage');
  }

  setState(state: string): Observable<void> {
    if (state === 'standby') {
      return this.disengagePilot();
    }
    const mode = this.mapMode(state);
    return this.setMode(mode).pipe(switchMap(() => this.engagePilot()));
  }

  setTargetHeading(headingRad: number): Observable<void> {
    return this.putAutopilot('target', { value: headingRad }).pipe(
      tap(() => this.publishLocal({ [AUTOPILOT_PATHS.targetHeadingTrue]: headingRad })),
    );
  }

  setTargetWindAngle(angleRad: number): Observable<void> {
    return this.putAutopilot('target', { value: angleRad }).pipe(
      tap(() => this.publishLocal({ [AUTOPILOT_PATHS.targetWindAngleApparent]: angleRad })),
    );
  }

  engage(mode: 'auto' | 'wind' | 'route'): Observable<void> {
    return this.setState(mode);
  }

  standby(): Observable<void> {
    return this.setState('standby');
  }

  /** Acknowledge and clear a latched FAULT (engine returns to standby). */
  clearFault(): Observable<void> {
    return this.postAutopilot('clearFault');
  }

  /** Relative dodge nudge, in radians (engine applies to the active setpoint). */
  dodge(deltaRad: number): Observable<void> {
    return this.putAutopilot('dodge', { value: deltaRad });
  }

  /** Read the live calibration/tuning from the engine. */
  getTuning(): Observable<{ tuning: AutopilotTuning }> {
    if (this.shouldUseLocalFallback()) {
      return of({ tuning: this.readLocalTuning() });
    }
    return this.getAutopilot<{ tuning: AutopilotTuning }>('tuning').pipe(
      catchError((err) => {
        if (this.isUnavailable(err)) {
          this.logLocalFallback('get autopilot tuning', err);
          return of({ tuning: this.readLocalTuning() });
        }
        return throwError(() => err);
      }),
    );
  }

  /** Apply a partial calibration update; returns the engine's clamped result. */
  setTuning(partial: Partial<AutopilotTuning>): Observable<{ tuning: AutopilotTuning }> {
    if (this.shouldUseLocalFallback()) {
      const tuning = { ...this.readLocalTuning(), ...partial };
      this.writeLocalTuning(tuning);
      return of({ tuning });
    }
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/tuning`;
    return this.http.put<{ tuning: AutopilotTuning }>(url, partial).pipe(
      tap((result) => this.writeLocalTuning(result.tuning)),
      catchError((err) => {
        if (this.isUnavailable(err)) {
          this.apiUnavailable = true;
          this.logLocalFallback('set autopilot tuning', err);
          const tuning = { ...this.readLocalTuning(), ...partial };
          this.writeLocalTuning(tuning);
          return of({ tuning });
        }
        console.error('Error setting autopilot tuning:', err);
        return throwError(() => err);
      }),
    );
  }

  /** Software emergency stop (latched motor cut until fault cleared). */
  emergencyStop(): Observable<void> {
    return this.postAutopilot('estop');
  }

  /** Dock-side jog test (STANDBY only). */
  driveTest(side: 'port' | 'stbd', seconds = 2): Observable<void> {
    return this.postAutopilot('drive-test', { side, seconds });
  }

  private applyLocalPut(path: string, body: Record<string, unknown>): void {
    if (path === 'mode' && typeof body['value'] === 'string') {
      const mode = body['value'];
      this.publishLocal({
        [AUTOPILOT_PATHS.mode]: mode,
        [AUTOPILOT_PATHS.fault]: 'none',
      });
    }
  }

  private applyLocalPost(path: string): void {
    switch (path) {
      case 'engage': {
        const mode = this.datapointStore.get<string>(AUTOPILOT_PATHS.mode)?.value ?? 'compass';
        this.publishLocal({
          [AUTOPILOT_PATHS.state]: this.stateForMode(mode),
          [AUTOPILOT_PATHS.mode]: mode,
          [AUTOPILOT_PATHS.engaged]: true,
          [AUTOPILOT_PATHS.driveEnabled]: false,
          [AUTOPILOT_PATHS.fault]: 'none',
          [AUTOPILOT_PATHS.motorCurrent]: 0,
        });
        break;
      }
      case 'disengage':
      case 'clearFault':
        this.publishLocal({
          [AUTOPILOT_PATHS.state]: 'standby',
          [AUTOPILOT_PATHS.engaged]: false,
          [AUTOPILOT_PATHS.driveEnabled]: false,
          [AUTOPILOT_PATHS.fault]: 'none',
          [AUTOPILOT_PATHS.motorCurrent]: 0,
        });
        break;
      case 'estop':
        this.publishLocal({
          [AUTOPILOT_PATHS.state]: 'fault',
          [AUTOPILOT_PATHS.engaged]: false,
          [AUTOPILOT_PATHS.driveEnabled]: false,
          [AUTOPILOT_PATHS.fault]: 'emergency-stop',
          [AUTOPILOT_PATHS.motorCurrent]: 0,
        });
        break;
      default:
        break;
    }
  }

  private publishLocal(values: Record<string, unknown>): void {
    const timestamp = Date.now();
    const points: DataPoint[] = Object.entries(values).map(([path, value]) => ({
      path,
      value,
      timestamp,
      source: LOCAL_AUTOPILOT_SOURCE,
    }));
    this.datapointStore.update(points);
  }

  private stateForMode(mode: string): 'auto' | 'wind' | 'route' {
    if (mode === 'wind') return 'wind';
    if (mode === 'gps') return 'route';
    return 'auto';
  }

  private isUnavailable(err: unknown): boolean {
    if (!this.apiV2Url) return true;
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private shouldUseLocalFallback(): boolean {
    return this.apiUnavailable || !this.apiV2Url || this.datapointStore.get(AUTOPILOT_PATHS.state)?.source === LOCAL_AUTOPILOT_SOURCE;
  }

  private logLocalFallback(operation: string, err: unknown): void {
    void operation;
    void err;
  }

  private readLocalTuning(): AutopilotTuning {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(LOCAL_AUTOPILOT_TUNING_KEY);
        if (raw) {
          return { ...DEFAULT_AUTOPILOT_TUNING, ...JSON.parse(raw) as Partial<AutopilotTuning> };
        }
      } catch {
        // Ignore unavailable or invalid localStorage.
      }
    }
    return { ...DEFAULT_AUTOPILOT_TUNING };
  }

  private writeLocalTuning(tuning: AutopilotTuning): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(LOCAL_AUTOPILOT_TUNING_KEY, JSON.stringify(tuning));
    } catch {
      // Ignore unavailable/quota-limited storage.
    }
  }
}

/** Runtime-tunable autopilot parameters (mirrors the engine's AutopilotTuning). */
export interface AutopilotTuning {
  kp: number;
  ki: number;
  kd: number;
  deadbandDeg: number;
  rudderLimitDeg: number;
  pwmMin: number;
  pwmMax: number;
  currentLimitA: number;
  voltageCutoff: number;
}

const DEFAULT_AUTOPILOT_TUNING: AutopilotTuning = {
  kp: 1.2,
  ki: 0,
  kd: 0.15,
  deadbandDeg: 2,
  rudderLimitDeg: 35,
  pwmMin: 0.2,
  pwmMax: 1,
  currentLimitA: 12,
  voltageCutoff: 10.8,
};
