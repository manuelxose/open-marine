import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  OperatorFunction,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  timer,
} from 'rxjs';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { PreferencesService } from '../../services/preferences.service';
import { SignalKClientService } from '../../data-access/signalk/signalk-client.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import {
  isPositionValue,
  selectAwa,
  selectAws,
  selectBatteryCurrent,
  selectBatteryVoltage,
  selectCog,
  selectDepth,
  selectHeading,
  selectPosition,
  selectSeries,
  selectSog,
  selectTws,
  selectTwd,
  selectTwa,
  type PositionValue,
} from '../../state/datapoints/datapoint.selectors';
import { PATHS } from '@omi/marine-data-contract';
import type { DataPoint } from '../../state/datapoints/datapoint.models';
import {
  formatAngleDegrees,
  formatCoordinate,
  formatCurrent,
  formatDepth,
  formatNumber,
  formatPower,
  formatSpeed,
  formatVoltage,
} from '../../core/formatting/formatters';
import type {
  CriticalStripItemVm,
  CriticalStripVm,
  DashboardStatusVm,
  DashboardMetricVm,
  DepthPanelVm,
  NavigationPanelVm,
  PowerPanelVm,
  StatusTone,
  SystemPanelVm,
  WindPanelVm,
} from './types/dashboard-vm';

const FIX_THRESHOLD_MS = 2000;
const STALE_THRESHOLD_MS = 5000;

const coerceNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const metric = (label: string, formatted: { value: string; unit: string }): DashboardMetricVm => ({
  label,
  value: formatted.value,
  unit: formatted.unit,
});

const stripItem = (
  label: string,
  formatted: { value: string; unit: string },
  tone: CriticalStripItemVm['tone'],
): CriticalStripItemVm => ({
  label,
  value: formatted.value,
  unit: formatted.unit,
  tone,
});

@Injectable({
  providedIn: 'root',
})
export class DashboardFacadeService {
  private readonly store = inject(DatapointStoreService);
  private readonly preferences = inject(PreferencesService);
  private readonly signalK = inject(SignalKClientService);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly tick$ = timer(0, 1000);

  readonly errorMessage$ = this.errorSubject.asObservable();

