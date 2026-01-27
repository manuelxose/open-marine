import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { filterToWindow } from '../../core/calculations/trend';
import { haversineDistanceMeters } from '../calculations/navigation';
import { DataPoint, DataPointMap, HistoryPoint, TrackPoint } from './datapoint.models';

const MAX_TRACK_POINTS = 1000;
const TRACK_WINDOW_MS = 30 * 60 * 1000;
const TRACK_MIN_TIME_MS = 1000;
const TRACK_MIN_DISTANCE_METERS = 10;
class RingBuffer<T> {
  private buffer: T[] = [];

  constructor(private readonly capacity: number) {}

  push(item: T): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  toArray(): T[] {
    return [...this.buffer];
  }
}

@Injectable({
  providedIn: 'root',
})
export class DatapointStoreService {
  private readonly _state = new BehaviorSubject<DataPointMap>(new Map());

  private readonly _history = new Map<string, RingBuffer<HistoryPoint>>();
  private readonly _historySubjects = new Map<string, BehaviorSubject<HistoryPoint[]>>();

  private readonly _trackPoints = new RingBuffer<TrackPoint>(MAX_TRACK_POINTS);
  private readonly _trackPoints$ = new BehaviorSubject<TrackPoint[]>([]);
  public readonly track$ = this._trackPoints$.asObservable();
  public readonly trackPoints$ = this.track$;
  private lastTrackSample: TrackPoint | null = null;

  private readonly _lastUpdate = new BehaviorSubject<number | null>(null);
  public readonly lastUpdate$ = this._lastUpdate.asObservable();

  private readonly _updatesProcessed = new BehaviorSubject<number>(0);
  public readonly updatesProcessed$ = this._updatesProcessed.asObservable();

  private readonly HISTORY_CONFIG: Record<string, number> = {
    [PATHS.navigation.speedOverGround]: 120,
    [PATHS.environment.wind.speedApparent]: 120,
    [PATHS.environment.depth.belowTransducer]: 120,
    [PATHS.electrical.batteries.house.voltage]: 120,
  };

  public readonly state$ = this._state.asObservable();

  constructor() {
    for (const path of Object.keys(this.HISTORY_CONFIG)) {
      this._history.set(path, new RingBuffer<HistoryPoint>(this.HISTORY_CONFIG[path]));
      this._historySubjects.set(path, new BehaviorSubject<HistoryPoint[]>([]));
    }
  }

  update(points: DataPoint[]): void {
    if (points.length === 0) {
      return;
    }

    const current = this._state.value;
    const next = new Map(current);

    this._updatesProcessed.next(this._updatesProcessed.value + points.length);

    let latestTimestamp = this._lastUpdate.value ?? 0;

    for (const point of points) {
      next.set(point.path, point);
      if (point.timestamp > latestTimestamp) {
        latestTimestamp = point.timestamp;
      }

      if (point.path === PATHS.navigation.position && point.value && typeof point.value === 'object') {
        const pos = point.value as { latitude?: number; longitude?: number };
        if (typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
          const sample: TrackPoint = { lat: pos.latitude, lon: pos.longitude, ts: point.timestamp };
          if (this.shouldAppendTrack(sample)) {
            this._trackPoints.push(sample);
            this.emitTrackPoints(sample.ts);
          }
        }
      }

      if (this.HISTORY_CONFIG[point.path] && typeof point.value === 'number') {
        const buffer = this._history.get(point.path);
        const subject = this._historySubjects.get(point.path);
        if (buffer && subject) {
          buffer.push({ timestamp: point.timestamp, value: point.value });
          subject.next(buffer.toArray());
        }
      }
    }

    this._state.next(next);
    this._lastUpdate.next(latestTimestamp || Date.now());
  }

  observe<T>(path: string): Observable<DataPoint<T> | undefined> {
    return this.state$.pipe(
      map((state) => state.get(path) as DataPoint<T> | undefined),
      distinctUntilChanged()
    );
  }

  observeHistory(path: string): Observable<HistoryPoint[]> {
    if (!this._historySubjects.has(path)) {
      return new BehaviorSubject<HistoryPoint[]>([]).asObservable();
    }
    return this._historySubjects.get(path)!.asObservable();
  }

  series$(path: string, windowSeconds: number): Observable<HistoryPoint[]> {
    return this.observeHistory(path).pipe(
      map((points) => filterToWindow(points, windowSeconds * 1000))
    );
  }

  get updatesProcessedSnapshot(): number {
    return this._updatesProcessed.value;
  }

  get<T>(path: string): DataPoint<T> | undefined {
    return this._state.value.get(path) as DataPoint<T> | undefined;
  }

  getAll(): DataPoint[] {
    return Array.from(this._state.value.values());
  }

  private shouldAppendTrack(sample: TrackPoint): boolean {
    if (!this.lastTrackSample) {
      this.lastTrackSample = sample;
      return true;
    }

    const timeDelta = sample.ts - this.lastTrackSample.ts;
    const distance = haversineDistanceMeters(
      { lat: this.lastTrackSample.lat, lon: this.lastTrackSample.lon },
      { lat: sample.lat, lon: sample.lon },
    );

    if (timeDelta < TRACK_MIN_TIME_MS && distance < TRACK_MIN_DISTANCE_METERS) {
      return false;
    }

    this.lastTrackSample = sample;
    return true;
  }

  private emitTrackPoints(referenceTimestamp: number): void {
    const cutoff = referenceTimestamp - TRACK_WINDOW_MS;
    const windowed = this._trackPoints.toArray().filter((point) => point.ts >= cutoff);

    if (windowed.length > MAX_TRACK_POINTS) {
      windowed.splice(0, windowed.length - MAX_TRACK_POINTS);
    }

    this._trackPoints$.next(windowed);
  }
}
