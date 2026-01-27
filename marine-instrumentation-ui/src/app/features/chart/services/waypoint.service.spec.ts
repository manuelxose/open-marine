import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WaypointService, WaypointStoragePayload } from './waypoint.service';

describe('WaypointService', () => {
  let storage: Record<string, string>;

  beforeAll(() => {
    jasmine.getEnv().allowRespy(true);
  });

  beforeEach(() => {
    storage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => storage[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      storage[key] = value as string;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete storage[key];
    });
    spyOn(localStorage, 'clear').and.callFake(() => {
      storage = {};
    });

    TestBed.configureTestingModule({
      providers: [WaypointService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
  });

  it('persists waypoints with a versioned payload', () => {
    const service = TestBed.inject(WaypointService);
    const waypoint = service.addWaypoint(42, -8, 'Home');

    const raw = storage['omi-waypoints'];
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw) as WaypointStoragePayload;
    expect(parsed.version).toBe(1);
    expect(parsed.data.waypoints.length).toBe(1);
    expect(parsed.data.waypoints[0].id).toBe(waypoint.id);
  });

  it('restores legacy payloads without a version', async () => {
    const legacy = {
      waypoints: [{ id: 'wp-1', name: 'WP 01', lat: 1, lon: 2, createdAt: 10 }],
      activeId: 'wp-1',
    };
    storage['omi-waypoints'] = JSON.stringify(legacy);

    const service = TestBed.inject(WaypointService);
    const waypoints = await firstValueFrom(service.waypoints$);
    const activeId = await firstValueFrom(service.activeId$);

    expect(waypoints.length).toBe(1);
    expect(waypoints[0].id).toBe('wp-1');
    expect(activeId).toBe('wp-1');
  });
});
