import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError, Subscription, filter } from 'rxjs';
import { AppEnvironment } from '../../../core/config/app-environment.token';
import { EnvironmentStateService } from '../../../core/services/environment-state.service';

@Injectable({
  providedIn: 'root',
})
export class SignalKAutopilotService implements OnDestroy {
  private apiV2Url: string;
  private envSub: Subscription;

  constructor(
    private http: HttpClient,
    envState: EnvironmentStateService,
  ) {
    this.apiV2Url = this.buildApiUrl(envState.snapshot);

    // Rebuild URL whenever the environment is updated (after host detection).
    this.envSub = envState.env$
      .pipe(filter((e): e is AppEnvironment => e !== null))
      .subscribe((env) => {
        this.apiV2Url = this.buildApiUrl(env);
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
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.put<void>(url, body).pipe(
      catchError((err) => {
        console.error(`Error putting autopilot ${path}:`, err);
        return throwError(() => err);
      }),
    );
  }

  private postAutopilot(path: string, body: Record<string, unknown> = {}): Observable<void> {
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.post<void>(url, body).pipe(
      catchError((err) => {
        const message = this.errorMessage(err);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          console.warn(`Autopilot rejected ${path}: ${message}`);
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
    return this.putAutopilot('target', { value: headingRad });
  }

  setTargetWindAngle(angleRad: number): Observable<void> {
    return this.putAutopilot('target', { value: angleRad });
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
    return this.getAutopilot<{ tuning: AutopilotTuning }>('tuning');
  }

  /** Apply a partial calibration update; returns the engine's clamped result. */
  setTuning(partial: Partial<AutopilotTuning>): Observable<{ tuning: AutopilotTuning }> {
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/tuning`;
    return this.http.put<{ tuning: AutopilotTuning }>(url, partial).pipe(
      catchError((err) => {
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
