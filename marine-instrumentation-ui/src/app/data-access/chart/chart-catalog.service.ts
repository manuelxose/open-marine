import { Injectable, NgZone, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, EMPTY, catchError, of, switchMap, takeWhile, tap } from 'rxjs';
import {
  ChartEngineApiService,
  type EngineChartImportKind,
  type EngineChartJob,
  type EngineChartKind,
  type EngineChartSource,
  type EngineDiagnostics,
} from './chart-engine-api.service';
import { outsideZoneTicker } from '../../shared/rxjs/outside-zone-ticker';

export type ChartEngineConnectionStatus = 'unknown' | 'checking' | 'online' | 'offline' | 'error';

@Injectable({ providedIn: 'root' })
export class ChartCatalogService {
  private readonly api = inject(ChartEngineApiService);
  private readonly zone = inject(NgZone);
  private readonly chartsSubject = new BehaviorSubject<EngineChartSource[]>([]);
  private readonly onlineSubject = new BehaviorSubject<boolean>(false);
  private readonly statusSubject = new BehaviorSubject<ChartEngineConnectionStatus>('unknown');
  private readonly messageSubject = new BehaviorSubject<string>('Chart engine status unknown. Refresh when needed.');
  private readonly jobsSubject = new BehaviorSubject<EngineChartJob[]>([]);
  private readonly diagnosticsSubject = new BehaviorSubject<EngineDiagnostics | null>(null);

  readonly charts$ = this.chartsSubject.asObservable();
  readonly online$ = this.onlineSubject.asObservable();
  readonly status$ = this.statusSubject.asObservable();
  readonly message$ = this.messageSubject.asObservable();
  readonly jobs$ = this.jobsSubject.asObservable();
  readonly diagnostics$ = this.diagnosticsSubject.asObservable();

  refresh(): void {
    this.statusSubject.next('checking');
    this.messageSubject.next('Checking chart engine...');
    this.api.listCharts().pipe(
      tap(({ charts }) => {
        this.onlineSubject.next(true);
        this.statusSubject.next('online');
        this.messageSubject.next('Chart engine online.');
        this.chartsSubject.next(charts);
      }),
      catchError((error) => {
        const normalized = this.normalizeError(error);
        this.onlineSubject.next(false);
        this.statusSubject.next(normalized.status);
        this.messageSubject.next(normalized.message);
        this.chartsSubject.next([]);
        return EMPTY;
      }),
    ).subscribe();
    this.api.diagnostics().pipe(
      catchError(() => of(null)),
    ).subscribe((diagnostics) => this.diagnosticsSubject.next(diagnostics));
  }

  importChart(request: {
    kind: EngineChartImportKind;
    file: File;
    id: string;
    label: string;
    chartKind?: Extract<EngineChartKind, 'raster' | 'vector'>;
  }): void {
    this.statusSubject.next('checking');
    this.messageSubject.next('Uploading chart package...');
    this.api.importChart(request.kind, request).pipe(
      tap((job) => {
        this.onlineSubject.next(true);
        this.statusSubject.next('online');
        this.messageSubject.next('Import job queued.');
        this.upsertJob(job);
        this.watchJob(job.id);
      }),
      catchError((error) => {
        const normalized = this.normalizeError(error);
        this.onlineSubject.next(normalized.status !== 'offline' ? this.onlineSubject.value : false);
        this.statusSubject.next(normalized.status);
        this.messageSubject.next(normalized.message);
        this.upsertJob({
          id: `failed-${Date.now()}`,
          kind: request.kind,
          status: 'failed',
          chartId: request.id,
          label: request.label,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          error: normalized.message,
        });
        return EMPTY;
      }),
    ).subscribe();
  }

  deleteChart(chartId: string): void {
    this.api.deleteChart(chartId).pipe(
      tap(() => this.refresh()),
      catchError(() => EMPTY),
    ).subscribe();
  }

  private watchJob(jobId: string): void {
    outsideZoneTicker(this.zone, 1500).pipe(
      switchMap(() => this.api.getJob(jobId)),
      tap((job) => {
        this.upsertJob(job);
        if (job.status === 'completed') {
          this.messageSubject.next('Chart import completed.');
          this.refresh();
        }
        if (job.status === 'failed') {
          this.statusSubject.next('error');
          this.messageSubject.next(job.error ?? 'Chart import failed.');
        }
      }),
      takeWhile((job) => job.status === 'queued' || job.status === 'running', true),
      catchError(() => EMPTY),
    ).subscribe();
  }

  private upsertJob(job: EngineChartJob): void {
    const current = this.jobsSubject.value.filter((candidate) => candidate.id !== job.id);
    this.jobsSubject.next([job, ...current].slice(0, 8));
  }

  private normalizeError(error: unknown): { status: ChartEngineConnectionStatus; message: string } {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return {
          status: 'offline',
          message: 'Chart engine offline. On Raspberry run: sudo systemctl start omi-charts. In development run: npm run start:charts.',
        };
      }
      const body = typeof error.error === 'object' && error.error !== null
        ? error.error as { error?: string; message?: string }
        : {};
      const code = body.error ?? 'chart_engine_error';
      if (code === 'missing_external_tool') {
        return { status: 'error', message: body.message ?? 'Missing GDAL/tippecanoe tool on the chart engine host.' };
      }
      if (code === 'unsupported_format') {
        return { status: 'error', message: body.message ?? 'Unsupported chart format.' };
      }
      return { status: 'error', message: body.message ?? `Chart engine request failed (${error.status}).` };
    }
    return { status: 'error', message: error instanceof Error ? error.message : 'Chart engine request failed.' };
  }
}
