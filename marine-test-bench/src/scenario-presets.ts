import type {
  SimulationChannelDefinition,
  SimulationParameterDefinition,
  SimulationScenarioDocument,
  SimulationTimelineAction,
} from "@omi/marine-data-contract";

const now = new Date().toISOString();

const makePreset = (
  id: string,
  name: string,
  description: string,
  category: SimulationScenarioDocument["category"],
  mode: SimulationScenarioDocument["mode"],
  parameters: SimulationParameterDefinition[],
  channels: SimulationChannelDefinition[],
  timeline: SimulationTimelineAction[],
  tags: string[],
): SimulationScenarioDocument => ({
  id,
  version: "1.0.0",
  name,
  description,
  category,
  mode,
  defaultDurationMs: mode === "closed-loop" ? 60_000 : 300_000,
  defaultSpeed: mode === "closed-loop" ? 1 : 1,
  parameters,
  channels,
  timeline,
  tags,
  isPreset: true,
  createdAt: now,
  updatedAt: now,
});

// ── Common channels reused across scenarios ─────────────────────────────────

const NAV_CHANNELS: SimulationChannelDefinition[] = [
  { id: "nav.position", label: "Position", path: "navigation.position", kind: "text", dimension: "position", canonicalUnit: "deg", allowedUnits: ["deg"], precision: 6 },
  { id: "nav.sog", label: "SOG", path: "navigation.speedOverGround", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 15 } },
  { id: "nav.cog", label: "COG", path: "navigation.courseOverGroundTrue", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
  { id: "nav.heading", label: "Heading", path: "navigation.headingTrue", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
];

const WIND_CHANNELS: SimulationChannelDefinition[] = [
  { id: "wind.aws", label: "AWS", path: "environment.wind.speedApparent", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 20 } },
  { id: "wind.awa", label: "AWA", path: "environment.wind.angleApparent", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: -3.142, max: 3.142 } },
  { id: "wind.tws", label: "TWS", path: "environment.wind.speedTrue", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 20 } },
  { id: "wind.twd", label: "TWD", path: "environment.wind.angleTrueGround", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
];

const DEPTH_CHANNEL: SimulationChannelDefinition = {
  id: "depth.belowTransducer", label: "Depth", path: "environment.depth.belowTransducer", kind: "analog",
  dimension: "depth", canonicalUnit: "m", allowedUnits: ["m", "ft"], precision: 2, range: { min: 0, max: 100 },
  limits: { low: 2, criticalLow: 1 },
};

const ELECTRICAL_CHANNELS: SimulationChannelDefinition[] = [
  { id: "elec.voltage", label: "Battery Voltage", path: "electrical.batteries.house.voltage", kind: "analog", dimension: "voltage", canonicalUnit: "V", allowedUnits: ["V"], precision: 2, range: { min: 10, max: 16 }, limits: { low: 11.5, criticalLow: 10.8 } },
  { id: "elec.current", label: "Battery Current", path: "electrical.batteries.house.current", kind: "analog", dimension: "current", canonicalUnit: "A", allowedUnits: ["A"], precision: 2, range: { min: -20, max: 20 } },
  { id: "elec.soc", label: "State of Charge", path: "electrical.batteries.house.capacity.stateOfCharge", kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["ratio", "%"], precision: 3, range: { min: 0, max: 1 } },
];

const ENGINE_CHANNELS: SimulationChannelDefinition[] = [
  { id: "motor.rpm", label: "Engine RPM", path: "propulsion.main.revolutions", kind: "analog", dimension: "frequency", canonicalUnit: "Hz", allowedUnits: ["Hz", "rpm"], precision: 1, range: { min: 0, max: 50 } },
  { id: "motor.coolant", label: "Coolant Temp", path: "propulsion.main.temperature", kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "°C"], precision: 1, range: { min: 273, max: 400 }, limits: { high: 368, criticalHigh: 383 } },
  { id: "motor.oil", label: "Oil Pressure", path: "propulsion.main.oilPressure", kind: "analog", dimension: "pressure", canonicalUnit: "Pa", allowedUnits: ["Pa", "bar"], precision: 0, range: { min: 0, max: 700_000 } },
  { id: "motor.fuel", label: "Fuel Level", path: "tanks.fuel.level", kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["ratio", "%"], precision: 3, range: { min: 0, max: 1 } },
  { id: "motor.fuelRate", label: "Fuel Rate", path: "propulsion.main.fuelRate", kind: "analog", dimension: "volumetricFlow", canonicalUnit: "m3/s", allowedUnits: ["m3/s", "L/h"], precision: 8, range: { min: 0, max: 1e-5 } },
];

