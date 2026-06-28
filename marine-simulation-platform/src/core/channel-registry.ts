import { PATHS, type SimulationChannelDefinition } from "@omi/marine-data-contract";

export const NAV_CHANNELS: SimulationChannelDefinition[] = [
  { id: "nav.position", label: "Position", path: PATHS.navigation.position, kind: "text", dimension: "position", canonicalUnit: "deg", allowedUnits: ["deg"], precision: 6 },
  { id: "nav.sog", label: "SOG", path: PATHS.navigation.speedOverGround, kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 15 } },
  { id: "nav.cog", label: "COG", path: PATHS.navigation.courseOverGroundTrue, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
  { id: "nav.heading", label: "Heading", path: PATHS.navigation.headingTrue, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
];

export const WIND_CHANNELS: SimulationChannelDefinition[] = [
  { id: "wind.aws", label: "AWS", path: PATHS.environment.wind.speedApparent, kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 30 } },
  { id: "wind.awa", label: "AWA", path: PATHS.environment.wind.angleApparent, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: -3.142, max: 3.142 } },
  { id: "wind.tws", label: "TWS", path: PATHS.environment.wind.speedTrue, kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 30 } },
  { id: "wind.twd", label: "TWD", path: PATHS.environment.wind.directionTrue, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
];

export const DEPTH_CHANNEL: SimulationChannelDefinition = {
  id: "depth.belowTransducer",
  label: "Depth",
  path: PATHS.environment.depth.belowTransducer,
  kind: "analog",
  dimension: "depth",
  canonicalUnit: "m",
  allowedUnits: ["m", "ft"],
  precision: 2,
  range: { min: 0, max: 100 },
  limits: { low: 2, criticalLow: 1 },
};

export const ELECTRICAL_CHANNELS: SimulationChannelDefinition[] = [
  { id: "elec.voltage", label: "Battery Voltage", path: PATHS.electrical.batteries.house.voltage, kind: "analog", dimension: "voltage", canonicalUnit: "V", allowedUnits: ["V"], precision: 2, range: { min: 10, max: 16 }, limits: { low: 11.5, criticalLow: 10.8 } },
  { id: "elec.current", label: "Battery Current", path: PATHS.electrical.batteries.house.current, kind: "analog", dimension: "current", canonicalUnit: "A", allowedUnits: ["A"], precision: 2, range: { min: -20, max: 20 } },
  { id: "elec.soc", label: "State of Charge", path: PATHS.electrical.batteries.house.stateOfCharge, kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["ratio", "%"], precision: 3, range: { min: 0, max: 1 } },
];

export const ENGINE_CHANNELS: SimulationChannelDefinition[] = [
  { id: "motor.rpm", label: "Engine RPM", path: PATHS.propulsion.main.revolutions, kind: "analog", dimension: "frequency", canonicalUnit: "Hz", allowedUnits: ["Hz", "rpm"], precision: 1, range: { min: 0, max: 50 } },
  { id: "motor.coolant", label: "Coolant Temp", path: PATHS.propulsion.main.temperature, kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "C"], precision: 1, range: { min: 273, max: 400 }, limits: { high: 368, criticalHigh: 383 } },
  { id: "motor.oil", label: "Oil Pressure", path: PATHS.propulsion.main.oilPressure, kind: "analog", dimension: "pressure", canonicalUnit: "Pa", allowedUnits: ["Pa", "bar"], precision: 0, range: { min: 0, max: 700_000 } },
  { id: "motor.fuel", label: "Fuel Level", path: PATHS.tanks.fuel.level, kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["ratio", "%"], precision: 3, range: { min: 0, max: 1 } },
  { id: "motor.fuelRate", label: "Fuel Rate", path: PATHS.propulsion.main.fuelRate, kind: "analog", dimension: "volumetricFlow", canonicalUnit: "m3/s", allowedUnits: ["m3/s", "L/h"], precision: 8, range: { min: 0, max: 1e-5 } },
];

