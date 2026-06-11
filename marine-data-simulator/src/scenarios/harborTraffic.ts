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

interface HarborVesselState {
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  heading: number;
  turnRate: number;
}

interface AisTargetState {
  mmsi: string;
  name: string;
  callsign: string;
  destination: string;
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  heading: number;
}

interface HarborTrafficState {
  ownship: HarborVesselState;
  targets: AisTargetState[];
  depth: number;
  aws: number;
  awa: number;
  batteryVoltage: number;
  batteryCurrent: number;
}

const BASE_LAT = 42.2406;
const BASE_LON = -8.7207;

export const createHarborTrafficScenario = (): Scenario<HarborTrafficState> => {
  return {
    name: "harbor-traffic",
    init: () => ({
      ownship: {
        latitude: BASE_LAT,
        longitude: BASE_LON,
        sog: 1.6,
        cog: 0.9,
        heading: 0.9,
        turnRate: 0.008,
      },
      targets: [
        {
          mmsi: "123456789",
          name: "Harbor Tug",
          callsign: "TUG1",
          destination: "Outer Pier",
          latitude: BASE_LAT + 0.006,
          longitude: BASE_LON - 0.004,
          sog: 2.4,
          cog: 2.4,
          heading: 2.4,
        },
        {
          mmsi: "987654321",
          name: "Pilot Boat",
          callsign: "PILOT",
          destination: "Marina",
          latitude: BASE_LAT - 0.007,
          longitude: BASE_LON + 0.006,
          sog: 4.2,
          cog: 5.1,
          heading: 5.1,
        },
        {
          mmsi: "246810121",
          name: "Anchored Barge",
          callsign: "BARGE",
          destination: "ANCH",
          latitude: BASE_LAT + 0.004,
          longitude: BASE_LON + 0.003,
          sog: 0,
          cog: 0,
          heading: 0,
        },
      ],
      depth: 8.5,
      aws: 3.8,
      awa: 0.4,
      batteryVoltage: 12.6,
      batteryCurrent: 6.5,
    }),
    tick: (state, dtSeconds, timestamp) => {
      const nextCog = wrapRadians(state.ownship.cog + state.ownship.turnRate * dtSeconds);
      const distanceMeters = state.ownship.sog * dtSeconds;
      const moved = stepPosition(
        state.ownship.latitude,
        state.ownship.longitude,
        distanceMeters,
        nextCog,
      );

      const nextDepth = clamp(state.depth + randomInRange(-0.06, 0.06), 6.5, 10.5);
      const nextAws = clamp(state.aws + randomInRange(-0.05, 0.05), 2.5, 5.5);
      const nextAwa = wrapRadians(state.awa + randomInRange(-0.01, 0.01));
      const nextVoltage = clamp(state.batteryVoltage + randomInRange(-0.02, 0.02), 12.2, 13.1);
      const nextCurrent = clamp(state.batteryCurrent + randomInRange(-0.3, 0.3), 3, 9);

      const nextTargets = state.targets.map((target) => {
        if (target.sog <= 0) {
          return target;
        }
        const nextCogTarget = wrapRadians(target.cog + randomInRange(-0.01, 0.01));
        const movedTarget = stepPosition(
          target.latitude,
          target.longitude,
          target.sog * dtSeconds,
          nextCogTarget,
        );
        return {
          ...target,
          latitude: movedTarget.latitude,
          longitude: movedTarget.longitude,
          cog: nextCogTarget,
          heading: nextCogTarget,
        };
      });

      const ownship: HarborVesselState = {
        latitude: moved.latitude,
        longitude: moved.longitude,
        sog: state.ownship.sog,
        cog: nextCog,
        heading: nextCog,
        turnRate: state.ownship.turnRate,
      };

      const points: ScenarioPoint[] = [];
      const ownContext = "vessels.self";

      const position: Position = {
        latitude: ownship.latitude,
        longitude: ownship.longitude,
      };

      points.push(makePoint(PATHS.navigation.position, position, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.speedOverGround, ownship.sog, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.courseOverGroundTrue, ownship.cog, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.navigation.headingTrue, ownship.heading, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.depth.belowTransducer, nextDepth, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.wind.speedApparent, nextAws, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.environment.wind.angleApparent, nextAwa, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.electrical.batteries.house.voltage, nextVoltage, timestamp, QualityFlag.Good, ownContext));
      points.push(makePoint(PATHS.electrical.batteries.house.current, nextCurrent, timestamp, QualityFlag.Good, ownContext));

      for (const target of nextTargets) {
        const ctx = `vessels.${target.mmsi}`;
        points.push(makePoint(PATHS.name, target.name, timestamp, QualityFlag.Good, ctx));
        points.push(makePoint(PATHS.communication.callsignVhf, target.callsign, timestamp, QualityFlag.Good, ctx));
        points.push(makePoint(PATHS.navigation.destination, target.destination, timestamp, QualityFlag.Good, ctx));
        points.push(
          makePoint(
            PATHS.navigation.position,
            { latitude: target.latitude, longitude: target.longitude },
            timestamp,
            QualityFlag.Good,
            ctx,
          ),
        );
        points.push(makePoint(PATHS.navigation.speedOverGround, target.sog, timestamp, QualityFlag.Good, ctx));
        points.push(makePoint(PATHS.navigation.courseOverGroundTrue, target.cog, timestamp, QualityFlag.Good, ctx));
        points.push(makePoint(PATHS.navigation.headingTrue, target.heading, timestamp, QualityFlag.Good, ctx));
      }

      return {
        state: {
          ownship,
          targets: nextTargets,
          depth: nextDepth,
          aws: nextAws,
          awa: nextAwa,
          batteryVoltage: nextVoltage,
          batteryCurrent: nextCurrent,
        },
        points,
      };
    },
  };
};
