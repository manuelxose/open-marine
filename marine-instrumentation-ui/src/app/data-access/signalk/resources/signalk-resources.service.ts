import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { APP_ENVIRONMENT, AppEnvironment } from '../../../core/config/app-environment.token';
import { ResourceMap, ResourceType } from './resource.models';

const LOCAL_RESOURCE_STORAGE_PREFIX = 'omi-signalk-resources:';

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
      (err) => throwError(() => err)
    ).pipe(
      tap((resources) => this.writeLocalResources(type, resources)),
      catchError((err) => {
        this.logLocalFallback(`resources [${type}]`, err);
        return of(this.readLocalResources<T>(type));
      })
    );
  }

  getResource<T>(type: ResourceType, id: string): Observable<T> {
    return this.requestWithFallback<T>(
      (base) => this.http.get<T>(this.resourceItemUrl(base, type, id)),
      (err) => throwError(() => err)
    ).pipe(
      tap((resource) => this.upsertLocalResource(type, id, resource)),
      catchError((err) => {
        const local = this.readLocalResources<T>(type)[id];
        if (local) {
          this.logLocalFallback(`resource [${type}/${id}]`, err);
          return of(local);
        }
        return throwError(() => err);
      })
    );
  }

  setResource<T>(type: ResourceType, id: string, data: T): Observable<void> {
    return this.requestWithFallback<void>(
      (base) => this.http.put<void>(this.resourceItemUrl(base, type, id), data),
      (err) => throwError(() => err)
    ).pipe(
      tap(() => this.upsertLocalResource(type, id, data)),
      catchError((err) => {
        this.logLocalFallback(`set resource [${type}/${id}]`, err);
        this.upsertLocalResource(type, id, data);
        return of(void 0);
      })
    );
  }

  createResource<T>(type: ResourceType, data: T): Observable<{ id: string }> {
    // POST to /resources/waypoints usually returns { id: "..." }
    return this.requestWithFallback<{ id: string }>(
      (base) => this.http.post<{ id: string }>(this.resourceCollectionUrl(base, type), data),
      (err) => throwError(() => err)
    ).pipe(
      map((result) => ({ id: result?.id || this.createLocalId(type) })),
      tap((result) => this.upsertLocalResource(type, result.id, data)),
      catchError((err) => {
        this.logLocalFallback(`create resource [${type}]`, err);
        const id = this.createLocalId(type);
        this.upsertLocalResource(type, id, data);
        return of({ id });
      })
    );
  }

  deleteResource(type: ResourceType, id: string): Observable<void> {
    return this.requestWithFallback<void>(
      (base) => this.http.delete<void>(this.resourceItemUrl(base, type, id)),
      (err) => throwError(() => err)
    ).pipe(
      tap(() => this.deleteLocalResource(type, id)),
      catchError((err) => {
        this.logLocalFallback(`delete resource [${type}/${id}]`, err);
        this.deleteLocalResource(type, id);
        return of(void 0);
      })
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
    const primary = this.resourcesBases[0];
    const fallback = this.resourcesBases[1];
    if (!primary) {
      return finalErrorHandler(new Error('SignalK resources base URL not configured'));
    }
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

  private readLocalResources<T>(type: ResourceType): ResourceMap<T> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(this.localStorageKey(type));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return parsed as ResourceMap<T>;
    } catch {
      return {};
    }
  }

  private writeLocalResources<T>(type: ResourceType, resources: ResourceMap<T>): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(this.localStorageKey(type), JSON.stringify(resources ?? {}));
    } catch {
      // Ignore unavailable/quota-limited storage; Signal K remains the source of truth.
    }
  }

  private upsertLocalResource<T>(type: ResourceType, id: string, data: T): void {
    const resources = this.readLocalResources<T>(type);
    resources[id] = data;
    this.writeLocalResources(type, resources);
  }

  private deleteLocalResource(type: ResourceType, id: string): void {
    const resources = this.readLocalResources<unknown>(type);
    delete resources[id];
    this.writeLocalResources(type, resources);
  }

  private localStorageKey(type: ResourceType): string {
    return `${LOCAL_RESOURCE_STORAGE_PREFIX}${type}`;
  }

  private createLocalId(type: ResourceType): string {
    const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `local-${type}-${uuid}`;
  }

  private logLocalFallback(operation: string, err: unknown): void {
    const status = this.errorStatus(err);
    console.warn(`Signal K unavailable for ${operation}; using local resources fallback.`, status);
  }

  private errorStatus(err: unknown): string {
    if (!err || typeof err !== 'object') {
      return 'unknown error';
    }
    const maybeHttpError = err as { status?: number; statusText?: string; message?: string };
    if (maybeHttpError.status !== undefined) {
      return `${maybeHttpError.status} ${maybeHttpError.statusText ?? ''}`.trim();
    }
    return maybeHttpError.message ?? 'unknown error';
  }
}
