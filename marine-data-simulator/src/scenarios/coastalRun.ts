import {
  PATHS,
  QualityFlag,
  type Position,
} from "@omi/marine-data-contract";
import type { Scenario, ScenarioPoint } from "./scenario.js";
import {
  clamp,
  makePoint,
  randomInRange,
  stepPosition,
  wrapRadians,
} from "./scenario-utils.js";

interface CoastalRunState {
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  heading: number;
  depth: number;
  aws: number;
  awa: number;
  batteryVoltage: number;
  batteryCurrent: number;
  targetLat: number;
  targetLon: number;
  targetSog: number;
  targetCog: number;
  targetHeading: number;
}

const BASE_LAT = 42.28;
const BASE_LON = -8.92;

export const createCoastalRunScenario = (): Scenario<CoastalRunState> => {
  return {
    name: "coastal-run",
    init: () => ({
      latitude: BASE_LAT,
      longitude: BASE_LON,
      sog: 5.4,
      cog: 1.15,
      heading: 1.12,
      depth: 18.5,
      aws: 6.2,
      awa: 0.5,
      batteryVoltage: 12.9,
      batteryCurrent: 4.8,
      targetLat: BASE_LAT + 0.02,
      targetLon: BASE_LON - 0.01,
      targetSog: 6.1,
      targetCog: 4.4,
      targetHeading: 4.4,
    }),
    tick: (state, dtSeconds, timestamp) => {
      const nextCog = wrapRadians(state.cog + randomInRange(-0.004, 0.004));
      const nextHeading = wrapRadians(state.heading + randomInRange(-0.006, 0.006));
      const moved = stepPosition(state.latitude, state.longitude, state.sog * dtSeconds, nextCog);

      const nextTargetCog = wrapRadians(state.targetCog + randomInRange(-0.006, 0.006));
      const movedTarget = stepPosition(
        state.targetLat,
        state.targetLon,
        state.targetSog * dtSeconds,
        nextTargetCog,
      );

      const nextDepth = clamp(state.depth + randomInRange(-0.08, 0.08), 14, 24);
      const nextAws = clamp(state.aws + randomInRange(-0.08, 0.08), 4.5, 9.0);
      const nextAwa = wrapRadians(state.awa + randomInRange(-0.02, 0.02));
      const nextVoltage = clamp(state.batteryVoltage + randomInRange(-0.02, 0.02), 12.3, 13.2);
      const nextCurrent = clamp(state.batteryCurrent + randomInRange(-0.4, 0.4), 3, 7);

      const points: ScenarioPoint[] = [];
      const ownContext = "vessels.self";

      const position: Position = {
        latitude: moved.latitude,
        longitude: moved.longitude,
      };

      points.push(makePoint(PATHS.navigation.position, position, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.speedOverGround, state.sog, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.courseOverGroundTrue, nextCog, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.headingTrue, nextHeading, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.depth.belowTransducer, nextDepth, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.wind.speedApparent, nextAws, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.wind.angleApparent, nextAwa, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.electrical.batteries.house.voltage, nextVoltage, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.electrical.batteries.house.current, nextCurrent, timestamp, QualityFlag.Good, ownContext));

      const aisContext = "vessels.555000111";
      points.push(makePoint(PATHS.name, "Coastal Trader", timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.communication.callsignVhf, "CTRD", timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.navigation.destination, "Cape Point", timestamp, QualityFlag.Good, aisContext));
      points.push(
        makePoint(
          PATHS.navigation.position,
          { latitude: movedTarget.latitude, longitude: movedTarget.longitude },
          timestamp,
          QualityFlag.Good,
          aisContext,
        ),
      );
      points.push(makePoint(PATHS.navigation.speedOverGround, state.targetSog, timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.navigation.courseOverGroundTrue, nextTargetCog, timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.navigation.headingTrue, nextTargetCog, timestamp, QualityFlag.Good, aisContext));

      return {
        state: {
          latitude: moved.latitude,
          longitude: moved.longitude,
          sog: state.sog,
          cog: nextCog,
          heading: nextHeading,
          depth: nextDepth,
          aws: nextAws,
          awa: nextAwa,
          batteryVoltage: nextVoltage,
          batteryCurrent: nextCurrent,
          targetLat: movedTarget.latitude,
          targetLon: movedTarget.longitude,
          targetSog: state.targetSog,
          targetCog: nextTargetCog,
          targetHeading: nextTargetCog,
        },
        points,
      };
    },
  };
};
