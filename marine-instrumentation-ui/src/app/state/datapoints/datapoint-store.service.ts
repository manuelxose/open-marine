import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { filterToWindow } from '../../core/calculations/trend';
import { calculateTrueWind } from '../../core/calculations/wind';
import { haversineDistanceMeters } from '../calculations/navigation';
import { HistoryService } from '../../core/services/history.service';
import { PLAYBACK_POSITION_LAT_PATH, PLAYBACK_POSITION_LON_PATH } from '../playback/playback.models';
import { DataPoint, DataPointMap, HistoryPoint, TrackPoint } from './datapoint.models';

const MAX_TRACK_POINTS = 1000;
const TRACK_WINDOW_MS = 30 * 60 * 1000;
const TRACK_MIN_TIME_MS = 1000;
const TRACK_MIN_DISTANCE_METERS = 10;
const PERSISTED_HISTORY_PATHS = new Set<string>([
  PATHS.navigation.speedOverGround,
  PATHS.navigation.courseOverGroundTrue,
  PATHS.navigation.headingTrue,
  PATHS.environment.depth.belowTransducer,
  PATHS.environment.wind.speedApparent,
  PATHS.environment.wind.angleApparent,
  PATHS.environment.wind.speedTrue,
  PATHS.environment.wind.angleTrueGround,
  PATHS.environment.wind.angleTrueWater,
  PATHS.electrical.batteries.house.voltage,
]);
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

  constructor(private historyService: HistoryService) {
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
          void this.historyService.addPoint(
            PLAYBACK_POSITION_LAT_PATH,
            { timestamp: point.timestamp, value: pos.latitude },
            point.source,
          );
          void this.historyService.addPoint(
            PLAYBACK_POSITION_LON_PATH,
            { timestamp: point.timestamp, value: pos.longitude },
            point.source,
          );
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

      if (PERSISTED_HISTORY_PATHS.has(point.path) && typeof point.value === 'number') {
        void this.historyService.addPoint(
          point.path,
          { timestamp: point.timestamp, value: point.value },
          point.source,
        );
      }
    }

    this.deriveTrueWind(next, latestTimestamp || Date.now());

    this._state.next(next);
    this._lastUpdate.next(latestTimestamp || Date.now());
  }

  private deriveTrueWind(state: DataPointMap, timestamp: number): void {
    const P = PATHS;
    // Do not overwrite if source provides it (unless it's our own previous calculation, but we want freshness)
    // Actually, if we just set it in the loop above (from 'points'), 'source' will be the external source.
    // If it was already there from previous calculation, 'source' is 'derived'.
    // We want to calculate if:
    // 1. It's missing.
    // 2. It's present but stale (timestamp old)?
    // For now, simple logic: If the current map has a value from an external source, don't touch it. [Not completely robust but safe]
    
    // Check if we have True Wind Speed from an external source
    const currentTws = state.get(P.environment.wind.speedTrue);
    if (currentTws && currentTws.source !== 'derived') {
      return; 
    }

    const aws = state.get(P.environment.wind.speedApparent)?.value;
    const awa = state.get(P.environment.wind.angleApparent)?.value;
    const sog = state.get(P.navigation.speedOverGround)?.value;
    
    // We need Heading Use Heading (preferred) or COG
    const hdg = state.get(P.navigation.headingTrue)?.value;
    const cog = state.get(P.navigation.courseOverGroundTrue)?.value;

    if (
      typeof aws !== 'number' ||
      typeof awa !== 'number' ||
      typeof sog !== 'number'
    ) {
      return;
    }

    const headingRef = typeof hdg === 'number' ? hdg : (typeof cog === 'number' ? cog : undefined);
    
    // calculateTrueWind requires boatHead/COG.
    // If we have neither, we can't calculate Earth frame wind.
    if (typeof headingRef !== 'number') return;

    // Use COG as fallback for the computation if heading is missing
    const cogRef = typeof cog === 'number' ? cog : headingRef; 

    // Calculate
    const result = calculateTrueWind(aws, awa, sog, cogRef, headingRef);

    // Update State
    const source = 'derived';
    
    state.set(P.environment.wind.speedTrue, {
      path: P.environment.wind.speedTrue,
      value: result.tws,
      timestamp,
      source
    });
    
    state.set(P.environment.wind.angleTrueGround, { // TWD
      path: P.environment.wind.angleTrueGround,
      value: result.twd,
      timestamp,
      source
    });

    state.set(P.environment.wind.angleTrueWater, { // TWA
      path: P.environment.wind.angleTrueWater,
      value: result.twa,
      timestamp,
      source
    });
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
