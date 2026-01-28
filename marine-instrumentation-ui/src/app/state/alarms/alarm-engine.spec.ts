import { AlarmEngine } from './alarm-engine';
import { AlarmRuleInput } from './types';

describe('AlarmEngine', () => {
  const defaultInput: AlarmRuleInput = {
    depthM: 10,
    voltageV: 13.2,
    positionAgeS: 1,
    shallowThresholdM: 3.0,
    lowVoltageThresholdV: 11.5,
    gpsStaleThresholdS: 5,
  };

  it('should return no alarms for healthy input', () => {
    const alarms = AlarmEngine.evaluate(defaultInput);
    expect(alarms.length).toBe(0);
  });

  it('should trigger shallow water warning', () => {
    const alarms = AlarmEngine.evaluate({ ...defaultInput, depthM: 2.5 });
    const shallowAlarm = alarms.find((a) => a.id === 'shallow-water');
    expect(shallowAlarm).toBeDefined();
    expect(shallowAlarm?.severity).toBe('warning');
  });

  it('should trigger shallow water critical', () => {
    const alarms = AlarmEngine.evaluate({ ...defaultInput, depthM: 1.0 });
    const shallowAlarm = alarms.find((a) => a.id === 'shallow-water');
    expect(shallowAlarm?.severity).toBe('critical');
  });

  it('should trigger low voltage warning', () => {
    const alarms = AlarmEngine.evaluate({ ...defaultInput, voltageV: 11.2 });
    const voltageAlarm = alarms.find((a) => a.id === 'low-voltage');
    expect(voltageAlarm?.severity).toBe('warning');
  });

  it('should trigger GPS stale critical', () => {
    const alarms = AlarmEngine.evaluate({ ...defaultInput, positionAgeS: 10 });
    const gpsAlarm = alarms.find((a) => a.id === 'gps-stale');
    expect(gpsAlarm?.severity).toBe('critical');
  });

  it('should trigger GPS lost emergency', () => {
    const alarms = AlarmEngine.evaluate({ ...defaultInput, positionAgeS: null });
    const gpsAlarm = alarms.find((a) => a.id === 'gps-lost');
    expect(gpsAlarm?.severity).toBe('emergency');
  });
});
