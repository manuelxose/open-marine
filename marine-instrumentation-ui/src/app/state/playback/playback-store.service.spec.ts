import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackStoreService } from './playback-store.service';
import { HistoryService } from '../../core/services/history.service';
import type { HistoryPoint } from '../datapoints/datapoint.models';

class MockHistoryService {
  getRange = vi.fn<Parameters<HistoryService['getRange']>, Promise<HistoryPoint[]>>();
}

describe('PlaybackStoreService', () => {
  let history: MockHistoryService;
  let store: PlaybackStoreService;

  beforeEach(() => {
    vi.useFakeTimers();
    history = new MockHistoryService();
    store = new PlaybackStoreService(history as unknown as HistoryService);
  });

  afterEach(() => {
    store.ngOnDestroy();
    vi.useRealTimers();
  });

  it('loads data and creates gap markers', async () => {
    const points: HistoryPoint[] = [
      { timestamp: 0, value: 1 },
      { timestamp: 2 * 60 * 60 * 1000, value: 2 },
    ];
    history.getRange.mockResolvedValue(points);

    await store.load({ paths: ['path.a'], startTime: 0, endTime: 2 * 60 * 60 * 1000 });

    let latest = null as any;
    const sub = store.state$.subscribe((state) => {
      latest = state;
    });

    expect(latest.status).toBe('ready');
    expect(latest.events.length).toBe(1);
    expect(latest.events[0].label).toContain('Gap');

    sub.unsubscribe();
  });

  it('advances currentTime during playback', async () => {
    const points: HistoryPoint[] = [
      { timestamp: 0, value: 1 },
      { timestamp: 1000, value: 2 },
    ];
    history.getRange.mockResolvedValue(points);

    await store.load({ paths: ['path.a'], startTime: 0, endTime: 5000 });

    let latest = null as any;
    const sub = store.state$.subscribe((state) => {
      latest = state;
    });

    store.play();
    vi.advanceTimersByTime(500);

    expect(latest.currentTime).toBeGreaterThan(0);
    store.stop();
    expect(latest.currentTime).toBe(0);

    sub.unsubscribe();
  });
});
