import { DEFAULT_PREFERENCES, UserPreferences } from './preferences.schema';

export type MigrationFn = (old: any) => UserPreferences;

export const migrations: Record<number, MigrationFn> = {
  // Migration to Version 1 from unversioned "legacy" format
  1: (legacy: any): UserPreferences => {
    // If it's already version 1, just return it
    if (legacy?.version === 1) {
      return { ...DEFAULT_PREFERENCES, ...legacy };
    }

    // Otherwise, attempt to map legacy fields
    return {
      version: 1,
      theme: legacy?.theme || DEFAULT_PREFERENCES.theme,
      density: legacy?.density || DEFAULT_PREFERENCES.density,
      units: {
        speed: legacy?.speedUnit || DEFAULT_PREFERENCES.units.speed,
        depth: legacy?.depthUnit || DEFAULT_PREFERENCES.units.depth,
      },
      chart: {
        ...DEFAULT_PREFERENCES.chart,
        ...(legacy?.chart || {}),
        mapSourceId: legacy?.mapSourceId || legacy?.chart?.mapSourceId || DEFAULT_PREFERENCES.chart.mapSourceId,
      },
      shallowThreshold: legacy?.shallowThreshold || DEFAULT_PREFERENCES.shallowThreshold,
    };
  },
};

export function migratePreferences(data: any): UserPreferences {
  if (!data) return DEFAULT_PREFERENCES;
  
  let current = data;
  const targetVersion = DEFAULT_PREFERENCES.version;

  // If no version, it's legacy - run migration 1
  if (!current.version) {
    current = migrations[1](current);
  }

  // Future migrations would loop here from current.version + 1 to targetVersion
  // for (let v = current.version + 1; v <= targetVersion; v++) {
  //   if (migrations[v]) {
  //     current = migrations[v](current);
  //   }
  // }

  return current as UserPreferences;
}
