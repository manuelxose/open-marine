import { Observable, map } from 'rxjs';
import { Alarm, AlarmSeverity, AlarmState } from './alarm.models';
import { AlarmStoreService } from './alarm-store.service';

export const selectAllAlarms = (store: AlarmStoreService): Observable<Alarm[]> => {
  return store.alarms$;
};

export const selectActiveUnacknowledged = (store: AlarmStoreService): Observable<Alarm[]> => {
  return store.alarms$.pipe(map((alarms) => alarms.filter((alarm) => alarm.state === AlarmState.Active)));
};

export const selectHighestSeverity = (store: AlarmStoreService): Observable<AlarmSeverity | null> => {
  return store.alarms$.pipe(
    map((alarms) => {
      if (alarms.length === 0) return null;
      if (alarms.some((a) => a.severity === AlarmSeverity.Emergency)) return AlarmSeverity.Emergency;
      if (alarms.some((a) => a.severity === AlarmSeverity.Critical)) return AlarmSeverity.Critical;
      return AlarmSeverity.Warning;
    })
  );
};
