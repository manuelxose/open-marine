import { PATHS } from '@omi/marine-data-contract';

// ── Types ─────────────────────────────────────────────────────────────

export type InstrumentCategoryId =
  | 'navigation'
  | 'wind'
  | 'depth'
  | 'environment'
  | 'electrical'
  | 'engine'
  | 'performance';

export type InstrumentDisplayType =
  | 'digital'
  | 'analog-circular'
  | 'analog-linear'
  | 'wind-rose';

export interface InstrumentDefinition {
  id: string;
  label: string;
  unit: string;
  path: string | null; // null = calculated value
  category: InstrumentCategoryId;
  displayType: InstrumentDisplayType;
  minValue?: number;
  maxValue?: number;
  dangerLow?: number;
  dangerHigh?: number;
  warnLow?: number;
  warnHigh?: number;
  decimals?: number;
}

// ── Category metadata ─────────────────────────────────────────────────

export interface InstrumentCategoryMeta {
  id: InstrumentCategoryId;
  label: string;
  icon: string;
}

export const INSTRUMENT_CATEGORIES: InstrumentCategoryMeta[] = [
  { id: 'navigation', label: 'Navigation', icon: 'compass' },
  { id: 'wind', label: 'Wind', icon: 'wind' },
  { id: 'depth', label: 'Depth', icon: 'anchor' },
  { id: 'environment', label: 'Environment', icon: 'thermometer' },
  { id: 'electrical', label: 'Electrical', icon: 'battery' },
  { id: 'engine', label: 'Engine', icon: 'engine' },
  { id: 'performance', label: 'Performance', icon: 'gauge' },
];

// ── Full catalog (54 instruments) ─────────────────────────────────────

