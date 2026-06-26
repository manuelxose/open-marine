import { Injectable, inject } from '@angular/core';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { SignalKClientService } from '../../data-access/signalk/signalk-client.service';
import { PATHS } from '@omi/marine-data-contract';
import { map, Observable, shareReplay } from 'rxjs';

export type AutopilotState = 'standby' | 'auto' | 'wind' | 'route' | 'fault';

const AUTOPILOT_PATHS = {
  state: PATHS.steering?.autopilot?.state ?? 'steering.autopilot.state',
  fault: PATHS.steering?.autopilot?.fault ?? 'steering.autopilot.fault',
  windHazard: PATHS.steering?.autopilot?.windHazard ?? 'steering.autopilot.windHazard',
  noGo: PATHS.steering?.autopilot?.noGo ?? 'steering.autopilot.noGo',
  engaged: PATHS.steering?.autopilot?.engaged ?? 'steering.autopilot.engaged',
  targetHeadingTrue:
    PATHS.steering?.autopilot?.target?.headingTrue ?? 'steering.autopilot.target.headingTrue',
  targetHeadingMagnetic:
    PATHS.steering?.autopilot?.target?.headingMagnetic ?? 'steering.autopilot.target.headingMagnetic',
  targetWindAngleApparent:
    PATHS.steering?.autopilot?.target?.windAngleApparent ??
    'steering.autopilot.target.windAngleApparent',
  targetRudderAngle:
    PATHS.steering?.autopilot?.target?.rudderAngle ?? 'steering.autopilot.target.rudderAngle',
  motorCurrent:
    PATHS.steering?.autopilot?.drive?.motorCurrent ?? 'steering.autopilot.drive.motorCurrent',
  rudderAngle: PATHS.steering?.rudderAngle ?? 'steering.rudderAngle',
  batteryVoltage:
    PATHS.electrical?.batteries?.house?.voltage ?? 'electrical.batteries.house.voltage',
  routeActiveLeg:
    PATHS.steering?.autopilot?.route?.activeLeg ?? 'steering.autopilot.route.activeLeg',
  routeLength:
    PATHS.steering?.autopilot?.route?.length ?? 'steering.autopilot.route.length',
  routeComplete:
    PATHS.steering?.autopilot?.route?.complete ?? 'steering.autopilot.route.complete',
  routeWaypoints:
    PATHS.steering?.autopilot?.route?.waypoints ?? 'steering.autopilot.route.waypoints',
} as const;

export { AUTOPILOT_PATHS };

@Injectable({
  providedIn: 'root'
})
export class AutopilotStoreService {
  private datapointStore = inject(DatapointStoreService);
  private skClient = inject(SignalKClientService);
  
  public readonly isConnected$ = this.skClient.connected$;
  
  // Observables derived from DatapointStore (Single Source of Truth defined in architecture)
  
  public readonly state$: Observable<AutopilotState> = this.datapointStore
    .observe<string>(AUTOPILOT_PATHS.state)
    .pipe(
      map(dp => (dp?.value as AutopilotState) || 'standby'),
      shareReplay(1)
    );

  public readonly targetHeadingTrue$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.targetHeadingTrue)
    .pipe(map(dp => dp?.value));

  public readonly targetHeadingMagnetic$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.targetHeadingMagnetic)
    .pipe(map(dp => dp?.value));
    
  public readonly targetWindAngle$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.targetWindAngleApparent)
    .pipe(map(dp => dp?.value));

  public readonly targetRudderAngle$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.targetRudderAngle)
    .pipe(map(dp => dp?.value));

  public readonly motorCurrent$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.motorCurrent)
    .pipe(map(dp => dp?.value));

  public readonly fault$: Observable<string> = this.datapointStore
    .observe<string>(AUTOPILOT_PATHS.fault)
    .pipe(
      map(dp => (dp?.value as string) || 'none'),
      shareReplay(1)
    );

  public readonly windHazard$: Observable<string> = this.datapointStore
    .observe<string>(AUTOPILOT_PATHS.windHazard)
    .pipe(
      map(dp => (dp?.value as string) || 'none'),
      shareReplay(1)
    );

  public readonly noGo$: Observable<boolean> = this.datapointStore
    .observe<boolean>(AUTOPILOT_PATHS.noGo)
    .pipe(
      map(dp => dp?.value === true),
      shareReplay(1)
    );

  public readonly rudderAngle$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.rudderAngle)
    .pipe(map(dp => dp?.value));

  public readonly batteryVoltage$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.batteryVoltage)
    .pipe(map(dp => dp?.value));

  public readonly routeActiveLeg$: Observable<number> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.routeActiveLeg)
    .pipe(
      map(dp => (typeof dp?.value === 'number' ? dp.value : 0)),
      shareReplay(1)
    );

  public readonly routeLength$: Observable<number> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.routeLength)
    .pipe(
      map(dp => (typeof dp?.value === 'number' ? dp.value : 0)),
      shareReplay(1)
    );

  public readonly routeComplete$: Observable<boolean> = this.datapointStore
    .observe<boolean>(AUTOPILOT_PATHS.routeComplete)
    .pipe(
      map(dp => dp?.value === true),
      shareReplay(1)
    );

  public readonly routeWaypoints$: Observable<Array<{ latitude: number; longitude: number }>> = this.datapointStore
    .observe<Array<{ latitude: number; longitude: number }>>(AUTOPILOT_PATHS.routeWaypoints)
    .pipe(
      map(dp => (Array.isArray(dp?.value) ? dp.value : [])),
      shareReplay(1)
    );

  constructor() {}

  // Helper to get current snapshot value
  public getSnapshot<T>(path: string): T | undefined {
      return this.datapointStore.get<T>(path)?.value;
  }
}
