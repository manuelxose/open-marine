import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { APP_ENVIRONMENT, AppEnvironment } from '../../../core/config/app-environment.token';

@Injectable({
  providedIn: 'root'
})
export class SignalKAutopilotService {
  private readonly apiV2Url: string;

  constructor(
    private http: HttpClient,
    @Inject(APP_ENVIRONMENT) private env: AppEnvironment
  ) {
    const base = this.env.signalKBaseUrl.replace(/\/$/, '');
    const baseNoApi = base.endsWith('/api') ? base.slice(0, -4) : base;
    const baseNoV1 = baseNoApi.replace(/\/v1$/, '');
    this.apiV2Url = `${baseNoV1}/v2/api`;
  }

  private putAutopilot(path: string, body: Record<string, unknown>): Observable<void> {
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.put<void>(url, body).pipe(
      catchError(err => {
        console.error(`Error putting autopilot ${path}:`, err);
        return throwError(() => err);
      })
    );
  }

  private postAutopilot(path: string): Observable<void> {
    const url = `${this.apiV2Url}/vessels/self/autopilots/_default/${path}`;
    return this.http.post<void>(url, {}).pipe(
      catchError(err => {
        console.error(`Error posting autopilot ${path}:`, err);
        return throwError(() => err);
      })
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
}
