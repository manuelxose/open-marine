export type AlarmSeverity = 'warning' | 'critical' | 'emergency';

export interface Alarm {
  id: string;
  type: string;
  severity: AlarmSeverity;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  value?: any;
  threshold?: any;
}

export interface AlarmState {
  activeAlarms: Alarm[];
}

export interface AlarmRuleInput {
  depthM: number | null;
  voltageV: number | null;
  positionAgeS: number | null;
  shallowThresholdM: number;
  lowVoltageThresholdV: number;
  gpsStaleThresholdS: number;
}
