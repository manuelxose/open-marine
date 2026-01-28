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
  return selectPoint<number>(store, PATHS.environment.wind.angleTrueGround);
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
