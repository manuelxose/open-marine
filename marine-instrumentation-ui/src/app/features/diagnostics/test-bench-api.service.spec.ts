import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import type { BenchEvent, BenchRun } from '@omi/marine-data-contract';
import { APP_ENVIRONMENT, type AppEnvironment } from '../../core/config/app-environment.token';
import { TestBenchApiService } from './test-bench-api.service';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, (event: Event) => void>();
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.set(type, listener as (event: Event) => void);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: unknown): void {
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

const environment: AppEnvironment = {
  signalKBaseUrl: 'http://localhost:3000/signalk/v1/api',
  signalKWsUrl: 'ws://localhost:3000/signalk/v1/stream',
  autopilotApiUrl: 'http://localhost:3990',
  testBenchApiUrl: 'http://localhost:4100',
};

const run: BenchRun = {
  id: 'run-1',
  benchId: 'safe-start',
  definitionVersion: '1.0.0',
  status: 'running',
  parameters: {},
  startedAtUtc: '2026-06-25T12:00:00.000Z',
  monotonicStartedMs: 1,
  steps: [],
  assertions: [],
  lastSequence: 0,
};

describe('TestBenchApiService', () => {
  let service: TestBenchApiService;
  let http: HttpTestingController;
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    FakeEventSource.instances = [];
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: environment },
      ],
    });
    service = TestBed.inject(TestBenchApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.disconnectEvents();
    http.verify();
    globalThis.EventSource = originalEventSource;
  });

  it('arms, starts, aborts and builds report URLs on the isolated API', async () => {
    const armPromise = service.arm();
    http.expectOne('http://localhost:4100/api/v1/arm').flush({
      token: 'token-1',
      expiresAtUtc: '2026-06-25T12:00:30.000Z',
    });
    const armed = await armPromise;

    const startPromise = service.startRun('safe-start', armed.token, {});
    const startRequest = http.expectOne('http://localhost:4100/api/v1/runs');
    expect(startRequest.request.body).toEqual({
      benchId: 'safe-start',
      armToken: 'token-1',
      parameters: {},
    });
    startRequest.flush(run);
    expect((await startPromise).id).toBe('run-1');

    const abortPromise = service.abortRun('run-1');
    http.expectOne('http://localhost:4100/api/v1/runs/run-1/abort').flush({
      ...run,
      status: 'aborted',
    });
    expect((await abortPromise).status).toBe('aborted');
    expect(service.reportUrl('run-1', 'html')).toBe(
      'http://localhost:4100/api/v1/runs/run-1/report?format=html',
    );
  });

  it('consumes SSE frames and closes the previous stream when reconnecting', () => {
    const received: BenchEvent[] = [];
    let disconnected = 0;
    service.connectEvents('run-1', 4, (event) => received.push(event), () => disconnected += 1);
    const first = FakeEventSource.instances[0]!;
    expect(first.url).toContain('/runs/run-1/events?after=4');

    const event: BenchEvent = {
      id: 'event-5',
      runId: 'run-1',
      sequence: 5,
      kind: 'run',
      atUtc: '2026-06-25T12:00:01.000Z',
      monotonicMs: 1000,
      message: 'running',
    };
    first.emit('bench-event', event);
    expect(received).toEqual([event]);

    service.connectEvents('run-1', 5, (next) => received.push(next), () => disconnected += 1);
    expect(first.closed).toBe(true);
    const second = FakeEventSource.instances[1]!;
    second.onerror?.(new Event('error'));
    expect(disconnected).toBe(1);
    expect(service.online()).toBe(false);
  });
});