const ENV_CHANNELS: SimulationChannelDefinition[] = [
  { id: "env.waterTemp", label: "Water Temp", path: "environment.water.temperature", kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "°C"], precision: 1, range: { min: 273, max: 320 } },
  { id: "env.airTemp", label: "Air Temp", path: "environment.outside.temperature", kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "°C"], precision: 1, range: { min: 263, max: 330 } },
  { id: "env.baro", label: "Barometric Pressure", path: "environment.outside.pressure", kind: "analog", dimension: "pressure", canonicalUnit: "Pa", allowedUnits: ["Pa", "hPa"], precision: 0, range: { min: 95_000, max: 105_000 } },
  { id: "env.humidity", label: "Humidity", path: "environment.outside.humidity", kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["ratio", "%"], precision: 3, range: { min: 0, max: 1 } },
];

const AIS_INTRUDER_CHANNELS: SimulationChannelDefinition[] = [
  { id: "ais.intruder.position", label: "Intruder Position", kind: "text", dimension: "position", canonicalUnit: "deg", allowedUnits: ["deg"], precision: 6 },
  { id: "ais.intruder.sog", label: "Intruder SOG", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 15 } },
  { id: "ais.intruder.cog", label: "Intruder COG", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
];

// ── Scenario parameters (common) ──────────────────────────────────────────

const SEED_PARAM: SimulationParameterDefinition = {
  id: "seed", label: "Random Seed", type: "number", defaultValue: 42, min: 1, max: 9999, step: 1, group: "General",
};

const SPEED_PARAM: SimulationParameterDefinition = {
  id: "speed", label: "Simulation Speed", type: "number", defaultValue: 1, min: 0.25, max: 4, step: 0.25, unit: "x", group: "General",
};

const DURATION_PARAM: SimulationParameterDefinition = {
  id: "durationMs", label: "Duration", type: "number", defaultValue: 300_000, min: 30_000, max: 3_600_000, step: 60_000, unit: "ms", group: "General",
};

// ── Scenario definitions ──────────────────────────────────────────────────

