import { PATHS, type DataPoint, type Position, type SignalKPath } from "@omi/marine-data-contract";

export const TELEMETRY_PATHS: SignalKPath[] = [
  PATHS.navigation.position,
  PATHS.navigation.speedOverGround,
  PATHS.navigation.courseOverGroundTrue,
  PATHS.navigation.headingTrue,
  PATHS.environment.depth.belowTransducer,
  PATHS.environment.wind.angleApparent,
  PATHS.environment.wind.speedApparent,
  PATHS.electrical.batteries.house.voltage,
  PATHS.electrical.batteries.house.current,
];

export type TelemetryValue = number | Position;
export type TelemetryPoint = DataPoint<TelemetryValue>;
