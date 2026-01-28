import { Alarm, AlarmRuleInput, AlarmSeverity } from './types';

export class AlarmEngine {
  static evaluate(input: AlarmRuleInput): Partial<Alarm>[] {
    const alarms: Partial<Alarm>[] = [];

    // Shallow Water Alarm
    if (input.depthM !== null && input.depthM < input.shallowThresholdM) {
      alarms.push({
        id: 'shallow-water',
        type: 'shallow-water',
        severity: input.depthM < input.shallowThresholdM / 2 ? 'critical' : 'warning',
        message: `Shallow Water: ${input.depthM.toFixed(1)}m`,
        value: input.depthM,
        threshold: input.shallowThresholdM,
      });
    }

    // Low Voltage Alarm
    if (input.voltageV !== null && input.voltageV < input.lowVoltageThresholdV) {
      alarms.push({
        id: 'low-voltage',
        type: 'low-voltage',
        severity: input.voltageV < 11.0 ? 'critical' : 'warning',
        message: `Low Voltage: ${input.voltageV.toFixed(1)}V`,
        value: input.voltageV,
        threshold: input.lowVoltageThresholdV,
      });
    }

    // GPS Lost/Stale Alarm
    if (input.positionAgeS !== null && input.positionAgeS > input.gpsStaleThresholdS) {
      alarms.push({
        id: 'gps-stale',
        type: 'gps-stale',
        severity: 'critical',
        message: `GPS Signal Stale: ${Math.round(input.positionAgeS)}s`,
        value: input.positionAgeS,
        threshold: input.gpsStaleThresholdS,
      });
    } else if (input.positionAgeS === null) {
      alarms.push({
        id: 'gps-lost',
        type: 'gps-lost',
        severity: 'emergency',
        message: 'GPS Signal Lost',
      });
    }

    return alarms;
  }
}
