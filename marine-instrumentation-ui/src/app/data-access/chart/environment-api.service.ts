import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, finalize, of, tap } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/app-environment.token';
import type { EnvironmentalLayerId } from '../../features/chart/services/chart-settings.service';

export type EnvironmentalDataState = 'observed' | 'forecast' | 'cached' | 'stale' | 'unavailable';

export interface EnvironmentalLayerDescriptor {
  id: EnvironmentalLayerId;
  label: string;
  unit: string;
  provider: string;
  renderKind: 'raster' | 'vector' | 'timeseries';
  state: EnvironmentalDataState;
  available: boolean;
  attribution: string;
  minZoom: number;
  maxZoom: number;
  tileUrl?: string;
  vectorUrl?: string;
  updatedAt?: string;
  validTimes: string[];
  message?: string;
}

export interface TideEvent {
  time: string;
  heightMeters: number;
  type: 'high' | 'low';
}

export interface VigoTideDay {
  portId: 29;
  port: 'Vigo';
  date: string;
  timezone: 'Europe/Madrid';
  state: 'forecast' | 'cached' | 'stale';
  fetchedAt: string;
  ageSeconds: number;
  events: TideEvent[];
  attribution: string;
}

@Injectable({ providedIn: 'root' })
export class EnvironmentApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENVIRONMENT);
  private readonly baseUrl = this.env.chartEngineApiUrl.replace(/\/$/, '');
  private readonly layersSubject = new BehaviorSubject<EnvironmentalLayerDescriptor[]>([]);
  private readonly loadingSubject = new BehaviorSubject(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly layers$ = this.layersSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  refresh() {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    return this.http.get<{ layers: EnvironmentalLayerDescriptor[] }>(`${this.baseUrl}/environment/catalog`).pipe(
      tap(({ layers }) => this.layersSubject.next(layers.map((layer) => this.normalize(layer)))),
      catchError((error: unknown) => {
        this.errorSubject.next(error instanceof Error ? error.message : 'Environmental service unavailable');
        this.layersSubject.next([]);
        return of({ layers: [] as EnvironmentalLayerDescriptor[] });
      }),
      finalize(() => this.loadingSubject.next(false)),
    );
  }

  getVigoTides(date: string) {
    return this.http.get<VigoTideDay>(`${this.baseUrl}/tides/vigo`, {
      params: new HttpParams().set('date', date),
    });
  }

  private normalize(layer: EnvironmentalLayerDescriptor): EnvironmentalLayerDescriptor {
    const replaceHost = (url: string) => url.replace(/^https?:\/\/localhost:8088/i, this.baseUrl);
    return {
      ...layer,
      ...(layer.tileUrl ? { tileUrl: replaceHost(layer.tileUrl) } : {}),
      ...(layer.vectorUrl ? { vectorUrl: replaceHost(layer.vectorUrl) } : {}),
    };
  }
}
