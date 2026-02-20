export type AlarmType =
  | 'anchor-watch'
  | 'shallow-water'
  | 'cpa-warning'
  | 'mob'
  | 'battery-low'
  | 'gps-lost'
  | 'off-route'
  | 'engine-overheat'
  | 'low-oil'
  | 'storm-warning'
  | 'connection-lost';

export type AlarmCategory =
  | 'navigation'
  | 'collision'
  | 'anchor'
  | 'mob'
  | 'electrical'
  | 'engine'
  | 'environment'
  | 'system';

export enum AlarmSeverity {
  Info = 'info',
  Warning = 'warning',
  Critical = 'critical',
  Emergency = 'emergency',
}

export enum AlarmState {
  Inactive = 'inactive',
  Active = 'active',
  Acknowledged = 'acknowledged',
  Silenced = 'silenced',
  Resolved = 'resolved',
  Inhibited = 'inhibited',
  Cleared = 'cleared',
}

export interface Alarm {
  id: string;
  type: AlarmType;
  category: AlarmCategory;
  severity: AlarmSeverity;
  state: AlarmState;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
}

/** Maps alarm type to its category for default classification. */
export const ALARM_TYPE_CATEGORY: Record<AlarmType, AlarmCategory> = {
  'anchor-watch': 'anchor',
  'shallow-water': 'navigation',
  'cpa-warning': 'collision',
  'mob': 'mob',
  'battery-low': 'electrical',
  'gps-lost': 'system',
  'off-route': 'navigation',
  'engine-overheat': 'engine',
  'low-oil': 'engine',
  'storm-warning': 'environment',
  'connection-lost': 'system',
};
