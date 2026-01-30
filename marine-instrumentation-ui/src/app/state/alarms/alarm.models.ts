export type AlarmType =
  | 'anchor-watch'
  | 'shallow-water'
  | 'cpa-warning'
  | 'mob'
  | 'battery-low'
  | 'gps-lost';

export enum AlarmSeverity {
  Warning = 'warning',
  Critical = 'critical',
  Emergency = 'emergency',
}

export enum AlarmState {
  Inactive = 'inactive',
  Active = 'active',
  Acknowledged = 'acknowledged',
  Silenced = 'silenced',
  Cleared = 'cleared',
}

export interface Alarm {
  id: string;
  type: AlarmType;
  severity: AlarmSeverity;
  state: AlarmState;
  message: string;
  data?: any;
  timestamp: number;
}
