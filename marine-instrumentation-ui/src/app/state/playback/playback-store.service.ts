import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval, map } from 'rxjs';
import { HistoryService } from '../../core/services/history.service';
import { HistoryPoint } from '../datapoints/datapoint.models';
import { PlaybackEvent, PlaybackLoadRequest, PlaybackState } from './playback.models';

interface PlaybackData {
  [path: string]: HistoryPoint[];
}

const INITIAL_STATE: PlaybackState = {
  status: 'idle',
  currentTime: 0,
  startTime: 0,
  endTime: 0,
  speed: 1,
  events: [],
};

@Injectable({
  providedIn: 'root',
})
export class PlaybackStoreService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<PlaybackState>({ ...INITIAL_STATE });
  readonly state$ = this.stateSubject.asObservable();

  private readonly dataSubject = new BehaviorSubject<PlaybackData>({});
  readonly data$ = this.dataSubject.asObservable();

  private tickSub?: Subscription;

  constructor(private historyService: HistoryService) {}

  ngOnDestroy(): void {
    this.stopTick();
  }

  async load(request: PlaybackLoadRequest): Promise<void> {
    const { paths, startTime, endTime } = request;
    this.updateState({
      status: 'loading',
      startTime,
      endTime,
      currentTime: startTime,
      events: [],
    });

    const data: PlaybackData = {};
    for (const path of paths) {
      data[path] = await this.historyService.getRange(path, startTime, endTime);
    }

    this.dataSubject.next(data);
    this.updateState({
      status: 'ready',
      startTime,
      endTime,
      currentTime: startTime,
      events: this.computeGapEvents(data),
    });
  }

  play(): void {
    const state = this.stateSubject.value;
    if (state.status === 'playing') return;
    if (state.status === 'idle') return;
    this.updateState({ status: 'playing' });
    this.startTick();
  }

  pause(): void {
    const state = this.stateSubject.value;
    if (state.status !== 'playing') return;
    this.updateState({ status: 'paused' });
    this.stopTick();
  }

  stop(): void {
    const state = this.stateSubject.value;
    if (state.status === 'idle') return;
    this.stopTick();
    this.updateState({
      status: 'ready',
      currentTime: state.startTime,
    });
  }

  seek(timestamp: number): void {
    const state = this.stateSubject.value;
    const clamped = Math.max(state.startTime, Math.min(state.endTime, timestamp));
    this.updateState({ currentTime: clamped });
  }

  setSpeed(speed: number): void {
    const safeSpeed = Math.max(0.25, Math.min(10, speed));
    this.updateState({ speed: safeSpeed });
  }

  setEvents(events: PlaybackEvent[]): void {
    this.updateState({ events });
  }

  frameForPath(path: string): Observable<HistoryPoint | null> {
    return this.state$.pipe(
      map((state) => {
        const points = this.dataSubject.value[path] || [];
        if (!points.length) return null;
        const idx = this.findClosestIndex(points, state.currentTime);
        return points[idx] ?? null;
      }),
    );
  }

  private startTick(): void {
    this.stopTick();
    this.tickSub = interval(250).subscribe(() => {
      const state = this.stateSubject.value;
      if (state.status !== 'playing') return;
      const nextTime = state.currentTime + 250 * state.speed;
      if (nextTime >= state.endTime) {
        this.updateState({ currentTime: state.endTime, status: 'paused' });
        this.stopTick();
        return;
      }
      this.updateState({ currentTime: nextTime });
    });
  }

  private stopTick(): void {
    if (this.tickSub) {
      this.tickSub.unsubscribe();
      this.tickSub = undefined;
    }
  }

  private updateState(partial: Partial<PlaybackState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }

  private computeGapEvents(data: PlaybackData, minGapMs = 60 * 60 * 1000): PlaybackEvent[] {
    const timestamps: number[] = [];
    for (const points of Object.values(data)) {
      for (const point of points) {
        timestamps.push(point.timestamp);
      }
    }
    if (!timestamps.length) return [];
    timestamps.sort((a, b) => a - b);
    const events: PlaybackEvent[] = [];
    let previous = timestamps[0];
    for (let i = 1; i < timestamps.length; i += 1) {
      const current = timestamps[i];
      const gap = current - previous;
      if (gap >= minGapMs) {
        const labelMinutes = Math.round(gap / 60000);
        events.push({
          time: previous + gap / 2,
          type: 'note',
          label: `Gap ${labelMinutes} min`,
        });
      }
      previous = current;
    }
    return events;
  }

  private findClosestIndex(points: HistoryPoint[], timestamp: number): number {
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].timestamp < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    if (low === 0) return 0;
    const prev = points[low - 1];
    const curr = points[low];
    return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp)
      ? low
      : low - 1;
  }
}
