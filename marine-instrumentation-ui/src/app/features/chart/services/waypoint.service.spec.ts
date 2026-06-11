import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, filter, firstValueFrom, of } from 'rxjs';
import { WaypointService } from './waypoint.service';
import { WaypointStoreService } from '../../../state/resources/waypoint-store.service';

describe('WaypointService', () => {
  let waypointsSubject: BehaviorSubject<any[]>;
  let createWaypointSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    waypointsSubject = new BehaviorSubject<any[]>([]);
    createWaypointSpy = vi.fn().mockReturnValue(of('wp-1'));

    TestBed.configureTestingModule({
      providers: [
        WaypointService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: WaypointStoreService,
          useValue: {
            waypoints$: waypointsSubject.asObservable(),
            createWaypoint: createWaypointSpy,
            updateWaypoint: vi.fn(),
            deleteWaypoint: vi.fn(),
          },
        },
      ],
    });
  });

  it('maps resource waypoints to chart waypoints', async () => {
    waypointsSubject.next([
      {
        id: 'wp-1',
        name: 'Home',
        position: { latitude: 1, longitude: 2 },
        timestamp: new Date('2026-01-29T10:00:00.000Z').toISOString(),
      },
    ]);

    const service = TestBed.inject(WaypointService);
    const waypoints = await firstValueFrom(service.waypoints$);

    expect(waypoints.length).toBe(1);
    expect(waypoints[0].id).toBe('wp-1');
    expect(waypoints[0].lat).toBe(1);
    expect(waypoints[0].lon).toBe(2);
  });

  it('sets active waypoint after creation', async () => {
    const service = TestBed.inject(WaypointService);
    service.addWaypoint(42, -8, 'Home');

    const activeId = await firstValueFrom(service.activeId$.pipe(filter((value) => value === 'wp-1')));
    expect(activeId).toBe('wp-1');
  });
});
