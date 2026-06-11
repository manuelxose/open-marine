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
  wrapRadians,
} from "./scenario-utils.js";

interface AnchoredStaleState {
  latitude: number;
  longitude: number;
  depth: number;
  aws: number;
  awa: number;
  batteryVoltage: number;
  batteryCurrent: number;
  positionElapsed: number;
}

const BASE_LAT = 42.235;
const BASE_LON = -8.705;
const POSITION_UPDATE_INTERVAL_SEC = 12;

export const createAnchoredStaleScenario = (): Scenario<AnchoredStaleState> => {
  return {
    name: "anchored-stale",
    init: () => ({
      latitude: BASE_LAT,
      longitude: BASE_LON,
      depth: 6.2,
      aws: 4.0,
      awa: 0.3,
      batteryVoltage: 12.4,
      batteryCurrent: 3.5,
      positionElapsed: 0,
    }),
    tick: (state, dtSeconds, timestamp) => {
      let positionElapsed = state.positionElapsed + dtSeconds;
      const shouldPublishPosition = positionElapsed >= POSITION_UPDATE_INTERVAL_SEC;
      if (shouldPublishPosition) {
        positionElapsed = 0;
      }

      const nextDepth = clamp(state.depth + randomInRange(-0.04, 0.04), 5.5, 7.5);
      const nextAws = clamp(state.aws + randomInRange(-0.06, 0.06), 2.5, 6.0);
      const nextAwa = wrapRadians(state.awa + randomInRange(-0.015, 0.015));
      const nextVoltage = clamp(state.batteryVoltage + randomInRange(-0.02, 0.02), 12.0, 12.8);
      const nextCurrent = clamp(state.batteryCurrent + randomInRange(-0.4, 0.4), 2, 5);

      const points: ScenarioPoint[] = [];
      const ownContext = "vessels.self";

      points.push(makePoint(PATHS.navigation.speedOverGround, 0, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.courseOverGroundTrue, 0, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.headingTrue, 0, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.depth.belowTransducer, nextDepth, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.wind.speedApparent, nextAws, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.wind.angleApparent, nextAwa, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.electrical.batteries.house.voltage, nextVoltage, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.electrical.batteries.house.current, nextCurrent, timestamp, QualityFlag.Good, ownContext));

      if (shouldPublishPosition) {
        const swingLat = state.latitude + randomInRange(-0.00005, 0.00005);
        const swingLon = state.longitude + randomInRange(-0.00005, 0.00005);
        const position: Position = { latitude: swingLat, longitude: swingLon };
        points.push(makePoint(PATHS.navigation.position, position, timestamp, QualityFlag.Good, ownContext));
      }

      const aisContext = "vessels.777000333";
      points.push(makePoint(PATHS.name, "Patrol Craft", timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.communication.callsignVhf, "PATROL", timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.navigation.destination, "Harbor", timestamp, QualityFlag.Good, aisContext));
      points.push(
        makePoint(
          PATHS.navigation.position,
          { latitude: BASE_LAT + 0.01, longitude: BASE_LON - 0.005 },
          timestamp,
          QualityFlag.Good,
          aisContext,
        ),
      );
      points.push(makePoint(PATHS.navigation.speedOverGround, 0.2, timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.navigation.courseOverGroundTrue, 2.8, timestamp, QualityFlag.Good, aisContext));
      points.push(makePoint(PATHS.navigation.headingTrue, 2.8, timestamp, QualityFlag.Good, aisContext));

      return {
        state: {
          latitude: state.latitude,
          longitude: state.longitude,
          depth: nextDepth,
          aws: nextAws,
          awa: nextAwa,
          batteryVoltage: nextVoltage,
          batteryCurrent: nextCurrent,
          positionElapsed,
        },
        points,
      };
    },
  };
};