export const ENV_CHANNELS: SimulationChannelDefinition[] = [
  { id: "env.waterTemp", label: "Water Temp", path: PATHS.environment.water.temperature, kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "C"], precision: 1, range: { min: 273, max: 320 } },
  { id: "env.airTemp", label: "Air Temp", path: PATHS.environment.outside.temperature, kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "C"], precision: 1, range: { min: 263, max: 330 } },
  { id: "env.baro", label: "Barometric Pressure", path: PATHS.environment.outside.pressure, kind: "analog", dimension: "pressure", canonicalUnit: "Pa", allowedUnits: ["Pa", "hPa"], precision: 0, range: { min: 95_000, max: 105_000 } },
  { id: "env.humidity", label: "Humidity", path: PATHS.environment.outside.humidity, kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["ratio", "%"], precision: 3, range: { min: 0, max: 1 } },
];

export const AIS_INTRUDER_CHANNELS: SimulationChannelDefinition[] = [
  { id: "ais.intruder.position", label: "Intruder Position", kind: "text", dimension: "position", canonicalUnit: "deg", allowedUnits: ["deg"], precision: 6 },
  { id: "ais.intruder.sog", label: "Intruder SOG", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 15 } },
  { id: "ais.intruder.cog", label: "Intruder COG", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
];

export const AUTOPILOT_CHANNELS: SimulationChannelDefinition[] = [
  { id: "ap.state", label: "AP State", path: PATHS.steering.autopilot.state, kind: "text", dimension: "state", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "ap.mode", label: "AP Mode", path: PATHS.steering.autopilot.mode, kind: "text", dimension: "state", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "ap.engaged", label: "AP Engaged", path: PATHS.steering.autopilot.engaged, kind: "digital", dimension: "state", canonicalUnit: "bool", allowedUnits: ["bool"], precision: 0 },
  { id: "ap.fault", label: "AP Fault", path: PATHS.steering.autopilot.fault, kind: "text", dimension: "state", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "ap.targetHeading", label: "Target Heading", path: PATHS.steering.autopilot.target.headingTrue, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: 0, max: 6.283 } },
  { id: "ap.targetWindAngle", label: "Target Wind Angle", path: PATHS.steering.autopilot.target.windAngleApparent, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: -3.142, max: 3.142 } },
  { id: "ap.rudderAngle", label: "Rudder Angle", path: PATHS.steering.rudderAngle, kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 3, range: { min: -0.61, max: 0.61 }, limits: { low: -0.52, high: 0.52 } },
  { id: "ap.driveCurrent", label: "Drive Current", path: PATHS.steering.autopilot.drive.motorCurrent, kind: "analog", dimension: "current", canonicalUnit: "A", allowedUnits: ["A"], precision: 2, range: { min: 0, max: 30 }, limits: { high: 10, criticalHigh: 15 } },
  { id: "ap.driveEnabled", label: "Drive Enabled", path: PATHS.steering.autopilot.drive.enabled, kind: "digital", dimension: "state", canonicalUnit: "bool", allowedUnits: ["bool"], precision: 0 },
  { id: "ap.clutch", label: "Clutch", path: PATHS.steering.autopilot.drive.clutch, kind: "digital", dimension: "state", canonicalUnit: "bool", allowedUnits: ["bool"], precision: 0 },
];

export const UART_CHANNELS: SimulationChannelDefinition[] = [
  { id: "uart.tx", label: "UART TX", kind: "uart", dimension: "text", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "uart.rx", label: "UART RX", kind: "uart", dimension: "text", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
];

export const ALL_CHANNELS: SimulationChannelDefinition[] = [
  ...NAV_CHANNELS,
  ...WIND_CHANNELS,
  DEPTH_CHANNEL,
  ...ELECTRICAL_CHANNELS,
  ...ENGINE_CHANNELS,
  ...ENV_CHANNELS,
  ...AIS_INTRUDER_CHANNELS,
  ...AUTOPILOT_CHANNELS,
  ...UART_CHANNELS,
];

const channelMap = new Map(ALL_CHANNELS.map((channel) => [channel.id, channel]));

export const getChannelDefinition = (id: string): SimulationChannelDefinition | undefined => channelMap.get(id);
export const listChannels = (): SimulationChannelDefinition[] => [...ALL_CHANNELS];
export const pickChannels = (ids: string[]): SimulationChannelDefinition[] =>
  ids.map((id) => channelMap.get(id)).filter((channel): channel is SimulationChannelDefinition => Boolean(channel));

