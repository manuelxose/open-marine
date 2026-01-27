import { Injectable, inject } from '@angular/core';
import { combineLatest, map, shareReplay, startWith, timer } from 'rxjs';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { PreferencesService } from '../../services/preferences.service';
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
  DashboardMetricVm,
  DepthPanelVm,
  NavigationPanelVm,
  PowerPanelVm,
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
  private readonly tick$ = timer(0, 1000);

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
  private readonly voltage$ = selectBatteryVoltage(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly current$ = selectBatteryCurrent(this.store).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly sogSeries$ = selectSeries(this.store, PATHS.navigation.speedOverGround, 120).pipe(startWith([]));
  private readonly depthSeries$ = selectSeries(this.store, PATHS.environment.depth.belowTransducer, 120).pipe(startWith([]));
  private readonly windSeries$ = selectSeries(this.store, PATHS.environment.wind.speedApparent, 120).pipe(startWith([]));
  private readonly voltageSeries$ = selectSeries(this.store, PATHS.electrical.batteries.house.voltage, 120).pipe(startWith([]));

  readonly isCompact$ = this.prefs$.pipe(
    map((prefs) => prefs.density === 'compact'),
    startWith(this.preferences.snapshot.density === 'compact'),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly fixLabel$ = combineLatest([this.position$, this.tick$]).pipe(
    map(([point]) => {
      if (!point?.timestamp) {
        return 'NO FIX';
      }
      const ageMs = Date.now() - point.timestamp;
      if (ageMs > STALE_THRESHOLD_MS) {
        return 'STALE';
      }
      if (ageMs <= FIX_THRESHOLD_MS) {
        return 'FIX';
      }
      return 'FIX';
    }),
    startWith('NO FIX'),
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
  }).pipe(
    map(({ sog, heading, depth, aws, awa, voltage, prefs }) => {
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
          stripItem('SOG', sogMetric, 'neutral'),
          stripItem('HDG', headingMetric, 'neutral'),
          stripItem('Depth', depthMetric, depthTone),
          stripItem('AWS', awsMetric, 'neutral'),
          stripItem('AWA', formatAngleDegrees(coerceNumber(awa?.value)), 'neutral'),
          stripItem('Batt', voltageMetric, voltageTone),
        ],
      } satisfies CriticalStripVm;
    }),
    startWith({ items: [] } satisfies CriticalStripVm),
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
  }).pipe(
    map(({ fixLabel, position, sog, cog, heading, sogSeries, prefs }) => {
      const sogMetric = formatSpeed(coerceNumber(sog?.value), prefs.speedUnit);
      const cogMetric = formatAngleDegrees(coerceNumber(cog?.value));
      const headingMetric = formatAngleDegrees(coerceNumber(heading?.value));

      return {
        title: 'Navigation',
        fixLabel,
        position: {
          lat: formatCoordinate(position?.latitude ?? null, 'lat'),
          lon: formatCoordinate(position?.longitude ?? null, 'lon'),
        },
        metrics: [
          { ...metric('SOG', sogMetric), series: sogSeries },
          metric('COG', cogMetric),
          metric('HDG', headingMetric),
        ],
      } satisfies NavigationPanelVm;
    }),
    startWith({
      title: 'Navigation',
      fixLabel: 'NO FIX',
      position: { lat: '--', lon: '--' },
      metrics: [],
    } satisfies NavigationPanelVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly windVm$ = combineLatest({
    aws: this.aws$,
    awa: this.awa$,
    series: this.windSeries$,
    prefs: this.prefs$,
  }).pipe(
    map(({ aws, awa, series, prefs }) => ({
      title: 'Wind',
      metrics: [
        { ...metric('AWS', formatSpeed(coerceNumber(aws?.value), prefs.speedUnit)), series },
        metric('AWA', formatAngleDegrees(coerceNumber(awa?.value))),
      ],
      primarySeries: series,
    }) satisfies WindPanelVm),
    startWith({ title: 'Wind', metrics: [] } satisfies WindPanelVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly depthVm$ = combineLatest({
    depth: this.depth$,
    series: this.depthSeries$,
    prefs: this.prefs$,
  }).pipe(
    map(({ depth, series, prefs }) => ({
      title: 'Depth',
      metrics: [
        {
          ...metric('Below transducer', formatDepth(coerceNumber(depth?.value), prefs.depthUnit)),
          series,
        },
      ],
      series,
    }) satisfies DepthPanelVm),
    startWith({ title: 'Depth', metrics: [] } satisfies DepthPanelVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly powerVm$ = combineLatest({
    voltage: this.voltage$,
    current: this.current$,
    series: this.voltageSeries$,
  }).pipe(
    map(({ voltage, current, series }) => {
      const volts = coerceNumber(voltage?.value);
      const amps = coerceNumber(current?.value);
      const power = volts !== null && amps !== null ? volts * amps : null;
      return {
        title: 'Power',
        metrics: [
          { ...metric('Voltage', formatVoltage(volts)), series },
          metric('Current', formatCurrent(amps)),
          metric('Power', formatPower(power)),
        ],
        series,
      } satisfies PowerPanelVm;
    }),
    startWith({ title: 'Power', metrics: [] } satisfies PowerPanelVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly systemVm$ = combineLatest({
    lastUpdate: this.store.lastUpdate$,
    updates: this.store.updatesProcessed$,
    tick: this.tick$,
  }).pipe(
    map(({ lastUpdate, updates }) => {
      const ageSeconds = lastUpdate ? Math.max(0, (Date.now() - lastUpdate) / 1000) : null;
      const ageLabel = formatNumber(ageSeconds, 0);
      const updatesLabel = formatNumber(updates, 0);

      return {
        title: 'System',
        status: lastUpdate ? 'Streaming' : 'Awaiting data',
        lines: [
          `Updates processed: ${updatesLabel}`,
          `Last update: ${ageLabel}s`,
        ],
      } satisfies SystemPanelVm;
    }),
    startWith({ title: 'System', status: 'Awaiting data', lines: [] } satisfies SystemPanelVm),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  toggleDensity(): void {
    this.preferences.toggleDensity();
  }

  private extractPosition(point: DataPoint<PositionValue> | undefined): PositionValue | null {
    if (!point?.value || !isPositionValue(point.value)) {
      return null;
    }
    return point.value;
  }
}
