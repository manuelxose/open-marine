import { TestBed } from '@angular/core/testing';
import { ChartFacadeService } from './chart-facade.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { ChartSettingsService } from './chart-settings.service';
import { WaypointService } from './waypoint.service';
import { RouteService } from './route.service';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs'; // Fix import

describe('ChartFacadeService', () => {
  let service: ChartFacadeService;

  beforeEach(() => {
    // Mock dependencies
    const datapointStoreMock = {
      state$: new BehaviorSubject(new Map()),
      observe: () => new BehaviorSubject(null),
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
        ChartFacadeService,
        { provide: DatapointStoreService, useValue: datapointStoreMock },
        { provide: ChartSettingsService, useValue: chartSettingsMock },
        { provide: WaypointService, useValue: waypointServiceMock },
        { provide: RouteService, useValue: routeServiceMock },
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
