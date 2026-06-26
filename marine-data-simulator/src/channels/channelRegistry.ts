import type {
  SimulationChannelDefinition,
} from "@omi/marine-data-contract";

export const COMMON_CHANNELS: SimulationChannelDefinition[] = [
  // Navigation
  { id: "nav.position", label: "Position", path: "navigation.position", kind: "text", dimension: "position", canonicalUnit: "deg", allowedUnits: ["deg"], precision: 6 },
  { id: "nav.sog", label: "SOG", path: "navigation.speedOverGround", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 30 } },
  { id: "nav.cog", label: "COG", path: "navigation.courseOverGroundTrue", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 2, range: { min: 0, max: 6.2832 } },
  { id: "nav.heading", label: "Heading", path: "navigation.headingTrue", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 2, range: { min: 0, max: 6.2832 } },
  { id: "nav.depth", label: "Depth", path: "environment.depth.belowTransducer", kind: "analog", dimension: "length", canonicalUnit: "m", allowedUnits: ["m", "ft"], precision: 2, range: { min: 0, max: 200 } },

  // Wind
  { id: "wind.tws", label: "TWS", path: "environment.wind.speedTrue", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 50 } },
  { id: "wind.twd", label: "TWD", path: "environment.wind.directionTrue", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 2, range: { min: 0, max: 6.2832 } },
  { id: "wind.aws", label: "AWS", path: "environment.wind.speedApparent", kind: "analog", dimension: "speed", canonicalUnit: "m/s", allowedUnits: ["m/s", "kn"], precision: 2, range: { min: 0, max: 50 } },
  { id: "wind.awa", label: "AWA", path: "environment.wind.angleApparent", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 2, range: { min: -3.1416, max: 3.1416 } },

  // Electricity
  { id: "elec.voltage", label: "Battery Voltage", path: "electrical.batteries.house.voltage", kind: "analog", dimension: "voltage", canonicalUnit: "V", allowedUnits: ["V"], precision: 2, range: { min: 0, max: 30 }, limits: { low: 11.5, criticalLow: 10.5, high: 15, criticalHigh: 16 } },
  { id: "elec.current", label: "Battery Current", path: "electrical.batteries.house.current", kind: "analog", dimension: "current", canonicalUnit: "A", allowedUnits: ["A"], precision: 2, range: { min: -50, max: 50 } },
  { id: "elec.soc", label: "State of Charge", path: "electrical.batteries.house.capacity.stateOfCharge", kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["%", "ratio"], precision: 3, range: { min: 0, max: 1 } },

  // Motor / Propulsion
  { id: "motor.rpm", label: "Engine RPM", path: "propulsion.main.revolutions", kind: "analog", dimension: "frequency", canonicalUnit: "Hz", allowedUnits: ["Hz", "rpm"], precision: 1, range: { min: 0, max: 60 } },
  { id: "motor.temp", label: "Engine Temp", path: "propulsion.main.temperature", kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "°C", "°F"], precision: 1, range: { min: 273, max: 400 }, limits: { high: 383, criticalHigh: 393 } },
  { id: "motor.oilPressure", label: "Oil Pressure", path: "propulsion.main.oilPressure", kind: "analog", dimension: "pressure", canonicalUnit: "Pa", allowedUnits: ["Pa", "kPa", "bar", "psi"], precision: 0, range: { min: 0, max: 600_000 } },
  { id: "motor.fuelRate", label: "Fuel Rate", path: "propulsion.main.fuel.rate", kind: "analog", dimension: "volumeFlow", canonicalUnit: "m3/s", allowedUnits: ["m3/s", "L/h"], precision: 6, range: { min: 0, max: 1e-5 } },
  { id: "motor.fuelLevel", label: "Fuel Level", path: "tanks.fuel.0.currentLevel", kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["%", "ratio"], precision: 3, range: { min: 0, max: 1 } },

  // Environment
  { id: "env.waterTemp", label: "Water Temp", path: "environment.water.temperature", kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "°C", "°F"], precision: 1, range: { min: 273, max: 320 } },
  { id: "env.airTemp", label: "Air Temp", path: "environment.outside.temperature", kind: "analog", dimension: "temperature", canonicalUnit: "K", allowedUnits: ["K", "°C", "°F"], precision: 1, range: { min: 233, max: 330 } },
  { id: "env.pressure", label: "Pressure", path: "environment.outside.pressure", kind: "analog", dimension: "pressure", canonicalUnit: "Pa", allowedUnits: ["Pa", "hPa", "bar"], precision: 0, range: { min: 80_000, max: 120_000 } },
  { id: "env.humidity", label: "Humidity", path: "environment.outside.humidity", kind: "analog", dimension: "ratio", canonicalUnit: "ratio", allowedUnits: ["%", "ratio"], precision: 3, range: { min: 0, max: 1 } },

  // Autopilot / Drive
  { id: "ap.state", label: "Autopilot State", path: "steering.autopilot.state", kind: "text", dimension: "state", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "ap.fault", label: "Autopilot Fault", path: "steering.autopilot.fault", kind: "text", dimension: "state", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "ap.targetHeading", label: "Target Heading", path: "steering.autopilot.target.headingTrue", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 2, range: { min: 0, max: 6.2832 } },
  { id: "ap.rudderAngle", label: "Rudder Angle", path: "steering.rudderAngle", kind: "analog", dimension: "angle", canonicalUnit: "rad", allowedUnits: ["rad", "deg"], precision: 2, range: { min: -0.61, max: 0.61 }, limits: { low: -0.52, high: 0.52 } },
  { id: "ap.driveCurrent", label: "Drive Current", path: "steering.autopilot.drive.motorCurrent", kind: "analog", dimension: "current", canonicalUnit: "A", allowedUnits: ["A"], precision: 2, range: { min: 0, max: 30 }, limits: { high: 10, criticalHigh: 15 } },
  { id: "ap.driveEnabled", label: "Drive Enabled", path: "steering.autopilot.drive.enabled", kind: "digital", dimension: "state", canonicalUnit: "bool", allowedUnits: ["bool"], precision: 0 },
  { id: "ap.clutch", label: "Clutch", path: "steering.autopilot.drive.clutch", kind: "digital", dimension: "state", canonicalUnit: "bool", allowedUnits: ["bool"], precision: 0 },

  // UART
  { id: "uart.tx", label: "UART TX", kind: "uart", dimension: "text", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
  { id: "uart.rx", label: "UART RX", kind: "uart", dimension: "text", canonicalUnit: "text", allowedUnits: ["text"], precision: 0 },
];

export const getChannelDefinition = (id: string): SimulationChannelDefinition | undefined =>
  COMMON_CHANNELS.find((c) => c.id === id);

export const listChannels = (): SimulationChannelDefinition[] => COMMON_CHANNELS;
