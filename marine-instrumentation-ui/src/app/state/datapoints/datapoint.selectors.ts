import { PATHS } from '@omi/marine-data-contract';
import type { Observable } from 'rxjs';
import { DatapointStoreService } from './datapoint-store.service';
import type { DataPoint, TrackPoint, HistoryPoint } from './datapoint.models';

export interface PositionValue {
  latitude: number;
  longitude: number;
}

export const isPositionValue = (value: unknown): value is PositionValue => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['latitude'] === 'number' && typeof record['longitude'] === 'number';
};

const selectPoint = <T>(
  store: DatapointStoreService,
  path: string,
): Observable<DataPoint<T> | undefined> => {
  return store.observe<T>(path);
};

export const selectPosition = (
  store: DatapointStoreService,
): Observable<DataPoint<PositionValue> | undefined> => {
  return selectPoint<PositionValue>(store, PATHS.navigation.position);
};

export const selectSog = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.navigation.speedOverGround);
};

export const selectCog = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.navigation.courseOverGroundTrue);
};

export const selectHeading = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.navigation.headingTrue);
};

export const selectDepth = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment.depth.belowTransducer);
};

export const selectAws = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment.wind.speedApparent);
};

export const selectAwa = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment.wind.angleApparent);
};

export const selectTws = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment.wind.speedTrue);
};

export const selectTwd = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  // Canonical TWD path. Direct true-wind sources (sensors, simulator) publish `directionTrue`;
  // the derived true-wind calculator also writes it (see datapoint-store.service.ts).
  return selectPoint<number>(store, PATHS.environment.wind.directionTrue);
};

export const selectTwa = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment.wind.angleTrueWater);
};

export const selectBatteryVoltage = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.electrical.batteries.house.voltage);
};

export const selectBatteryCurrent = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.electrical.batteries.house.current);
};

// ── Engine / Propulsion selectors ──

export const selectRpm = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.propulsion?.main?.revolutions ?? 'propulsion.main.revolutions');
};

export const selectCoolantTemp = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.propulsion?.main?.temperature ?? 'propulsion.main.temperature');
};

export const selectOilPressure = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.propulsion?.main?.oilPressure ?? 'propulsion.main.oilPressure');
};

export const selectFuelRate = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.propulsion?.main?.fuelRate ?? 'propulsion.main.fuel.rate');
};

export const selectFuelLevel = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.tanks?.fuel?.level ?? 'tanks.fuel.0.currentLevel');
};

// ── Environment selectors ──

export const selectWaterTemp = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment?.water?.temperature ?? 'environment.water.temperature');
};

export const selectAirTemp = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment?.outside?.temperature ?? 'environment.outside.temperature');
};

export const selectBaroPressure = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment?.outside?.pressure ?? 'environment.outside.pressure');
};

export const selectHumidity = (
  store: DatapointStoreService,
): Observable<DataPoint<number> | undefined> => {
  return selectPoint<number>(store, PATHS.environment?.outside?.humidity ?? 'environment.outside.humidity');
};

export const selectTrackPoints = (store: DatapointStoreService): Observable<TrackPoint[]> => {
  return store.trackPoints$;
};

export const selectSeries = (
  store: DatapointStoreService,
  path: string,
  windowSeconds: number,
): Observable<HistoryPoint[]> => {
  return store.series$(path, windowSeconds);
};