  private readonly prefs$ = this.preferences.preferences$.pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly position$ = selectPosition(this.store).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly positionValue$ = this.position$.pipe(
    map((point) => this.extractPosition(point)),
    startWith(null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly sog$ = selectSog(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly cog$ = selectCog(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly heading$ = selectHeading(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly depth$ = selectDepth(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly aws$ = selectAws(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly awa$ = selectAwa(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly tws$ = selectTws(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly twd$ = selectTwd(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly twa$ = selectTwa(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly voltage$ = selectBatteryVoltage(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly current$ = selectBatteryCurrent(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly sogSeries$ = selectSeries(this.store, PATHS.navigation.speedOverGround, 120).pipe(startWith([]));
  private readonly depthSeries$ = selectSeries(this.store, PATHS.environment.depth.belowTransducer, 120).pipe(startWith([]));
  private readonly windSeries$ = selectSeries(this.store, PATHS.environment.wind.speedApparent, 120).pipe(startWith([]));
  private readonly voltageSeries$ = selectSeries(this.store, PATHS.electrical.batteries.house.voltage, 120).pipe(startWith([]));

  private readonly hasData$ = this.store.updatesProcessed$.pipe(
    map((count) => count > 0),
    startWith(this.store.updatesProcessedSnapshot > 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly isLoading$ = this.hasData$.pipe(
    map((hasData) => !hasData),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly online$ = this.networkStatus.online$.pipe(
    startWith(this.networkStatus.snapshot),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly connected$ = this.signalK.connected$.pipe(
    startWith(false),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly isCompact$ = this.prefs$.pipe(
    map((prefs) => prefs.density === 'compact'),
    startWith(this.preferences.snapshot.density === 'compact'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly fixLabel$ = combineLatest([this.position$, this.tick$]).pipe(
    map(([point]) => {
      if (!point?.timestamp) {
        return 'dashboard.status.nofix';
      }
      const ageMs = Date.now() - point.timestamp;
      if (ageMs > STALE_THRESHOLD_MS) {
        return 'dashboard.status.stale';
      }
      if (ageMs <= FIX_THRESHOLD_MS) {
        return 'dashboard.status.fix';
      }
      return 'dashboard.status.fix';
    }),
    startWith('dashboard.status.nofix'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly criticalStripVm$ = combineLatest({
    sog: this.sog$,
    heading: this.heading$,
    depth: this.depth$,
    aws: this.aws$,
    awa: this.awa$,
    voltage: this.voltage$,
    prefs: this.prefs$,
    isLoading: this.isLoading$,
  }).pipe(
    map(({ sog, heading, depth, aws, awa, voltage, prefs, isLoading }) => {
      const sogMetric = formatSpeed(coerceNumber(sog?.value), prefs.speedUnit);
      const headingMetric = formatAngleDegrees(coerceNumber(heading?.value));
      const depthMetric = formatDepth(coerceNumber(depth?.value), prefs.depthUnit);
      const awsMetric = formatSpeed(coerceNumber(aws?.value), prefs.speedUnit);
      const voltageMetric = formatVoltage(coerceNumber(voltage?.value));

      const depthValue = coerceNumber(depth?.value);
      const depthTone =
        depthValue === null
          ? 'neutral'
          : depthValue <= prefs.shallowThreshold
            ? 'alert'
            : 'ok';

      const voltageValue = coerceNumber(voltage?.value);
      const voltageTone =
        voltageValue === null ? 'neutral' : voltageValue < 12 ? 'warn' : 'ok';

      return {
        items: [
          stripItem('dashboard.metrics.sog', sogMetric, 'neutral'),
          stripItem('dashboard.metrics.hdg', headingMetric, 'neutral'),
          stripItem('dashboard.metrics.depth', depthMetric, depthTone),
          stripItem('dashboard.metrics.aws', awsMetric, 'neutral'),
          stripItem('dashboard.metrics.awa', { value: formatAngleDegrees(coerceNumber(awa?.value)).value, unit: "°" }, 'neutral'),
          stripItem('dashboard.metrics.batt', voltageMetric, voltageTone),
        ],
        isLoading,
      } satisfies CriticalStripVm;
    }),
    this.withFallback<CriticalStripVm>({ items: [], isLoading: true }, 'critical strip'),
    startWith({ items: [], isLoading: true } satisfies CriticalStripVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly navigationVm$ = combineLatest({
    fixLabel: this.fixLabel$,
    position: this.positionValue$,
    sog: this.sog$,
    cog: this.cog$,
    heading: this.heading$,
    sogSeries: this.sogSeries$,
    prefs: this.prefs$,
    isLoading: this.isLoading$,
  }).pipe(
    map(({ fixLabel, position, sog, cog, heading, sogSeries, prefs, isLoading }) => {
      const sogMetric = formatSpeed(coerceNumber(sog?.value), prefs.speedUnit);
      const cogMetric = formatAngleDegrees(coerceNumber(cog?.value));
      const headingMetric = formatAngleDegrees(coerceNumber(heading?.value));
      const statusTone: StatusTone =
        fixLabel === 'dashboard.status.fix' ? 'ok' : fixLabel === 'dashboard.status.stale' ? 'warn' : 'alert';

      return {
        title: 'dashboard.panels.navigation',
        fixLabel,
        statusTone,
        position: {
          lat: formatCoordinate(position?.latitude ?? null, 'lat'),
          lon: formatCoordinate(position?.longitude ?? null, 'lon'),
        },
        metrics: [
          { ...metric('dashboard.metrics.sog', sogMetric), series: sogSeries },
          metric('dashboard.metrics.cog', cogMetric),
          metric('dashboard.metrics.hdg', headingMetric),
        ],
        isLoading,
      } satisfies NavigationPanelVm;
    }),
    startWith({
      title: 'dashboard.panels.navigation',
      fixLabel: 'dashboard.status.nofix',
      statusTone: 'alert',
      position: { lat: '--', lon: '--' },
      metrics: [],
      isLoading: true,
    } satisfies NavigationPanelVm),
    this.withFallback<NavigationPanelVm>(
      {
        title: 'dashboard.panels.navigation',
        fixLabel: 'dashboard.status.nofix',
        statusTone: 'alert',
        position: { lat: '--', lon: '--' },
        metrics: [],
        isLoading: false,
      },
      'navigation panel',
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly windVm$ = combineLatest({
    aws: this.aws$,
    awa: this.awa$,
    tws: this.tws$,
    twd: this.twd$,
    twa: this.twa$,
    series: this.windSeries$,
    prefs: this.prefs$,
    isLoading: this.isLoading$,
  }).pipe(
    map(({ aws, awa, tws, twd, twa, series, prefs, isLoading }) => ({
      title: 'dashboard.panels.wind',
      metrics: [
        { ...metric('dashboard.metrics.aws', formatSpeed(coerceNumber(aws?.value), prefs.speedUnit)), series },
        metric('dashboard.metrics.awa', formatAngleDegrees(coerceNumber(awa?.value))),
        metric('dashboard.metrics.tws', formatSpeed(coerceNumber(tws?.value), prefs.speedUnit)),
        metric('dashboard.metrics.twd', formatAngleDegrees(coerceNumber(twd?.value))),
        metric('dashboard.metrics.twa', formatAngleDegrees(coerceNumber(twa?.value))),
      ],
      primarySeries: series,
      isLoading,
    }) satisfies WindPanelVm),
    startWith({ title: 'dashboard.panels.wind', metrics: [], isLoading: true } satisfies WindPanelVm),
    this.withFallback<WindPanelVm>({ title: 'dashboard.panels.wind', metrics: [], isLoading: false }, 'wind panel'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly depthVm$ = combineLatest({
    depth: this.depth$,
    series: this.depthSeries$,
    prefs: this.prefs$,
    isLoading: this.isLoading$,
  }).pipe(
    map(({ depth, series, prefs, isLoading }) => ({
      title: 'dashboard.panels.depth',
      metrics: [
        {
          ...metric('dashboard.metrics.depth', formatDepth(coerceNumber(depth?.value), prefs.depthUnit)),
          series,
        },
      ],
      series,
      isLoading,
    }) satisfies DepthPanelVm),
    startWith({ title: 'dashboard.panels.depth', metrics: [], isLoading: true } satisfies DepthPanelVm),
    this.withFallback<DepthPanelVm>({ title: 'dashboard.panels.depth', metrics: [], isLoading: false }, 'depth panel'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly powerVm$ = combineLatest({
    voltage: this.voltage$,
    current: this.current$,
    series: this.voltageSeries$,
    isLoading: this.isLoading$,
  }).pipe(
    map(({ voltage, current, series, isLoading }) => {
      const volts = coerceNumber(voltage?.value);
      const amps = coerceNumber(current?.value);
      const power = volts !== null && amps !== null ? volts * amps : null;
      return {
        title: 'dashboard.panels.power',
        metrics: [
          { ...metric('dashboard.metrics.voltage', formatVoltage(volts)), series },
          metric('dashboard.metrics.current', formatCurrent(amps)),
          metric('dashboard.metrics.power', formatPower(power)),
        ],
        series,
        isLoading,
      } satisfies PowerPanelVm;
    }),
    startWith({ title: 'dashboard.panels.power', metrics: [], isLoading: true } satisfies PowerPanelVm),
    this.withFallback<PowerPanelVm>({ title: 'dashboard.panels.power', metrics: [], isLoading: false }, 'power panel'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly systemVm$ = combineLatest({
    lastUpdate: this.store.lastUpdate$,
    updates: this.store.updatesProcessed$,
    tick: this.tick$,
    online: this.online$,
    connected: this.connected$,
    hasData: this.hasData$,
    isLoading: this.isLoading$,
  }).pipe(
    map(({ lastUpdate, updates, online, connected, hasData, isLoading }) => {
      const ageSeconds = lastUpdate ? Math.max(0, (Date.now() - lastUpdate) / 1000) : null;
      const ageLabel = formatNumber(ageSeconds, 0);
      const updatesLabel = formatNumber(updates, 0);
      const isStale = ageSeconds !== null && ageSeconds * 1000 > STALE_THRESHOLD_MS;
      const statusTone: StatusTone = !online || !connected ? 'alert' : isStale ? 'warn' : hasData ? 'ok' : 'neutral';
      const status = !online
        ? 'dashboard.status.offline'
        : !connected
          ? 'dashboard.status.disconnected'
          : !hasData
            ? 'dashboard.status.waiting'
            : isStale
              ? 'dashboard.status.stale'
              : 'dashboard.status.streaming';

      return {
        title: 'dashboard.panels.system',
        status,
        statusTone,
        lines: [
          { labelKey: 'dashboard.system.updates_processed', value: updatesLabel },
          { labelKey: 'dashboard.system.last_update', value: `${ageLabel}s` },
        ],
        isLoading,
      } satisfies SystemPanelVm;
    }),
    startWith({
      title: 'dashboard.panels.system',
      status: 'dashboard.status.waiting',
      statusTone: 'neutral',
      lines: [],
      isLoading: true,
    } satisfies SystemPanelVm),
    this.withFallback<SystemPanelVm>(
      {
        title: 'dashboard.panels.system',
        status: 'dashboard.status.error',
        statusTone: 'alert',
        lines: [],
        isLoading: false,
      },
      'system panel',
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly statusVm$ = combineLatest({
    online: this.online$,
    connected: this.connected$,
    hasData: this.hasData$,
    lastUpdate: this.store.lastUpdate$,
    tick: this.tick$,
  }).pipe(
    map(({ online, connected, hasData, lastUpdate }) => {
      const ageSeconds = lastUpdate ? Math.max(0, (Date.now() - lastUpdate) / 1000) : null;
      const ageLabel = ageSeconds !== null ? `${formatNumber(ageSeconds, 0)}s` : '--';
      const isStale = ageSeconds !== null && ageSeconds * 1000 > STALE_THRESHOLD_MS;
      const isOffline = !online;
      const isDisconnected = online && !connected;
      const isLoading = !hasData;
      const isLive = online && connected && hasData && !isStale;

      let label = 'LIVE';
      let detail = `Last update ${ageLabel} ago`;
      let tone: StatusTone = 'ok';

      if (isOffline) {
        label = 'OFFLINE';
        detail = 'No network connection';
        tone = 'alert';
      } else if (isDisconnected) {
        label = 'DISCONNECTED';
        detail = 'Signal K websocket unavailable';
        tone = 'alert';
      } else if (isLoading) {
        label = 'CONNECTING';
        detail = 'Waiting for first data update';
        tone = 'neutral';
      } else if (isStale) {
        label = 'STALE';
        detail = `Last update ${ageLabel} ago`;
        tone = 'warn';
      }

      return {
        label,
        detail,
        tone,
        isOffline,
        isStale,
        isLoading,
        isVisible: !isLive,
      } satisfies DashboardStatusVm;
    }),
    startWith({
      label: 'CONNECTING',
      detail: 'Waiting for first data update',
      tone: 'neutral',
      isOffline: false,
      isStale: false,
      isLoading: true,
      isVisible: true,
    } satisfies DashboardStatusVm),
    this.withFallback<DashboardStatusVm>(
      {
        label: 'STATUS ERROR',
        detail: 'Unable to read connection status',
        tone: 'alert',
        isOffline: false,
        isStale: false,
        isLoading: false,
        isVisible: true,
      },
      'status banner',
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  toggleDensity(): void {
    this.preferences.toggleDensity();
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  private extractPosition(point: DataPoint<PositionValue> | undefined): PositionValue | null {
    if (!point?.value || !isPositionValue(point.value)) {
      return null;
    }
    return point.value;
  }

  private withFallback<T extends { error?: string }>(
    fallback: T,
    context: string,
  ): OperatorFunction<T, T> {
    return (source: Observable<T>) =>
      source.pipe(
        catchError((error) => {
          this.reportError(context, error);
          return of({ ...fallback, error: `Unable to load ${context}.` } as T);
        }),
      );
  }

  private reportError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Dashboard] ${context} error`, error);
    this.errorSubject.next(`Dashboard ${context} error: ${message}`);
  }
}
