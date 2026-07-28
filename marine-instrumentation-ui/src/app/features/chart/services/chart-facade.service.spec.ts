import { TestBed } from '@angular/core/testing';
import { ChartFacadeService } from './chart-facade.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { ChartSettingsService } from './chart-settings.service';
import { WaypointService } from './waypoint.service';
import { RouteService } from './route.service';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs'; // Fix import
import { provideHttpClient } from '@angular/common/http';
import { APP_ENVIRONMENT, type AppEnvironment } from '../../../core/config/app-environment.token';

const environment: AppEnvironment = {
  signalKBaseUrl: 'http://localhost:3000/signalk/v1/api',
  signalKWsUrl: 'ws://localhost:3000/signalk/v1/stream',
  autopilotApiUrl: 'http://localhost:3990',
  testBenchApiUrl: 'http://localhost:4100',
  chartEngineApiUrl: 'http://localhost:8088',
  weatherApiUrl: 'https://api.open-meteo.com/v1/forecast',
};

describe('ChartFacadeService', () => {
  let service: ChartFacadeService;

  beforeEach(() => {
    // Mock dependencies
    const datapointStoreMock = {
      state$: new BehaviorSubject(new Map()),
      observe: () => new BehaviorSubject(null),
      observeHistory: () => new BehaviorSubject([]),
      trackPoints$: new BehaviorSubject([]),
    };
    const chartSettingsMock = {
      settings$: new BehaviorSubject({}),
    };
    const waypointServiceMock = {
      waypoints$: new BehaviorSubject([]),
      activeId$: new BehaviorSubject(null),
    };
    const routeServiceMock = {
      activeRoute$: new BehaviorSubject(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        ChartFacadeService,
        { provide: APP_ENVIRONMENT, useValue: environment },
        { provide: DatapointStoreService, useValue: datapointStoreMock },
        { provide: ChartSettingsService, useValue: chartSettingsMock },
        { provide: WaypointService, useValue: waypointServiceMock },
        { provide: RouteService, useValue: routeServiceMock },
        { provide: SignalKClientService, useValue: { connected$: new BehaviorSubject(false) } },
      ],
    });
    service = TestBed.inject(ChartFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with north-up orientation', async () => {
    const orientation = await firstValueFrom(service.orientation$);
    expect(orientation).toBe('north-up');
  });

  it('should toggle orientation', async () => {
    service.toggleOrientation();
    let orientation = await firstValueFrom(service.orientation$);
    expect(orientation).toBe('course-up');

    service.toggleOrientation();
    orientation = await firstValueFrom(service.orientation$);
    expect(orientation).toBe('north-up');
  });
});
