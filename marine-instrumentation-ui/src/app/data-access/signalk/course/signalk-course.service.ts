import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_ENVIRONMENT, AppEnvironment } from '../../../core/config/app-environment.token';

@Injectable({
  providedIn: 'root',
})
export class SignalKCourseService {
  private readonly courseBase: string;

  constructor(
    private http: HttpClient,
    @Inject(APP_ENVIRONMENT) env: AppEnvironment,
  ) {
    const base = env.signalKBaseUrl.replace(/\/$/, '');
    const baseNoApi = base.endsWith('/api') ? base.slice(0, -4) : base;
    const baseNoV1 = baseNoApi.replace(/\/v1$/, '');
    this.courseBase = `${baseNoV1}/v2/api/vessels/self/navigation/course`;
  }

  setDestination(waypointId: string): Observable<void> {
    return this.http.put<void>(`${this.courseBase}/destination`, {
      href: `/resources/waypoints/${waypointId}`,
    });
  }

  activateRoute(routeId: string): Observable<void> {
    return this.http.put<void>(`${this.courseBase}/activeRoute`, {
      href: `/resources/routes/${routeId}`,
    });
  }

  clearCourse(): Observable<void> {
    return this.http.delete<void>(this.courseBase);
  }
}
