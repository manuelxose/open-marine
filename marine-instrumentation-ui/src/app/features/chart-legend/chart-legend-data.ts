// ─── Nautical Chart Legend — Static Data ──────────────────────────────────────
// Exhaustive, typed, fully offline. No services or API dependencies.
// Each category maps to a tab in the legend modal.
// ──────────────────────────────────────────────────────────────────────────────

export type LegendCategoryId =
  | 'omi-symbols'
  | 'ais-targets'
  | 'iala-a'
  | 'light-characteristics'
  | 'hazards'
  | 'bathymetry'
  | 'zones'
  | 'lines'
  | 'abbreviations'
  | 'units'
  | 'beaufort'
  | 'ais-types';

export interface LegendCategory {
  id: LegendCategoryId;
  nameKey: string;
  icon: string;
  descriptionKey: string;
  entries: LegendEntry[];
}

export interface LegendEntry {
  id: string;
  nameKey: string;
  descriptionKey: string;
  symbol: LegendSymbol;
  standard?: string;
  searchTokens?: string[];
}

export type LegendSymbol =
  | { type: 'svg'; path: string; color?: string; strokeColor?: string; fillColor?: string }
  | { type: 'color-swatch'; color: string; border?: string }
  | { type: 'text-badge'; text: string; color?: string; bgColor?: string }
  | { type: 'composite'; parts: Array<{ shape: string; color: string; position?: string }> }
  | { type: 'line'; dashArray?: string; color: string; width?: number }
  | { type: 'icon'; name: string };

// ─── Data ─────────────────────────────────────────────────────────────────────

