import { Injectable, inject } from '@angular/core';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { SignalKClientService } from '../../data-access/signalk/signalk-client.service';
import { PATHS } from '@omi/marine-data-contract';
import { map, Observable, shareReplay } from 'rxjs';

export type AutopilotState = 'standby' | 'auto' | 'wind' | 'route' | 'fault';

const AUTOPILOT_PATHS = {
  state: PATHS.steering?.autopilot?.state ?? 'steering.autopilot.state',
  fault: PATHS.steering?.autopilot?.fault ?? 'steering.autopilot.fault',
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
    PATHS.electrical?.batteries?.house?.voltage ?? 'electrical.batteries.house.voltage'
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

  public readonly rudderAngle$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.rudderAngle)
    .pipe(map(dp => dp?.value));

  public readonly batteryVoltage$: Observable<number | undefined> = this.datapointStore
    .observe<number>(AUTOPILOT_PATHS.batteryVoltage)
    .pipe(map(dp => dp?.value));

  constructor() {}

  // Helper to get current snapshot value
  public getSnapshot<T>(path: string): T | undefined {
      return this.datapointStore.get<T>(path)?.value;
  }
}