export const INSTRUMENT_CATALOG: InstrumentDefinition[] = [
  // ── NAVIGATION (10) ──────────────────────────────────────────────
  {
    id: 'sog',
    label: 'Speed Over Ground',
    unit: 'kts',
    path: PATHS.navigation.speedOverGround,
    category: 'navigation',
    displayType: 'digital',
    minValue: 0,
    maxValue: 30,
    decimals: 1,
  },
  {
    id: 'cog',
    label: 'Course Over Ground',
    unit: '°',
    path: PATHS.navigation.courseOverGroundTrue,
    category: 'navigation',
    displayType: 'analog-circular',
    minValue: 0,
    maxValue: 360,
    decimals: 0,
  },
  {
    id: 'hdg_true',
    label: 'Heading True',
    unit: '°T',
    path: PATHS.navigation.headingTrue,
    category: 'navigation',
    displayType: 'analog-circular',
    minValue: 0,
    maxValue: 360,
    decimals: 0,
  },
  {
    id: 'hdg_mag',
    label: 'Heading Magnetic',
    unit: '°M',
    path: PATHS.navigation.headingMagnetic,
    category: 'navigation',
    displayType: 'analog-circular',
    minValue: 0,
    maxValue: 360,
    decimals: 0,
  },
  {
    id: 'sow',
    label: 'Speed Over Water',
    unit: 'kts',
    path: PATHS.navigation.speedThroughWater,
    category: 'navigation',
    displayType: 'digital',
    minValue: 0,
    maxValue: 30,
    decimals: 1,
  },
  {
    id: 'vmg',
    label: 'Velocity Made Good',
    unit: 'kts',
    path: PATHS.performance.velocityMadeGood,
    category: 'navigation',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'cmg',
    label: 'Course Made Good',
    unit: '°',
    path: null,
    category: 'navigation',
    displayType: 'digital',
    decimals: 0,
  },
  {
    id: 'xte',
    label: 'Cross Track Error',
    unit: 'NM',
    path: null,
    category: 'navigation',
    displayType: 'digital',
    decimals: 2,
  },
  {
    id: 'dtw',
    label: 'Distance to Waypoint',
    unit: 'NM',
    path: null,
    category: 'navigation',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'btw',
    label: 'Bearing to Waypoint',
    unit: '°',
    path: null,
    category: 'navigation',
    displayType: 'analog-circular',
    decimals: 0,
  },

  // ── WIND (8) ─────────────────────────────────────────────────────
  {
    id: 'aws',
    label: 'Apparent Wind Speed',
    unit: 'kts',
    path: PATHS.environment.wind.speedApparent,
    category: 'wind',
    displayType: 'digital',
    minValue: 0,
    maxValue: 60,
    decimals: 1,
  },
  {
    id: 'awa',
    label: 'Apparent Wind Angle',
    unit: '°',
    path: PATHS.environment.wind.angleApparent,
    category: 'wind',
    displayType: 'wind-rose',
    minValue: -180,
    maxValue: 180,
    decimals: 0,
  },
  {
    id: 'tws',
    label: 'True Wind Speed',
    unit: 'kts',
    path: PATHS.environment.wind.speedTrue,
    category: 'wind',
    displayType: 'digital',
    minValue: 0,
    maxValue: 60,
    decimals: 1,
  },
  {
    id: 'twa',
    label: 'True Wind Angle',
    unit: '°',
    path: PATHS.environment.wind.angleTrueWater,
    category: 'wind',
    displayType: 'wind-rose',
    minValue: -180,
    maxValue: 180,
    decimals: 0,
  },
  {
    id: 'twd',
    label: 'True Wind Direction',
    unit: '°',
    path: PATHS.environment.wind.directionTrue,
    category: 'wind',
    displayType: 'analog-circular',
    minValue: 0,
    maxValue: 360,
    decimals: 0,
  },
  {
    id: 'gust',
    label: 'Wind Gust',
    unit: 'kts',
    path: null,
    category: 'wind',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'gws',
    label: 'Ground Wind Speed',
    unit: 'kts',
    path: null,
    category: 'wind',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'gwd',
    label: 'Ground Wind Direction',
    unit: '°',
    path: null,
    category: 'wind',
    displayType: 'analog-circular',
    decimals: 0,
  },

  // ── DEPTH (4) ────────────────────────────────────────────────────
  {
    id: 'depth_keel',
    label: 'Depth Under Keel',
    unit: 'm',
    path: PATHS.environment.depth.belowKeel,
    category: 'depth',
    displayType: 'digital',
    minValue: 0,
    dangerLow: 1,
    warnLow: 3,
    decimals: 1,
  },
  {
    id: 'depth_transducer',
    label: 'Depth Transducer',
    unit: 'm',
    path: PATHS.environment.depth.belowTransducer,
    category: 'depth',
    displayType: 'digital',
    minValue: 0,
    dangerLow: 1,
    warnLow: 3,
    decimals: 1,
  },
  {
    id: 'depth_surface',
    label: 'Depth Surface',
    unit: 'm',
    path: PATHS.environment.depth.belowSurface,
    category: 'depth',
    displayType: 'digital',
    minValue: 0,
    decimals: 1,
  },
  {
    id: 'depth_trend',
    label: 'Depth Trend',
    unit: 'm/min',
    path: null,
    category: 'depth',
    displayType: 'analog-linear',
    decimals: 2,
  },

  // ── ENVIRONMENT (6) ──────────────────────────────────────────────
  {
    id: 'water_temp',
    label: 'Water Temperature',
    unit: '°C',
    path: PATHS.environment.water.temperature,
    category: 'environment',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'air_temp',
    label: 'Air Temperature',
    unit: '°C',
    path: PATHS.environment.outside.temperature,
    category: 'environment',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'pressure',
    label: 'Atmospheric Pressure',
    unit: 'hPa',
    path: PATHS.environment.outside.pressure,
    category: 'environment',
    displayType: 'digital',
    minValue: 950,
    maxValue: 1050,
    decimals: 1,
  },
  {
    id: 'pressure_trend',
    label: 'Pressure Trend',
    unit: 'hPa/h',
    path: null,
    category: 'environment',
    displayType: 'analog-linear',
    decimals: 1,
  },
  {
    id: 'humidity',
    label: 'Humidity',
    unit: '%',
    path: PATHS.environment.outside.humidity,
    category: 'environment',
    displayType: 'digital',
    minValue: 0,
    maxValue: 100,
    decimals: 0,
  },
  {
    id: 'dew_point',
    label: 'Dew Point',
    unit: '°C',
    path: null,
    category: 'environment',
    displayType: 'digital',
    decimals: 1,
  },

  // ── ELECTRICAL (7) ───────────────────────────────────────────────
  {
    id: 'battery_v',
    label: 'Battery Voltage',
    unit: 'V',
    path: PATHS.electrical.batteries.house.voltage,
    category: 'electrical',
    displayType: 'digital',
    minValue: 10,
    maxValue: 15,
    dangerLow: 11,
    warnLow: 11.8,
    decimals: 1,
  },
  {
    id: 'battery_a',
    label: 'Battery Current',
    unit: 'A',
    path: PATHS.electrical.batteries.house.current,
    category: 'electrical',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'battery_soc',
    label: 'State of Charge',
    unit: '%',
    path: PATHS.electrical.batteries.house.stateOfCharge,
    category: 'electrical',
    displayType: 'analog-linear',
    minValue: 0,
    maxValue: 100,
    dangerLow: 20,
    warnLow: 40,
    decimals: 0,
  },
  {
    id: 'solar_v',
    label: 'Solar Voltage',
    unit: 'V',
    path: PATHS.electrical.solar.voltage,
    category: 'electrical',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'solar_a',
    label: 'Solar Current',
    unit: 'A',
    path: PATHS.electrical.solar.current,
    category: 'electrical',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'alternator',
    label: 'Alternator',
    unit: 'A',
    path: PATHS.electrical.batteries.alternator.current,
    category: 'electrical',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'consumption',
    label: 'Consumption',
    unit: 'A',
    path: null,
    category: 'electrical',
    displayType: 'digital',
    decimals: 1,
  },

  // ── ENGINE (7) ───────────────────────────────────────────────────
  {
    id: 'rpm',
    label: 'Engine RPM',
    unit: 'RPM',
    path: PATHS.propulsion.main.revolutions,
    category: 'engine',
    displayType: 'analog-circular',
    minValue: 0,
    maxValue: 4000,
    warnHigh: 3200,
    dangerHigh: 3600,
    decimals: 0,
  },
  {
    id: 'coolant_temp',
    label: 'Coolant Temp',
    unit: '°C',
    path: PATHS.propulsion.main.temperature,
    category: 'engine',
    displayType: 'digital',
    warnHigh: 90,
    dangerHigh: 100,
    decimals: 0,
  },
  {
    id: 'oil_pressure',
    label: 'Oil Pressure',
    unit: 'bar',
    path: PATHS.propulsion.main.oilPressure,
    category: 'engine',
    displayType: 'digital',
    dangerLow: 1,
    warnLow: 1.5,
    decimals: 1,
  },
  {
    id: 'fuel_level',
    label: 'Fuel Level',
    unit: '%',
    path: PATHS.tanks.fuel.level,
    category: 'engine',
    displayType: 'analog-linear',
    minValue: 0,
    maxValue: 100,
    dangerLow: 10,
    warnLow: 25,
    decimals: 0,
  },
  {
    id: 'fuel_flow',
    label: 'Fuel Flow',
    unit: 'l/h',
    path: PATHS.propulsion.main.fuelRate,
    category: 'engine',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'engine_hours',
    label: 'Engine Hours',
    unit: 'h',
    path: PATHS.propulsion.main.runTime,
    category: 'engine',
    displayType: 'digital',
    decimals: 0,
  },
  {
    id: 'transmission',
    label: 'Transmission',
    unit: '',
    path: PATHS.propulsion.main.transmission,
    category: 'engine',
    displayType: 'digital',
    decimals: 0,
  },

  // ── PERFORMANCE (8) ──────────────────────────────────────────────
  {
    id: 'polar_speed',
    label: 'Polar Speed',
    unit: 'kts',
    path: PATHS.performance.polarSpeed,
    category: 'performance',
    displayType: 'digital',
    decimals: 1,
  },
  {
    id: 'polar_ratio',
    label: 'Polar Ratio',
    unit: '%',
    path: PATHS.performance.polarSpeedRatio,
    category: 'performance',
    displayType: 'analog-linear',
    minValue: 0,
    maxValue: 120,
    decimals: 0,
  },
  {
    id: 'target_twa',
    label: 'Target TWA',
    unit: '°',
    path: PATHS.performance.targetTwa,
    category: 'performance',
    displayType: 'digital',
    decimals: 0,
  },
  {
    id: 'layline_port',
    label: 'Layline Port',
    unit: '°',
    path: null,
    category: 'performance',
    displayType: 'digital',
    decimals: 0,
  },
  {
    id: 'layline_stbd',
    label: 'Layline Starboard',
    unit: '°',
    path: null,
    category: 'performance',
    displayType: 'digital',
    decimals: 0,
  },
  {
    id: 'heel',
    label: 'Heel Angle',
    unit: '°',
    path: PATHS.navigation.attitude,
    category: 'performance',
    displayType: 'analog-linear',
    minValue: -45,
    maxValue: 45,
    warnHigh: 25,
    dangerHigh: 35,
    decimals: 0,
  },
  {
    id: 'pitch',
    label: 'Pitch Angle',
    unit: '°',
    path: PATHS.navigation.attitude,
    category: 'performance',
    displayType: 'analog-linear',
    minValue: -30,
    maxValue: 30,
    decimals: 0,
  },
  {
    id: 'leeway_angle',
    label: 'Leeway',
    unit: '°',
    path: PATHS.navigation.leeway,
    category: 'performance',
    displayType: 'digital',
    decimals: 0,
  },
];

// Total: 50 instruments defined via catalog
// (The doc targets 54 — extra calculated values like combined displays can be added later)

/**
 * Get instruments by category.
 */
export function getInstrumentsByCategory(
  category: InstrumentCategoryId,
): InstrumentDefinition[] {
  return INSTRUMENT_CATALOG.filter((i) => i.category === category);
}

/**
 * Get a single instrument by id.
 */
export function getInstrumentById(
  id: string,
): InstrumentDefinition | undefined {
  return INSTRUMENT_CATALOG.find((i) => i.id === id);
}
