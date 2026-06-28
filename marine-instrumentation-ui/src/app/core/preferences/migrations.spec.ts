import { DEFAULT_PREFERENCES } from './preferences.schema';
import { migratePreferences } from './migrations';

describe('Preferences Migrations', () => {
  it('should return default preferences if data is null', () => {
    const result = migratePreferences(null);
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  it('should migrate legacy preferences (no version) to version 1', () => {
    const legacy = {
      theme: 'night',
      speedUnit: 'm/s',
      depthUnit: 'ft',
      shallowThreshold: 5.0,
    };

    const result = migratePreferences(legacy);

    expect(result.version).toBe(1);
    expect(result.theme).toBe('night');
    expect(result.units.speed).toBe('m/s');
    expect(result.units.depth).toBe('ft');
    expect(result.shallowThreshold).toBe(5.0);
    expect(result.chart).toEqual(DEFAULT_PREFERENCES.chart);
  });

  it('should preserve version 1 preferences if already present', () => {
     const v1 = {
       version: 1,
       theme: 'night',
       units: {
         speed: 'km/h',
         depth: 'ft'
       },
       chart: {
         autoCenter: false,
         trackLengthMinutes: 120,
         source: 'mock'
       },
       shallowThreshold: 2.5
     };

     const result = migratePreferences(v1);
     expect(result).toEqual(v1);
  });

  it('should fill in missing fields from DEFAULT_PREFERENCES in migration', () => {
    const legacy = {
      theme: 'night'
    };

    const result = migratePreferences(legacy);
    expect(result.version).toBe(1);
    expect(result.theme).toBe('night');
    expect(result.units.speed).toBe(DEFAULT_PREFERENCES.units.speed);
    expect(result.chart).toEqual(DEFAULT_PREFERENCES.chart);
  });
});
