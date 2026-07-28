import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutopilotDecisionLogService } from './autopilot-decision-log.service';
import { AutopilotFacadeService } from './autopilot.facade';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';

/**
 * The decision log is derived purely from published state, so the tests drive the
 * mocked facade streams and assert the resulting timeline entries.
 */
describe('AutopilotDecisionLogService', () => {
  let state$: BehaviorSubject<string>;
  let commandError$: BehaviorSubject<string | null>;
  let fault$: BehaviorSubject<string>;
  let service: AutopilotDecisionLogService;

  beforeEach(() => {
    // Fake timers must be installed before the service is created so its interval
    // is captured (the TRACK_NO_COURSE watchdog runs on setInterval).
    vi.useFakeTimers();

    state$ = new BehaviorSubject<string>('standby');
    commandError$ = new BehaviorSubject<string | null>(null);
    fault$ = new BehaviorSubject<string>('none');

    const facade = {
      state$: state$.asObservable(),
      commandError$: commandError$.asObservable(),
      fault$: fault$.asObservable(),
      windHazard$: new BehaviorSubject<string>('none').asObservable(),
      noGo$: new BehaviorSubject<boolean>(false).asObservable(),
      routeActiveLeg$: new BehaviorSubject<number>(0).asObservable(),
      routeComplete$: new BehaviorSubject<boolean>(false).asObservable(),
    };

    // No course data ever emitted → TRACK cannot actually follow.
    const store = {
      observe: () => new BehaviorSubject(undefined),
      get: () => undefined,
    };

    TestBed.configureTestingModule({
      providers: [
        AutopilotDecisionLogService,
        { provide: AutopilotFacadeService, useValue: facade },
        { provide: DatapointStoreService, useValue: store },
      ],
    });
    service = TestBed.inject(AutopilotDecisionLogService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const latest = () => service['entriesSubject'].value;

  it('logs ENGAGED_TRACK when the state enters route', () => {
    state$.next('route');
    expect(latest()[0]?.code).toBe('ENGAGED_TRACK');
    expect(latest()[0]?.severity).toBe('action');
  });

  it('logs COMMAND_REJECTED with the engine reason', () => {
    commandError$.next('no valid heading');
    expect(latest()[0]?.code).toBe('COMMAND_REJECTED');
    expect(latest()[0]?.reasonText).toBe('no valid heading');
    expect(latest()[0]?.severity).toBe('warn');
  });

  it('logs a critical FAULT_RAISED with the fault reason', () => {
    fault$.next('under-voltage');
    expect(latest()[0]?.code).toBe('FAULT_RAISED');
    expect(latest()[0]?.reasonText).toBe('under-voltage');
    expect(latest()[0]?.severity).toBe('critical');
  });

  it('flags TRACK_NO_COURSE when engaged in route with no course data', () => {
    state$.next('route');
    vi.advanceTimersByTime(1100);
    const noCourse = latest().find((e) => e.code === 'TRACK_NO_COURSE');
    expect(noCourse).toBeTruthy();
    expect(noCourse?.severity).toBe('critical');
  });

  it('clear() empties the timeline', () => {
    state$.next('route');
    expect(latest().length).toBeGreaterThan(0);
    service.clear();
    expect(latest().length).toBe(0);
  });
});
