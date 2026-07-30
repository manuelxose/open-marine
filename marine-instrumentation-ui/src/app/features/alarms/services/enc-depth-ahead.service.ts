import { Injectable, inject } from '@angular/core';
import { PATHS } from '@omi/marine-data-contract';
import { BehaviorSubject, catchError, combineLatest, filter, interval, map, of, startWith, switchMap } from 'rxjs';
import { ChartEngineApiService, type EncHazardResponse } from '../../../data-access/chart/chart-engine-api.service';
import { ChartSettingsService } from '../../chart/services/chart-settings.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { AlarmStoreService } from '../../../state/alarms/alarm-store.service';
import { AlarmSeverity } from '../../../state/alarms/alarm.models';

export interface EncDepthAheadState {
  status: 'idle' | 'safe' | 'danger' | 'unavailable';
  response: EncHazardResponse | null;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class EncDepthAheadService {
  private readonly api = inject(ChartEngineApiService);
  private readonly settings = inject(ChartSettingsService);
  private readonly store = inject(DatapointStoreService);
  private readonly alarms = inject(AlarmStoreService);
  private readonly stateSubject = new BehaviorSubject<EncDepthAheadState>({
    status: 'idle',
    response: null,
    message: 'Waiting for navigation data',
  });
  readonly state$ = this.stateSubject.asObservable();

  constructor() {
    combineLatest([
      interval(2_000).pipe(startWith(0)),
      this.store.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
      this.store.observe<number>(PATHS.navigation.speedOverGround),
      this.store.observe<number>(PATHS.navigation.courseOverGroundTrue).pipe(startWith(undefined)),
      this.store.observe<number>(PATHS.navigation.headingTrue).pipe(startWith(undefined)),
      this.settings.settings$,
    ]).pipe(
      filter(([, position, speed]) =>
        typeof position?.value?.latitude === 'number'
        && typeof position.value.longitude === 'number'
        && typeof speed?.value === 'number'),
      switchMap(([, position, speed, course, heading, settings]) => {
        const radians = typeof course?.value === 'number' ? course.value : heading?.value;
        if (typeof radians !== 'number') return of(null);
        return this.api.queryEncHazards({
          chartIds: [],
          position: position!.value,
          courseDeg: ((radians * 180 / Math.PI) % 360 + 360) % 360,
          speedMps: Math.max(0, speed!.value),
          draftM: 1.5,
          underKeelClearanceM: 0.5,
          safetyDepthM: settings.safetyDepth,
          lookAheadMinutes: 6,
          corridorWidthM: 100,
        }).pipe(catchError(() => of(null)));
      }),
      map((response): EncDepthAheadState => {
        if (!response || response.coverage === 'unavailable') {
          return { status: 'unavailable', response, message: 'ENC coverage unavailable' };
        }
        if (response.hazards.features.length > 0) {
          return {
            status: 'danger',
            response,
            message: response.minDepthM === null
              ? 'ENC hazard ahead'
              : `ENC SHALLOW AHEAD ${response.minDepthM.toFixed(1)} m`,
          };
        }
        return { status: 'safe', response, message: 'No indexed ENC hazard in look-ahead corridor' };
      }),
    ).subscribe((state) => {
      this.stateSubject.next(state);
      if (state.status === 'danger') {
        this.alarms.triggerAlarm(
          'enc-depth-ahead',
          'enc-depth-ahead',
          AlarmSeverity.Warning,
          state.message,
          {
            advisoryOnly: true,
            safetyDepthM: state.response?.safetyDepthM,
            minDepthM: state.response?.minDepthM,
          },
        );
      } else {
        this.alarms.clearAlarm('enc-depth-ahead');
      }
    });
  }
}