export const SCENARIO_PRESETS: SimulationScenarioDocument[] = [
  // 1. Basic Cruise
  makePreset(
    "basic-cruise",
    "Basic Cruise",
    "Cruise navegación básica con viento variable, batería con ciclos carga/descarga, eventos de aguas someras y blanco AIS intruso.",
    "navigation",
    "data",
    [SEED_PARAM, SPEED_PARAM, DURATION_PARAM],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS, ...ENV_CHANNELS, ...AIS_INTRUDER_CHANNELS],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Inicio de navegación" },
      { id: "t2", atSimulatedMs: 60_000, type: "marker", label: "Primer ciclo de batería" },
      { id: "t3", atSimulatedMs: 120_000, type: "marker", label: "Evento de aguas someras" },
      { id: "t4", atSimulatedMs: 180_000, type: "marker", label: "Ráfaga de viento" },
      { id: "t5", atSimulatedMs: 240_000, type: "marker", label: "Segundo ciclo de batería" },
    ],
    ["cruise", "navigation", "wind", "battery", "ais"],
  ),

  // 2. Harbor Traffic
  makePreset(
    "harbor-traffic",
    "Harbor Traffic",
    "Tráfico denso en puerto con múltiples blancos AIS, maniobras lentas, fondo irregular y corrientes.",
    "navigation",
    "data",
    [SEED_PARAM, SPEED_PARAM, { ...DURATION_PARAM, defaultValue: 180_000 }],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...AIS_INTRUDER_CHANNELS],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Entrada a puerto" },
      { id: "t2", atSimulatedMs: 45_000, type: "marker", label: "Primer cruce de tráfico" },
      { id: "t3", atSimulatedMs: 90_000, type: "marker", label: "Zona de fondeo" },
    ],
    ["harbor", "traffic", "ais", "maneuvering"],
  ),

  // 3. Coastal Run
  makePreset(
    "coastal-run",
    "Coastal Run",
    "Navegación costera con cambios de profundidad, corrientes de marea, viento de tierra/mar y faros.",
    "navigation",
    "data",
    [SEED_PARAM, SPEED_PARAM, DURATION_PARAM],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Salida de puerto costero" },
      { id: "t2", atSimulatedMs: 90_000, type: "marker", label: "Cabo - cambio de viento" },
      { id: "t3", atSimulatedMs: 180_000, type: "marker", label: "Bahía protegida" },
    ],
    ["coastal", "depth", "tide", "wind"],
  ),

  // 4. Anchored Stale
  makePreset(
    "anchored-stale",
    "Anchored Stale",
    "Fondeo con datos estáticos que gradualmente se vuelven obsoletos (stale) para probar alarmas de datos antiguos.",
    "navigation",
    "data",
    [SEED_PARAM, { ...SPEED_PARAM, defaultValue: 0.5 }, { ...DURATION_PARAM, defaultValue: 600_000 }],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...ELECTRICAL_CHANNELS],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Fondeo establecido" },
      { id: "t2", atSimulatedMs: 120_000, type: "marker", label: "Datos comienzan a envejecer" },
      { id: "t3", atSimulatedMs: 300_000, type: "marker", label: "Alarma de datos stale" },
    ],
    ["anchor", "stale", "alarm", "monitoring"],
  ),

  // 5. Busy Shipping Lane
  makePreset(
    "busy-shipping-lane",
    "Busy Shipping Lane",
    "Carril de tráfico denso con múltiples buques comerciales, CPA bajo, maniobras de evitación.",
    "ais",
    "data",
    [SEED_PARAM, SPEED_PARAM, { ...DURATION_PARAM, defaultValue: 240_000 }],
    [...NAV_CHANNELS, ...WIND_CHANNELS, ...AIS_INTRUDER_CHANNELS],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Entrada a TSS" },
      { id: "t2", atSimulatedMs: 60_000, type: "marker", label: "Primer CPA crítico" },
      { id: "t3", atSimulatedMs: 120_000, type: "marker", label: "Maniobra de evitación" },
    ],
    ["ais", "cpa", "tss", "collision"],
  ),

  // 6. Combined Failures
  makePreset(
    "combined-failures",
    "Combined Failures",
    "Escenario con fallos múltiples: pérdida de GPS, batería crítica, sobrecalentamiento del motor, pérdida de presión de aceite.",
    "safety",
    "data",
    [SEED_PARAM, { ...SPEED_PARAM, defaultValue: 0.5 }, { ...DURATION_PARAM, defaultValue: 120_000 }],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Navegación normal" },
      { id: "t2", atSimulatedMs: 20_000, type: "fault-enable", channelId: "nav.position", label: "Pérdida de GPS" },
      { id: "t3", atSimulatedMs: 40_000, type: "fault-enable", channelId: "elec.voltage", label: "Batería crítica" },
      { id: "t4", atSimulatedMs: 60_000, type: "fault-enable", channelId: "motor.coolant", label: "Sobrecalentamiento" },
      { id: "t5", atSimulatedMs: 80_000, type: "fault-enable", channelId: "motor.oil", label: "Pérdida de presión de aceite" },
      { id: "t6", atSimulatedMs: 100_000, type: "fault-disable", channelId: "nav.position", label: "GPS recuperado" },
    ],
    ["failure", "safety", "alarm", "gps", "engine", "battery"],
  ),

  // 7. Anchor Drift
  makePreset(
    "anchor-drift",
    "Anchor Drift",
    "Detección de arrastre del ancla con posición que gradualmente se desplaza, viento cambiante y alarma de fondeo.",
    "navigation",
    "data",
    [SEED_PARAM, { ...SPEED_PARAM, defaultValue: 0.5 }, { ...DURATION_PARAM, defaultValue: 300_000 }],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Ancla echada" },
      { id: "t2", atSimulatedMs: 120_000, type: "marker", label: "Comienzo de arrastre" },
      { id: "t3", atSimulatedMs: 180_000, type: "marker", label: "Alarma de arrastre" },
    ],
    ["anchor", "drift", "alarm", "position"],
  ),

  // 8. Wind GPS Demo
  makePreset(
    "wind-gps-demo",
    "Wind GPS Demo",
    "Demostración de instrumentos de viento y GPS con patrones predecibles para calibración de displays.",
    "sensors",
    "data",
    [SEED_PARAM, { ...SPEED_PARAM, defaultValue: 1 }, { ...DURATION_PARAM, defaultValue: 120_000 }],
    [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL],
    [
      { id: "t1", atSimulatedMs: 0, type: "marker", label: "Inicio de calibración" },
      { id: "t2", atSimulatedMs: 30_000, type: "marker", label: "Rosa de viento completa" },
      { id: "t3", atSimulatedMs: 60_000, type: "marker", label: "Patrón de rumbo" },
      { id: "t4", atSimulatedMs: 90_000, type: "marker", label: "Patrón de velocidad" },
    ],
    ["demo", "calibration", "wind", "gps", "instruments"],
  ),
];
