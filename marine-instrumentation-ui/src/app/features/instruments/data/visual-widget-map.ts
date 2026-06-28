/**
 * Maps catalog instrument IDs to visual widget component types.
 * Instruments NOT in this map get numeric-only rendering.
 *
 * Shared by the Instruments page and the Dashboard instrument tiles so both
 * resolve the same visual representation from a single source of truth.
 */
export type VisualWidgetType =
  | 'compass'
  | 'speedometer'
  | 'depth-gauge'
  | 'depth'
  | 'wind'
  | 'rudder'
  | 'engine-rpm'
  | 'tank'
  | 'battery'
  | 'meteo'
  | 'cog'
  | 'position'
  | 'gps-status'
  | 'autopilot-compass';

export const VISUAL_WIDGET_MAP: Record<string, VisualWidgetType> = {
  hdg_true: 'compass',
  hdg_mag: 'compass',
  cog: 'cog',
  sog: 'speedometer',
  sow: 'speedometer',
  depth_keel: 'depth',
  depth_transducer: 'depth-gauge',
  depth_surface: 'depth-gauge',
  aws: 'wind',
  awa: 'wind',
  tws: 'wind',
  twa: 'wind',
  twd: 'wind',
  rpm: 'engine-rpm',
  fuel_level: 'tank',
  battery_v: 'battery',
  battery_a: 'battery',
  battery_soc: 'battery',
  water_temp: 'meteo',
  air_temp: 'meteo',
  pressure: 'meteo',
  humidity: 'meteo',
  ap_heading: 'autopilot-compass',
};

/** Whether an instrument has a dedicated visual widget. */
export function hasVisualWidget(instrumentId: string): boolean {
  return instrumentId in VISUAL_WIDGET_MAP;
}

/** Resolve the visual widget type for an instrument, or null for numeric-only. */
export function getVisualWidgetType(instrumentId: string): VisualWidgetType | null {
  return VISUAL_WIDGET_MAP[instrumentId] ?? null;
}
