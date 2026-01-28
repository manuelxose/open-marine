import { Observable, map } from 'rxjs';
import { Alarm, AlarmSeverity } from './types';
import { AlarmStoreService } from './alarm-store.service';

export const selectAllAlarms = (store: AlarmStoreService): Observable<Alarm[]> => {
  return store.alarms$;
};

export const selectActiveUnacknowledged = (store: AlarmStoreService): Observable<Alarm[]> => {
  return store.activeUnacknowledgedAlarms$;
};

export const selectHighestSeverity = (store: AlarmStoreService): Observable<AlarmSeverity | null> => {
  return store.alarms$.pipe(
    map((alarms) => {
      if (alarms.length === 0) return null;
      if (alarms.some((a) => a.severity === 'emergency')) return 'emergency';
      if (alarms.some((a) => a.severity === 'critical')) return 'critical';
      return 'warning';
    })
  );
};