export const LEGEND_CATEGORIES: LegendCategory[] = [

  // ═══════════════════════════════════════════════
  // 1 — OMI APPLICATION SYMBOLS
  // ═══════════════════════════════════════════════
  {
    id: 'omi-symbols',
    nameKey: 'legend.categories.omi_symbols',
    icon: 'vessel',
    descriptionKey: 'legend.categories.omi_symbols_desc',
    entries: [
      {
        id: 'own_vessel_good',
        nameKey: 'legend.omi.own_vessel_good',
        descriptionKey: 'legend.omi.own_vessel_good_desc',
        symbol: { type: 'svg', path: 'M12,2 L20,20 L12,16 L4,20 Z', color: '#0284c7', fillColor: '#38bdf8' },
        searchTokens: ['barco propio', 'own ship', 'vessel', 'GPS', 'posición', 'position'],
      },
      {
        id: 'own_vessel_stale',
        nameKey: 'legend.omi.own_vessel_stale',
        descriptionKey: 'legend.omi.own_vessel_stale_desc',
        symbol: { type: 'svg', path: 'M12,2 L20,20 L12,16 L4,20 Z', color: '#eab308', fillColor: '#fde047' },
        searchTokens: ['stale', 'antiguo', 'GPS lento', 'viejo'],
      },
      {
        id: 'own_vessel_no_fix',
        nameKey: 'legend.omi.own_vessel_no_fix',
        descriptionKey: 'legend.omi.own_vessel_no_fix_desc',
        symbol: { type: 'svg', path: 'M12,2 L20,20 L12,16 L4,20 Z', color: '#6b7280', fillColor: '#9ca3af' },
        searchTokens: ['no fix', 'sin GPS', 'señal perdida', 'lost signal'],
      },
      {
        id: 'cog_vector',
        nameKey: 'legend.omi.cog_vector',
        descriptionKey: 'legend.omi.cog_vector_desc',
        symbol: { type: 'line', color: '#f59e0b', dashArray: '4 3', width: 2 },
        searchTokens: ['COG', 'curso', 'vector', 'rumbo fondo', 'course over ground'],
      },
      {
        id: 'heading_vector',
        nameKey: 'legend.omi.heading_vector',
        descriptionKey: 'legend.omi.heading_vector_desc',
        symbol: { type: 'line', color: '#0284c7', width: 2 },
        searchTokens: ['HDG', 'heading', 'proa', 'compás', 'compass'],
      },
      {
        id: 'track_line',
        nameKey: 'legend.omi.track_line',
        descriptionKey: 'legend.omi.track_line_desc',
        symbol: { type: 'line', color: '#60a5fa', dashArray: '2 4', width: 1.5 },
        searchTokens: ['track', 'rastro', 'estela', 'recorrido', 'breadcrumb'],
      },
      {
        id: 'waypoint',
        nameKey: 'legend.omi.waypoint',
        descriptionKey: 'legend.omi.waypoint_desc',
        symbol: { type: 'icon', name: 'waypoint' },
        searchTokens: ['waypoint', 'marca', 'punto de navegación', 'mark'],
      },
      {
        id: 'range_rings',
        nameKey: 'legend.omi.range_rings',
        descriptionKey: 'legend.omi.range_rings_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'circle', color: 'rgba(255,255,255,0.3)', position: 'r=30' },
            { shape: 'circle', color: 'rgba(255,255,255,0.3)', position: 'r=20' },
          ],
        },
        searchTokens: ['range rings', 'anillos distancia', 'distancias', 'circles'],
      },
      {
        id: 'bearing_line',
        nameKey: 'legend.omi.bearing_line',
        descriptionKey: 'legend.omi.bearing_line_desc',
        symbol: { type: 'line', color: '#a78bfa', dashArray: '6 3', width: 1.5 },
        searchTokens: ['bearing line', 'marcación', 'línea destino', 'waypoint activo'],
      },
      {
        id: 'true_wind_arrow',
        nameKey: 'legend.omi.true_wind',
        descriptionKey: 'legend.omi.true_wind_desc',
        symbol: { type: 'line', color: '#34d399', width: 2 },
        searchTokens: ['TWD', 'viento verdadero', 'true wind', 'wind direction'],
      },
      {
        id: 'active_route',
        nameKey: 'legend.omi.active_route',
        descriptionKey: 'legend.omi.active_route_desc',
        symbol: { type: 'line', color: '#c084fc', dashArray: '5 3', width: 1.5 },
        searchTokens: ['ruta', 'route', 'plan', 'waypoints planificados'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 2 — AIS TARGETS
  // ═══════════════════════════════════════════════
  {
    id: 'ais-targets',
    nameKey: 'legend.categories.ais_targets',
    icon: 'ais',
    descriptionKey: 'legend.categories.ais_targets_desc',
    entries: [
      {
        id: 'ais_class_a_moving',
        nameKey: 'legend.ais.class_a_moving',
        descriptionKey: 'legend.ais.class_a_moving_desc',
        symbol: { type: 'svg', path: 'M12,4 L16,18 L12,15 L8,18 Z', fillColor: '#e5e7eb', color: '#9ca3af' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['Class A', 'SOLAS', 'cargo', 'tanker', 'passenger'],
      },
      {
        id: 'ais_class_b_moving',
        nameKey: 'legend.ais.class_b_moving',
        descriptionKey: 'legend.ais.class_b_moving_desc',
        symbol: { type: 'svg', path: 'M12,4 L16,18 L12,15 L8,18 Z', fillColor: 'transparent', color: '#9ca3af' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['Class B', 'pleasure', 'sailing', 'recreational', 'recreo'],
      },
      {
        id: 'ais_dangerous',
        nameKey: 'legend.ais.dangerous',
        descriptionKey: 'legend.ais.dangerous_desc',
        symbol: { type: 'icon', name: 'alert-triangle' },
        searchTokens: ['CPA', 'TCPA', 'colisión', 'peligro', 'collision warning', 'danger'],
      },
      {
        id: 'ais_anchored',
        nameKey: 'legend.ais.anchored',
        descriptionKey: 'legend.ais.anchored_desc',
        symbol: { type: 'icon', name: 'anchor' },
        searchTokens: ['fondeado', 'amarrado', 'anchored', 'moored', 'SOG 0'],
      },
      {
        id: 'ais_aton',
        nameKey: 'legend.ais.aton',
        descriptionKey: 'legend.ais.aton_desc',
        symbol: { type: 'icon', name: 'crosshair' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['AtoN', 'aid to navigation', 'boya', 'buoy', 'transponder'],
      },
      {
        id: 'ais_base_station',
        nameKey: 'legend.ais.base_station',
        descriptionKey: 'legend.ais.base_station_desc',
        symbol: { type: 'icon', name: 'radio' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['base station', 'estación base', 'shore', 'tierra'],
      },
      {
        id: 'ais_track',
        nameKey: 'legend.ais.track',
        descriptionKey: 'legend.ais.track_desc',
        symbol: { type: 'line', color: '#9ca3af', width: 1.5 },
        searchTokens: ['AIS track', 'estela AIS', 'historial', 'trail'],
      },
      {
        id: 'ais_prediction',
        nameKey: 'legend.ais.prediction',
        descriptionKey: 'legend.ais.prediction_desc',
        symbol: { type: 'line', color: '#f59e0b', dashArray: '3 3', width: 1.5 },
        searchTokens: ['predicción', 'prediction', 'trayectoria futura', 'future track'],
      },
      {
        id: 'cpa_line',
        nameKey: 'legend.ais.cpa_line',
        descriptionKey: 'legend.ais.cpa_line_desc',
        symbol: { type: 'line', color: '#ef4444', width: 1.5 },
        searchTokens: ['CPA line', 'colisión', 'máximo acercamiento', 'closest point'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 3 — IALA-A BUOYAGE
  // ═══════════════════════════════════════════════
  {
    id: 'iala-a',
    nameKey: 'legend.categories.iala_a',
    icon: 'anchor',
    descriptionKey: 'legend.categories.iala_a_desc',
    entries: [
      {
        id: 'port_mark',
        nameKey: 'legend.iala.port_mark',
        descriptionKey: 'legend.iala.port_mark_desc',
        symbol: { type: 'color-swatch', color: '#cc2222', border: '#cc2222' },
        standard: 'IALA-A',
        searchTokens: ['babor', 'port', 'rojo', 'red', 'lateral'],
      },
      {
        id: 'starboard_mark',
        nameKey: 'legend.iala.starboard_mark',
        descriptionKey: 'legend.iala.starboard_mark_desc',
        symbol: { type: 'color-swatch', color: '#1a7a1a', border: '#1a7a1a' },
        standard: 'IALA-A',
        searchTokens: ['estribor', 'starboard', 'verde', 'green', 'lateral'],
      },
      {
        id: 'cardinal_north',
        nameKey: 'legend.iala.cardinal_north',
        descriptionKey: 'legend.iala.cardinal_north_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'top-half', color: '#1a1a1a', position: 'top' },
            { shape: 'bottom-half', color: '#ffff00', position: 'bottom' },
          ],
        },
        standard: 'IALA-A',
        searchTokens: ['cardinal norte', 'north cardinal', 'VQ', 'peligro al sur'],
      },
      {
        id: 'cardinal_south',
        nameKey: 'legend.iala.cardinal_south',
        descriptionKey: 'legend.iala.cardinal_south_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'top-half', color: '#ffff00', position: 'top' },
            { shape: 'bottom-half', color: '#1a1a1a', position: 'bottom' },
          ],
        },
        standard: 'IALA-A',
        searchTokens: ['cardinal sur', 'south cardinal', 'VQ(6)', 'peligro al norte'],
      },
      {
        id: 'cardinal_east',
        nameKey: 'legend.iala.cardinal_east',
        descriptionKey: 'legend.iala.cardinal_east_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'band', color: '#1a1a1a', position: 'top-bottom' },
            { shape: 'band', color: '#ffff00', position: 'middle' },
          ],
        },
        standard: 'IALA-A',
        searchTokens: ['cardinal este', 'east cardinal', 'VQ(3)', 'peligro al oeste'],
      },
      {
        id: 'cardinal_west',
        nameKey: 'legend.iala.cardinal_west',
        descriptionKey: 'legend.iala.cardinal_west_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'band', color: '#ffff00', position: 'top-bottom' },
            { shape: 'band', color: '#1a1a1a', position: 'middle' },
          ],
        },
        standard: 'IALA-A',
        searchTokens: ['cardinal oeste', 'west cardinal', 'VQ(9)', 'peligro al este'],
      },
      {
        id: 'safe_water',
        nameKey: 'legend.iala.safe_water',
        descriptionKey: 'legend.iala.safe_water_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'stripe', color: '#cc2222', position: 'vertical-alternating' },
            { shape: 'stripe', color: '#ffffff', position: 'vertical-alternating' },
          ],
        },
        standard: 'IALA-A',
        searchTokens: ['aguas seguras', 'safe water', 'fairway', 'midchannel'],
      },
      {
        id: 'isolated_danger',
        nameKey: 'legend.iala.isolated_danger',
        descriptionKey: 'legend.iala.isolated_danger_desc',
        symbol: {
          type: 'composite', parts: [
            { shape: 'stripe', color: '#cc2222', position: 'horizontal' },
            { shape: 'stripe', color: '#1a1a1a', position: 'horizontal' },
          ],
        },
        standard: 'IALA-A',
        searchTokens: ['peligro aislado', 'isolated danger', 'Fl(2)'],
      },
      {
        id: 'special_mark',
        nameKey: 'legend.iala.special_mark',
        descriptionKey: 'legend.iala.special_mark_desc',
        symbol: { type: 'color-swatch', color: '#ffaa00', border: '#ffaa00' },
        standard: 'IALA-A',
        searchTokens: ['especial', 'special', 'amarillo', 'yellow', 'fondeo especial'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 4 — LIGHT CHARACTERISTICS
  // ═══════════════════════════════════════════════
  {
    id: 'light-characteristics',
    nameKey: 'legend.categories.lights',
    icon: 'satellite',
    descriptionKey: 'legend.categories.lights_desc',
    entries: [
      {
        id: 'light_fixed',
        nameKey: 'legend.lights.fixed',
        descriptionKey: 'legend.lights.fixed_desc',
        symbol: { type: 'text-badge', text: 'F', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['fija', 'fixed', 'continuous'],
      },
      {
        id: 'light_fl',
        nameKey: 'legend.lights.fl',
        descriptionKey: 'legend.lights.fl_desc',
        symbol: { type: 'text-badge', text: 'Fl', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['centelleante', 'flash', 'destellos', 'flashing'],
      },
      {
        id: 'light_lfl',
        nameKey: 'legend.lights.lfl',
        descriptionKey: 'legend.lights.lfl_desc',
        symbol: { type: 'text-badge', text: 'LFl', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['destello largo', 'long flash'],
      },
      {
        id: 'light_q',
        nameKey: 'legend.lights.q',
        descriptionKey: 'legend.lights.q_desc',
        symbol: { type: 'text-badge', text: 'Q', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['rápida', 'quick', 'cardinal'],
      },
      {
        id: 'light_vq',
        nameKey: 'legend.lights.vq',
        descriptionKey: 'legend.lights.vq_desc',
        symbol: { type: 'text-badge', text: 'VQ', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['muy rápida', 'very quick', 'cardinal norte'],
      },
      {
        id: 'light_uq',
        nameKey: 'legend.lights.uq',
        descriptionKey: 'legend.lights.uq_desc',
        symbol: { type: 'text-badge', text: 'UQ', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['ultra rápida', 'ultra quick'],
      },
      {
        id: 'light_iso',
        nameKey: 'legend.lights.iso',
        descriptionKey: 'legend.lights.iso_desc',
        symbol: { type: 'text-badge', text: 'Iso', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['isofase', 'isophase', 'igual'],
      },
      {
        id: 'light_oc',
        nameKey: 'legend.lights.oc',
        descriptionKey: 'legend.lights.oc_desc',
        symbol: { type: 'text-badge', text: 'Oc', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['ocultación', 'occulting'],
      },
      {
        id: 'light_al',
        nameKey: 'legend.lights.al',
        descriptionKey: 'legend.lights.al_desc',
        symbol: { type: 'text-badge', text: 'Al', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['alternante', 'alternating', 'colores'],
      },
      {
        id: 'light_mo',
        nameKey: 'legend.lights.mo',
        descriptionKey: 'legend.lights.mo_desc',
        symbol: { type: 'text-badge', text: 'Mo', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['morse', 'Mo(A)', 'Mo(U)'],
      },
      {
        id: 'light_red',
        nameKey: 'legend.lights.red_sector',
        descriptionKey: 'legend.lights.red_sector_desc',
        symbol: { type: 'color-swatch', color: '#cc2222' },
        standard: 'IHO INT 1',
        searchTokens: ['sector rojo', 'peligro', 'zona prohibida', 'red sector'],
      },
      {
        id: 'light_green',
        nameKey: 'legend.lights.green_sector',
        descriptionKey: 'legend.lights.green_sector_desc',
        symbol: { type: 'color-swatch', color: '#1a7a1a' },
        standard: 'IHO INT 1',
        searchTokens: ['sector verde', 'canal seguro', 'green sector'],
      },
      {
        id: 'light_white',
        nameKey: 'legend.lights.white_sector',
        descriptionKey: 'legend.lights.white_sector_desc',
        symbol: { type: 'color-swatch', color: '#eeeeee', border: '#999999' },
        standard: 'IHO INT 1',
        searchTokens: ['sector blanco', 'white sector', 'W'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 5 — HAZARDS & SEABED
  // ═══════════════════════════════════════════════
  {
    id: 'hazards',
    nameKey: 'legend.categories.hazards',
    icon: 'warning',
    descriptionKey: 'legend.categories.hazards_desc',
    entries: [
      {
        id: 'rock_submerged',
        nameKey: 'legend.hazards.rock_submerged',
        descriptionKey: 'legend.hazards.rock_submerged_desc',
        symbol: { type: 'text-badge', text: '+', bgColor: 'transparent', color: '#8b0000' },
        standard: 'IHO INT 1 — K10',
        searchTokens: ['roca sumergida', 'submerged rock', 'bajo'],
      },
      {
        id: 'rock_awash',
        nameKey: 'legend.hazards.rock_awash',
        descriptionKey: 'legend.hazards.rock_awash_desc',
        symbol: { type: 'text-badge', text: '*', bgColor: 'transparent', color: '#8b0000' },
        standard: 'IHO INT 1 — K11',
        searchTokens: ['roca a flor', 'rock awash', 'media marea'],
      },
      {
        id: 'wreck_dangerous',
        nameKey: 'legend.hazards.wreck_dangerous',
        descriptionKey: 'legend.hazards.wreck_dangerous_desc',
        symbol: { type: 'text-badge', text: '⚓', bgColor: 'transparent', color: '#8b4500' },
        standard: 'IHO INT 1 — K20-K30',
        searchTokens: ['pecio', 'wreck', 'barco hundido', 'obstáculo'],
      },
      {
        id: 'shoal',
        nameKey: 'legend.hazards.shoal',
        descriptionKey: 'legend.hazards.shoal_desc',
        symbol: { type: 'color-swatch', color: '#aee4f5', border: '#7ab3c8' },
        standard: 'IHO INT 1',
        searchTokens: ['bajo', 'shoal', 'poco fondo', 'arena', 'shallow'],
      },
      {
        id: 'obstruction',
        nameKey: 'legend.hazards.obstruction',
        descriptionKey: 'legend.hazards.obstruction_desc',
        symbol: { type: 'text-badge', text: '⊗', bgColor: 'transparent', color: '#8b6914' },
        standard: 'IHO INT 1 — L20',
        searchTokens: ['obstáculo', 'obstruction', 'cable submarino', 'cable'],
      },
      {
        id: 'seabed_sand',
        nameKey: 'legend.hazards.seabed_sand',
        descriptionKey: 'legend.hazards.seabed_sand_desc',
        symbol: { type: 'text-badge', text: 'S', bgColor: 'transparent', color: '#8b7355' },
        standard: 'IHO INT 1 — J',
        searchTokens: ['arena', 'sand', 'fondo', 'seabed'],
      },
      {
        id: 'seabed_mud',
        nameKey: 'legend.hazards.seabed_mud',
        descriptionKey: 'legend.hazards.seabed_mud_desc',
        symbol: { type: 'text-badge', text: 'M', bgColor: 'transparent', color: '#8b7355' },
        standard: 'IHO INT 1 — J',
        searchTokens: ['fango', 'mud', 'fondo', 'lodo'],
      },
      {
        id: 'seabed_rock',
        nameKey: 'legend.hazards.seabed_rock',
        descriptionKey: 'legend.hazards.seabed_rock_desc',
        symbol: { type: 'text-badge', text: 'R', bgColor: 'transparent', color: '#8b7355' },
        standard: 'IHO INT 1 — J',
        searchTokens: ['roca', 'rock', 'fondo rocoso', 'rocky'],
      },
      {
        id: 'seabed_coral',
        nameKey: 'legend.hazards.seabed_coral',
        descriptionKey: 'legend.hazards.seabed_coral_desc',
        symbol: { type: 'text-badge', text: 'Co', bgColor: 'transparent', color: '#8b7355' },
        standard: 'IHO INT 1 — J',
        searchTokens: ['coral', 'arrecife', 'reef'],
      },
      {
        id: 'seabed_weed',
        nameKey: 'legend.hazards.seabed_weed',
        descriptionKey: 'legend.hazards.seabed_weed_desc',
        symbol: { type: 'text-badge', text: 'Wd', bgColor: 'transparent', color: '#8b7355' },
        standard: 'IHO INT 1 — J',
        searchTokens: ['algas', 'weed', 'kelp', 'posidonia'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 6 — BATHYMETRY
  // ═══════════════════════════════════════════════
  {
    id: 'bathymetry',
    nameKey: 'legend.categories.bathymetry',
    icon: 'depth',
    descriptionKey: 'legend.categories.bathymetry_desc',
    entries: [
      {
        id: 'depth_shallow',
        nameKey: 'legend.bathy.depth_shallow',
        descriptionKey: 'legend.bathy.depth_shallow_desc',
        symbol: { type: 'color-swatch', color: '#b3e0f2', border: '#80c8e0' },
        searchTokens: ['0-5m', 'poco fondo', 'shallow', 'peligro', 'danger zone'],
      },
      {
        id: 'depth_medium',
        nameKey: 'legend.bathy.depth_medium',
        descriptionKey: 'legend.bathy.depth_medium_desc',
        symbol: { type: 'color-swatch', color: '#7ab8d4', border: '#5a98b4' },
        searchTokens: ['5-20m', 'precaución', 'caution'],
      },
      {
        id: 'depth_deep',
        nameKey: 'legend.bathy.depth_deep',
        descriptionKey: 'legend.bathy.depth_deep_desc',
        symbol: { type: 'color-swatch', color: '#3a7898', border: '#2a5878' },
        searchTokens: ['20m+', 'profundo', 'deep', 'seguro', 'safe'],
      },
      {
        id: 'contour_thin',
        nameKey: 'legend.bathy.contour_thin',
        descriptionKey: 'legend.bathy.contour_thin_desc',
        symbol: { type: 'line', color: '#5a98b4', width: 1 },
        searchTokens: ['isolínea', 'contour', '2m', '5m', 'depth line'],
      },
      {
        id: 'contour_medium',
        nameKey: 'legend.bathy.contour_medium',
        descriptionKey: 'legend.bathy.contour_medium_desc',
        symbol: { type: 'line', color: '#4a88a4', width: 1.5 },
        searchTokens: ['isolínea', 'contour', '10m', '20m'],
      },
      {
        id: 'contour_thick',
        nameKey: 'legend.bathy.contour_thick',
        descriptionKey: 'legend.bathy.contour_thick_desc',
        symbol: { type: 'line', color: '#3a7898', width: 2.5 },
        searchTokens: ['isolínea', 'contour', '50m', '100m', '200m'],
      },
      {
        id: 'sounding',
        nameKey: 'legend.bathy.sounding',
        descriptionKey: 'legend.bathy.sounding_desc',
        symbol: { type: 'text-badge', text: '5.3', bgColor: 'transparent', color: '#3a7898' },
        searchTokens: ['sonda', 'profundidad', 'sounding', 'depth number'],
      },
      {
        id: 'safety_depth',
        nameKey: 'legend.bathy.safety_depth',
        descriptionKey: 'legend.bathy.safety_depth_desc',
        symbol: { type: 'color-swatch', color: '#ffcccc', border: '#ff4444' },
        searchTokens: ['calado seguridad', 'safety contour', 'under keel', 'ENC'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 7 — ZONES & AREAS
  // ═══════════════════════════════════════════════
  {
    id: 'zones',
    nameKey: 'legend.categories.zones',
    icon: 'layers',
    descriptionKey: 'legend.categories.zones_desc',
    entries: [
      {
        id: 'tss',
        nameKey: 'legend.zones.tss',
        descriptionKey: 'legend.zones.tss_desc',
        symbol: { type: 'line', color: '#6366f1', dashArray: '6 3', width: 2 },
        standard: 'IMO COLREG Rule 10',
        searchTokens: ['TSS', 'separación tráfico', 'traffic separation', 'dispositivo'],
      },
      {
        id: 'restricted',
        nameKey: 'legend.zones.restricted',
        descriptionKey: 'legend.zones.restricted_desc',
        symbol: { type: 'line', color: '#ef4444', dashArray: '3 3', width: 2 },
        searchTokens: ['restringida', 'restricted', 'prohibida', 'forbidden'],
      },
      {
        id: 'anchorage',
        nameKey: 'legend.zones.anchorage',
        descriptionKey: 'legend.zones.anchorage_desc',
        symbol: { type: 'icon', name: 'anchor' },
        searchTokens: ['fondeo', 'anchorage', 'mouillage', 'fondeadero'],
      },
      {
        id: 'caution',
        nameKey: 'legend.zones.caution',
        descriptionKey: 'legend.zones.caution_desc',
        symbol: { type: 'line', color: '#f97316', dashArray: '2 2 6 2', width: 2 },
        searchTokens: ['precaución', 'caution', 'cuidado', 'warning area'],
      },
      {
        id: 'special_area',
        nameKey: 'legend.zones.special_area',
        descriptionKey: 'legend.zones.special_area_desc',
        symbol: { type: 'line', color: '#eab308', dashArray: '5 3', width: 1.5 },
        searchTokens: ['especial', 'special', 'regulación', 'regulation'],
      },
      {
        id: 'protected',
        nameKey: 'legend.zones.protected',
        descriptionKey: 'legend.zones.protected_desc',
        symbol: { type: 'line', color: '#22c55e', width: 2 },
        searchTokens: ['protegida', 'protected', 'parque marino', 'marine park', 'reserva'],
      },
      {
        id: 'military',
        nameKey: 'legend.zones.military',
        descriptionKey: 'legend.zones.military_desc',
        symbol: { type: 'line', color: '#ef4444', dashArray: '8 3', width: 2 },
        searchTokens: ['militar', 'military', 'ejercicio', 'exercise', 'firing'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 8 — LINES & LIMITS
  // ═══════════════════════════════════════════════
  {
    id: 'lines',
    nameKey: 'legend.categories.lines',
    icon: 'ruler',
    descriptionKey: 'legend.categories.lines_desc',
    entries: [
      {
        id: 'shoreline',
        nameKey: 'legend.lines.shoreline',
        descriptionKey: 'legend.lines.shoreline_desc',
        symbol: { type: 'line', color: '#1a1a1a', width: 2.5 },
        searchTokens: ['costa', 'shoreline', 'coastline', 'tierra', 'land'],
      },
      {
        id: 'territorial',
        nameKey: 'legend.lines.territorial',
        descriptionKey: 'legend.lines.territorial_desc',
        symbol: { type: 'line', color: '#6b7280', dashArray: '3 3', width: 1 },
        searchTokens: ['territorial', '12 millas', '12 NM', 'aguas territoriales'],
      },
      {
        id: 'eez',
        nameKey: 'legend.lines.eez',
        descriptionKey: 'legend.lines.eez_desc',
        symbol: { type: 'line', color: '#6b7280', dashArray: '6 3 2 3', width: 1 },
        searchTokens: ['ZEE', 'EEZ', 'exclusiva', 'exclusive', '200 millas', '200 NM'],
      },
      {
        id: 'international',
        nameKey: 'legend.lines.international',
        descriptionKey: 'legend.lines.international_desc',
        symbol: { type: 'line', color: '#ef4444', width: 1.5 },
        searchTokens: ['internacional', 'international', 'frontera', 'border'],
      },
      {
        id: 'depth_contour',
        nameKey: 'legend.lines.depth_contour',
        descriptionKey: 'legend.lines.depth_contour_desc',
        symbol: { type: 'line', color: '#5a98b4', dashArray: '4 2', width: 1 },
        searchTokens: ['batimétrica', 'depth contour', 'isobath', 'sondas iguales'],
      },
      {
        id: 'port_limit',
        nameKey: 'legend.lines.port_limit',
        descriptionKey: 'legend.lines.port_limit_desc',
        symbol: { type: 'line', color: '#22c55e', dashArray: '5 5', width: 1 },
        searchTokens: ['puerto', 'port limit', 'aguas portuarias', 'harbour'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 9 — ABBREVIATIONS
  // ═══════════════════════════════════════════════
  {
    id: 'abbreviations',
    nameKey: 'legend.categories.abbreviations',
    icon: 'info',
    descriptionKey: 'legend.categories.abbreviations_desc',
    entries: [
      {
        id: 'abbr_sog',
        nameKey: 'legend.abbr.sog',
        descriptionKey: 'legend.abbr.sog_desc',
        symbol: { type: 'text-badge', text: 'SOG', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['speed over ground', 'velocidad fondo', 'speed'],
      },
      {
        id: 'abbr_cog',
        nameKey: 'legend.abbr.cog',
        descriptionKey: 'legend.abbr.cog_desc',
        symbol: { type: 'text-badge', text: 'COG', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['course over ground', 'rumbo fondo', 'course'],
      },
      {
        id: 'abbr_hdg',
        nameKey: 'legend.abbr.hdg',
        descriptionKey: 'legend.abbr.hdg_desc',
        symbol: { type: 'text-badge', text: 'HDG', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['heading', 'proa', 'rumbo quilla'],
      },
      {
        id: 'abbr_twd',
        nameKey: 'legend.abbr.twd',
        descriptionKey: 'legend.abbr.twd_desc',
        symbol: { type: 'text-badge', text: 'TWD', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['true wind direction', 'viento verdadero'],
      },
      {
        id: 'abbr_tws',
        nameKey: 'legend.abbr.tws',
        descriptionKey: 'legend.abbr.tws_desc',
        symbol: { type: 'text-badge', text: 'TWS', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['true wind speed', 'velocidad viento'],
      },
      {
        id: 'abbr_awa',
        nameKey: 'legend.abbr.awa',
        descriptionKey: 'legend.abbr.awa_desc',
        symbol: { type: 'text-badge', text: 'AWA', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['apparent wind angle', 'viento aparente'],
      },
      {
        id: 'abbr_aws',
        nameKey: 'legend.abbr.aws',
        descriptionKey: 'legend.abbr.aws_desc',
        symbol: { type: 'text-badge', text: 'AWS', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['apparent wind speed', 'velocidad viento aparente'],
      },
      {
        id: 'abbr_rot',
        nameKey: 'legend.abbr.rot',
        descriptionKey: 'legend.abbr.rot_desc',
        symbol: { type: 'text-badge', text: 'ROT', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['rate of turn', 'velocidad giro'],
      },
      {
        id: 'abbr_cpa',
        nameKey: 'legend.abbr.cpa',
        descriptionKey: 'legend.abbr.cpa_desc',
        symbol: { type: 'text-badge', text: 'CPA', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['closest point of approach', 'máximo acercamiento', 'colisión'],
      },
      {
        id: 'abbr_tcpa',
        nameKey: 'legend.abbr.tcpa',
        descriptionKey: 'legend.abbr.tcpa_desc',
        symbol: { type: 'text-badge', text: 'TCPA', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['time to CPA', 'tiempo CPA'],
      },
      {
        id: 'abbr_vmg',
        nameKey: 'legend.abbr.vmg',
        descriptionKey: 'legend.abbr.vmg_desc',
        symbol: { type: 'text-badge', text: 'VMG', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['velocity made good', 'velocidad objetivo'],
      },
      {
        id: 'abbr_xte',
        nameKey: 'legend.abbr.xte',
        descriptionKey: 'legend.abbr.xte_desc',
        symbol: { type: 'text-badge', text: 'XTE', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['cross track error', 'error derrota'],
      },
      {
        id: 'abbr_mmsi',
        nameKey: 'legend.abbr.mmsi',
        descriptionKey: 'legend.abbr.mmsi_desc',
        symbol: { type: 'text-badge', text: 'MMSI', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['Maritime Mobile Service Identity', 'identidad', '9 dígitos'],
      },
      {
        id: 'abbr_ais',
        nameKey: 'legend.abbr.ais_abbr',
        descriptionKey: 'legend.abbr.ais_abbr_desc',
        symbol: { type: 'text-badge', text: 'AIS', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['automatic identification system', 'identificación automática'],
      },
      {
        id: 'abbr_gnss',
        nameKey: 'legend.abbr.gnss',
        descriptionKey: 'legend.abbr.gnss_desc',
        symbol: { type: 'text-badge', text: 'GNSS', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['global navigation satellite', 'navegación satélite', 'GPS'],
      },
      {
        id: 'abbr_vhf',
        nameKey: 'legend.abbr.vhf',
        descriptionKey: 'legend.abbr.vhf_desc',
        symbol: { type: 'text-badge', text: 'VHF', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['very high frequency', 'radio marina', 'channel 16'],
      },
      {
        id: 'abbr_epirb',
        nameKey: 'legend.abbr.epirb',
        descriptionKey: 'legend.abbr.epirb_desc',
        symbol: { type: 'text-badge', text: 'EPIRB', bgColor: '#1e293b', color: '#94a3b8' },
        searchTokens: ['emergency position', 'radiobaliza', 'emergency beacon'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 10 — UNITS & CONVERSIONS
  // ═══════════════════════════════════════════════
  {
    id: 'units',
    nameKey: 'legend.categories.units',
    icon: 'ruler',
    descriptionKey: 'legend.categories.units_desc',
    entries: [
      {
        id: 'unit_nm',
        nameKey: 'legend.units.nm',
        descriptionKey: 'legend.units.nm_desc',
        symbol: { type: 'text-badge', text: 'NM', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['milla náutica', 'nautical mile', '1852m', 'distancia'],
      },
      {
        id: 'unit_cable',
        nameKey: 'legend.units.cable',
        descriptionKey: 'legend.units.cable_desc',
        symbol: { type: 'text-badge', text: 'cab', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['cable', '185.2m', '0.1 NM'],
      },
      {
        id: 'unit_fathom',
        nameKey: 'legend.units.fathom',
        descriptionKey: 'legend.units.fathom_desc',
        symbol: { type: 'text-badge', text: 'fm', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['braza', 'fathom', '1.829m', 'profundidad antigua'],
      },
      {
        id: 'unit_knot',
        nameKey: 'legend.units.knot',
        descriptionKey: 'legend.units.knot_desc',
        symbol: { type: 'text-badge', text: 'kn', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['nudo', 'knot', 'NM/h', '0.5144 m/s', 'velocidad'],
      },
      {
        id: 'unit_degrees_true',
        nameKey: 'legend.units.degrees_true',
        descriptionKey: 'legend.units.degrees_true_desc',
        symbol: { type: 'text-badge', text: '°T', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['grados verdaderos', 'true degrees', 'norte verdadero', 'north true'],
      },
      {
        id: 'unit_degrees_mag',
        nameKey: 'legend.units.degrees_mag',
        descriptionKey: 'legend.units.degrees_mag_desc',
        symbol: { type: 'text-badge', text: '°M', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['grados magnéticos', 'magnetic degrees', 'norte magnético', 'compás'],
      },
      {
        id: 'unit_hpa',
        nameKey: 'legend.units.hpa',
        descriptionKey: 'legend.units.hpa_desc',
        symbol: { type: 'text-badge', text: 'hPa', bgColor: '#1e293b', color: '#60a5fa' },
        searchTokens: ['hectopascal', 'presión', 'pressure', 'mbar', '1013.25'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 11 — BEAUFORT & DOUGLAS
  // ═══════════════════════════════════════════════
  {
    id: 'beaufort',
    nameKey: 'legend.categories.beaufort',
    icon: 'wind',
    descriptionKey: 'legend.categories.beaufort_desc',
    entries: [
      {
        id: 'bft_0',
        nameKey: 'legend.beaufort.bft_0',
        descriptionKey: 'legend.beaufort.bft_0_desc',
        symbol: { type: 'text-badge', text: '0', bgColor: '#e0f2fe', color: '#0284c7' },
        searchTokens: ['calma', 'calm', '<1 kn', 'espejo', 'glassy'],
      },
      {
        id: 'bft_1',
        nameKey: 'legend.beaufort.bft_1',
        descriptionKey: 'legend.beaufort.bft_1_desc',
        symbol: { type: 'text-badge', text: '1', bgColor: '#e0f2fe', color: '#0284c7' },
        searchTokens: ['ventolina', 'light air', '1-3 kn'],
      },
      {
        id: 'bft_2',
        nameKey: 'legend.beaufort.bft_2',
        descriptionKey: 'legend.beaufort.bft_2_desc',
        symbol: { type: 'text-badge', text: '2', bgColor: '#bae6fd', color: '#0369a1' },
        searchTokens: ['flojito', 'light breeze', '4-6 kn'],
      },
      {
        id: 'bft_3',
        nameKey: 'legend.beaufort.bft_3',
        descriptionKey: 'legend.beaufort.bft_3_desc',
        symbol: { type: 'text-badge', text: '3', bgColor: '#bae6fd', color: '#0369a1' },
        searchTokens: ['flojo', 'gentle breeze', '7-10 kn'],
      },
      {
        id: 'bft_4',
        nameKey: 'legend.beaufort.bft_4',
        descriptionKey: 'legend.beaufort.bft_4_desc',
        symbol: { type: 'text-badge', text: '4', bgColor: '#7dd3fc', color: '#075985' },
        searchTokens: ['bonancible', 'moderate breeze', '11-16 kn'],
      },
      {
        id: 'bft_5',
        nameKey: 'legend.beaufort.bft_5',
        descriptionKey: 'legend.beaufort.bft_5_desc',
        symbol: { type: 'text-badge', text: '5', bgColor: '#7dd3fc', color: '#075985' },
        searchTokens: ['fresquito', 'fresh breeze', '17-21 kn'],
      },
      {
        id: 'bft_6',
        nameKey: 'legend.beaufort.bft_6',
        descriptionKey: 'legend.beaufort.bft_6_desc',
        symbol: { type: 'text-badge', text: '6', bgColor: '#fde68a', color: '#92400e' },
        searchTokens: ['fresco', 'strong breeze', '22-27 kn'],
      },
      {
        id: 'bft_7',
        nameKey: 'legend.beaufort.bft_7',
        descriptionKey: 'legend.beaufort.bft_7_desc',
        symbol: { type: 'text-badge', text: '7', bgColor: '#fde68a', color: '#92400e' },
        searchTokens: ['frescachón', 'near gale', '28-33 kn'],
      },
      {
        id: 'bft_8',
        nameKey: 'legend.beaufort.bft_8',
        descriptionKey: 'legend.beaufort.bft_8_desc',
        symbol: { type: 'text-badge', text: '8', bgColor: '#fed7aa', color: '#9a3412' },
        searchTokens: ['temporal', 'gale', '34-40 kn'],
      },
      {
        id: 'bft_9',
        nameKey: 'legend.beaufort.bft_9',
        descriptionKey: 'legend.beaufort.bft_9_desc',
        symbol: { type: 'text-badge', text: '9', bgColor: '#fed7aa', color: '#9a3412' },
        searchTokens: ['temporal fuerte', 'strong gale', '41-47 kn'],
      },
      {
        id: 'bft_10',
        nameKey: 'legend.beaufort.bft_10',
        descriptionKey: 'legend.beaufort.bft_10_desc',
        symbol: { type: 'text-badge', text: '10', bgColor: '#fecaca', color: '#991b1b' },
        searchTokens: ['temporal duro', 'storm', '48-55 kn'],
      },
      {
        id: 'bft_11',
        nameKey: 'legend.beaufort.bft_11',
        descriptionKey: 'legend.beaufort.bft_11_desc',
        symbol: { type: 'text-badge', text: '11', bgColor: '#fecaca', color: '#991b1b' },
        searchTokens: ['temporal muy duro', 'violent storm', '56-63 kn'],
      },
      {
        id: 'bft_12',
        nameKey: 'legend.beaufort.bft_12',
        descriptionKey: 'legend.beaufort.bft_12_desc',
        symbol: { type: 'text-badge', text: '12', bgColor: '#fca5a5', color: '#7f1d1d' },
        searchTokens: ['huracán', 'hurricane', '64+ kn', 'tormenta máxima'],
      },
    ],
  },

  // ═══════════════════════════════════════════════
  // 12 — AIS SHIP TYPES (ITU-R M.1371-5)
  // ═══════════════════════════════════════════════
  {
    id: 'ais-types',
    nameKey: 'legend.categories.ais_types',
    icon: 'vessel',
    descriptionKey: 'legend.categories.ais_types_desc',
    entries: [
      {
        id: 'type_wig',
        nameKey: 'legend.ais_types.wig',
        descriptionKey: 'legend.ais_types.wig_desc',
        symbol: { type: 'text-badge', text: '20', bgColor: '#1e293b', color: '#94a3b8' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['wing in ground', 'WIG', 'efecto suelo'],
      },
      {
        id: 'type_fishing',
        nameKey: 'legend.ais_types.fishing',
        descriptionKey: 'legend.ais_types.fishing_desc',
        symbol: { type: 'text-badge', text: '30', bgColor: '#1e293b', color: '#f59e0b' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['pesquero', 'fishing', 'pesca', 'trawler'],
      },
      {
        id: 'type_towing',
        nameKey: 'legend.ais_types.towing',
        descriptionKey: 'legend.ais_types.towing_desc',
        symbol: { type: 'text-badge', text: '31', bgColor: '#1e293b', color: '#f97316' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['remolque', 'towing', 'remolcador'],
      },
      {
        id: 'type_dredging',
        nameKey: 'legend.ais_types.dredging',
        descriptionKey: 'legend.ais_types.dredging_desc',
        symbol: { type: 'text-badge', text: '33', bgColor: '#1e293b', color: '#f97316' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['dragado', 'dredging', 'draga'],
      },
      {
        id: 'type_military',
        nameKey: 'legend.ais_types.military',
        descriptionKey: 'legend.ais_types.military_desc',
        symbol: { type: 'text-badge', text: '35', bgColor: '#1e293b', color: '#ef4444' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['militar', 'military', 'warship', 'navy'],
      },
      {
        id: 'type_sailing',
        nameKey: 'legend.ais_types.sailing',
        descriptionKey: 'legend.ais_types.sailing_desc',
        symbol: { type: 'text-badge', text: '36', bgColor: '#1e293b', color: '#22c55e' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['velero', 'sailing', 'vela', 'yacht'],
      },
      {
        id: 'type_pleasure',
        nameKey: 'legend.ais_types.pleasure',
        descriptionKey: 'legend.ais_types.pleasure_desc',
        symbol: { type: 'text-badge', text: '37', bgColor: '#1e293b', color: '#22c55e' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['recreo', 'pleasure', 'embarcación recreativa', 'leisure'],
      },
      {
        id: 'type_pilot',
        nameKey: 'legend.ais_types.pilot',
        descriptionKey: 'legend.ais_types.pilot_desc',
        symbol: { type: 'text-badge', text: '50', bgColor: '#1e293b', color: '#a78bfa' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['práctico', 'pilot', 'pilotaje'],
      },
      {
        id: 'type_sar',
        nameKey: 'legend.ais_types.sar',
        descriptionKey: 'legend.ais_types.sar_desc',
        symbol: { type: 'text-badge', text: '51', bgColor: '#1e293b', color: '#ef4444' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['SAR', 'search and rescue', 'rescate', 'emergencia'],
      },
      {
        id: 'type_tug',
        nameKey: 'legend.ais_types.tug',
        descriptionKey: 'legend.ais_types.tug_desc',
        symbol: { type: 'text-badge', text: '52', bgColor: '#1e293b', color: '#f97316' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['remolcador', 'tug', 'tugboat'],
      },
      {
        id: 'type_passenger',
        nameKey: 'legend.ais_types.passenger',
        descriptionKey: 'legend.ais_types.passenger_desc',
        symbol: { type: 'text-badge', text: '60', bgColor: '#1e293b', color: '#3b82f6' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['pasaje', 'passenger', 'ferry', 'crucero', 'cruise'],
      },
      {
        id: 'type_cargo',
        nameKey: 'legend.ais_types.cargo',
        descriptionKey: 'legend.ais_types.cargo_desc',
        symbol: { type: 'text-badge', text: '70', bgColor: '#1e293b', color: '#22c55e' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['carga', 'cargo', 'containership', 'bulker', 'mercante'],
      },
      {
        id: 'type_tanker',
        nameKey: 'legend.ais_types.tanker',
        descriptionKey: 'legend.ais_types.tanker_desc',
        symbol: { type: 'text-badge', text: '80', bgColor: '#1e293b', color: '#ef4444' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['tanquero', 'tanker', 'petrolero', 'LNG', 'LPG', 'chemical'],
      },
    ],
  },
];

// ─── Search helper ──────────────────────────────────────────────────────────────

/**
 * Search entries across all categories by term.
 * Matches against id, searchTokens, and standard.
 * Returns pairs { category, entry } for contextual display.
 */
export function searchLegend(
  categories: LegendCategory[],
  term: string,
  translations?: Record<string, string>,
): Array<{ category: LegendCategory; entry: LegendEntry }> {
  if (!term || term.trim().length < 2) return [];

  const normalized = term.toLowerCase().trim();
  const results: Array<{ category: LegendCategory; entry: LegendEntry }> = [];

  for (const category of categories) {
    for (const entry of category.entries) {
      const tokens = (entry.searchTokens ?? []).join(' ').toLowerCase();
      const std = (entry.standard ?? '').toLowerCase();
      const id = entry.id.replace(/_/g, ' ').toLowerCase();

      // Check translations if available
      let translatedName = '';
      let translatedDesc = '';
      if (translations) {
        translatedName = (translations[entry.nameKey] ?? '').toLowerCase();
        translatedDesc = (translations[entry.descriptionKey] ?? '').toLowerCase();
      }

      if (
        tokens.includes(normalized) ||
        std.includes(normalized) ||
        id.includes(normalized) ||
        translatedName.includes(normalized) ||
        translatedDesc.includes(normalized)
      ) {
        results.push({ category, entry });
      }
    }
  }

  return results;
}
