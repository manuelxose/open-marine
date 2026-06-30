import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';

export interface OutsideZoneTickerOptions {
  immediate?: boolean;
  emitInsideAngular?: boolean;
}

export const outsideZoneTicker = (
  zone: NgZone,
  periodMs: number,
  options: OutsideZoneTickerOptions = {},
): Observable<number> =>
  new Observable<number>((subscriber) => {
    const immediate = options.immediate ?? true;
    const emitInsideAngular = options.emitInsideAngular ?? true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const emit = (): void => {
      const value = Date.now();
      if (emitInsideAngular) {
        zone.run(() => subscriber.next(value));
      } else {
        subscriber.next(value);
      }
    };

    const tick = (): void => {
      if (stopped || subscriber.closed) {
        return;
      }
      emit();
      timeoutId = setTimeout(tick, periodMs);
    };

    zone.runOutsideAngular(() => {
      timeoutId = setTimeout(tick, immediate ? 0 : periodMs);
    });

    return () => {
      stopped = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  });
