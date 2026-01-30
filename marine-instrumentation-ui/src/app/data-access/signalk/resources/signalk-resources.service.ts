import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { APP_ENVIRONMENT, AppEnvironment } from '../../../core/config/app-environment.token';
import { ResourceMap, ResourceType } from './resource.models';

@Injectable({
  providedIn: 'root'
})
export class SignalKResourcesService {
  private readonly resourcesBases: string[];

  constructor(
    private http: HttpClient,
    @Inject(APP_ENVIRONMENT) private env: AppEnvironment
  ) {
    const base = this.env.signalKBaseUrl.replace(/\/$/, '');
    const baseNoApi = base.endsWith('/api') ? base.slice(0, -4) : base;
    const baseWithApi = base.endsWith('/api') ? base : `${base}/api`;
    const baseNoV1 = baseNoApi.replace(/\/v1$/, '');
    const v2Base = `${baseNoV1}/v2/api`;

    // Prefer v2 resources API, then v1 (non-api), then v1 api
    const ordered = [v2Base, baseNoApi, baseWithApi];
    this.resourcesBases = Array.from(new Set(ordered)).filter(Boolean);
  }

  getResources<T>(type: ResourceType): Observable<ResourceMap<T>> {
    return this.requestWithFallback<ResourceMap<T>>(
      (base) => this.http.get<ResourceMap<T>>(this.resourceCollectionUrl(base, type)),
      (err) => {
        console.error(`Error fetching resources [${type}]:`, err);
        return of({});
      }
    );
  }

  getResource<T>(type: ResourceType, id: string): Observable<T> {
    return this.requestWithFallback<T>(
      (base) => this.http.get<T>(this.resourceItemUrl(base, type, id)),
      (err) => {
        console.error(`Error fetching resource [${type}/${id}]:`, err);
        return throwError(() => err);
      }
    );
  }

  setResource<T>(type: ResourceType, id: string, data: T): Observable<void> {
    return this.requestWithFallback<void>(
      (base) => this.http.put<void>(this.resourceItemUrl(base, type, id), data),
      (err) => {
        console.error(`Error setting resource [${type}/${id}]:`, err);
        return throwError(() => err);
      }
    );
  }

  createResource<T>(type: ResourceType, data: T): Observable<{ id: string }> {
    // POST to /resources/waypoints usually returns { id: "..." }
    return this.requestWithFallback<{ id: string }>(
      (base) => this.http.post<{ id: string }>(this.resourceCollectionUrl(base, type), data),
      (err) => {
        console.error(`Error creating resource [${type}]:`, err);
        return throwError(() => err);
      }
    );
  }

  deleteResource(type: ResourceType, id: string): Observable<void> {
    return this.requestWithFallback<void>(
      (base) => this.http.delete<void>(this.resourceItemUrl(base, type, id)),
      (err) => {
        console.error(`Error deleting resource [${type}/${id}]:`, err);
        return throwError(() => err);
      }
    );
  }

  private resourceCollectionUrl(base: string, type: ResourceType): string {
    return `${base}/resources/${type}`;
  }

  private resourceItemUrl(base: string, type: ResourceType, id: string): string {
    return `${base}/resources/${type}/${id}`;
  }

  private requestWithFallback<T>(
    request: (base: string) => Observable<T>,
    finalErrorHandler: (err: unknown) => Observable<T>
  ): Observable<T> {
    const [primary, fallback] = this.resourcesBases;
    return request(primary).pipe(
      catchError(err => {
        if (fallback && this.isNotFound(err)) {
          return request(fallback).pipe(catchError(finalErrorHandler));
        }
        return finalErrorHandler(err);
      })
    );
  }

  private isNotFound(err: unknown): boolean {
    return !!err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 404;
  }
}
