import {
  PATHS,
  QualityFlag,
  type Position,
  type SourceRef,
} from "@omi/marine-data-contract";
import type { Scenario, ScenarioPoint } from "./scenario.js";
import { clamp, makePoint, stepPosition, wrapRadians } from "./scenario-utils.js";

interface WindGpsDemoState {
  elapsedSeconds: number;
  latitude: number;
  longitude: number;
}

const SOURCE: SourceRef = {
  label: "wind-gps-demo",
  type: "virtual",
  priority: 10,
  validityTimeoutMs: 5_000,
};

const START_POSITION: Position = {
  latitude: 42.2406,
  longitude: -8.7207,
};

const angleDelta = (from: number, to: number): number => {
  const delta = wrapRadians(to - from);
  return delta > Math.PI ? delta - Math.PI * 2 : delta;
};

export const createWindGpsDemoScenario = (): Scenario<WindGpsDemoState> => ({
  name: "wind-gps-demo",
  init: () => ({
    elapsedSeconds: 0,
    latitude: START_POSITION.latitude,
    longitude: START_POSITION.longitude,
  }),
  tick: (state, dtSeconds, timestamp) => {
    const elapsedSeconds = state.elapsedSeconds + Math.max(0, dtSeconds);

    // Smooth deterministic coastal route: approximately 6-9 kn with gentle turns.
    const sog = clamp(3.7 + Math.sin(elapsedSeconds / 34) * 0.55, 2.8, 4.6);
    const cog = wrapRadians(0.82 + Math.sin(elapsedSeconds / 75) * 0.32);
    const heading = wrapRadians(cog + Math.sin(elapsedSeconds / 21) * 0.045);
    const moved = stepPosition(
      state.latitude,
      state.longitude,
      sog * Math.max(0, dtSeconds),
      cog,
    );

    // True wind evolves slowly. A raised sine creates a repeatable gust every 45 s.
    const twd = wrapRadians(3.85 + Math.sin(elapsedSeconds / 52) * 0.42);
    const baseTws = 6.2 + Math.sin(elapsedSeconds / 28) * 1.15;
    const gustPhase = (elapsedSeconds % 45) / 45;
    const gust = gustPhase >= 0.72
      ? Math.sin(((gustPhase - 0.72) / 0.28) * Math.PI) * 3.4
      : 0;
    const tws = clamp(baseTws + gust, 3.5, 10.8);

    // Convert true wind (FROM direction) and vessel velocity to apparent wind.
    const trueEast = -tws * Math.sin(twd);
    const trueNorth = -tws * Math.cos(twd);
    const boatEast = sog * Math.sin(cog);
    const boatNorth = sog * Math.cos(cog);
    const apparentEast = trueEast - boatEast;
    const apparentNorth = trueNorth - boatNorth;
    const aws = Math.hypot(apparentEast, apparentNorth);
    const apparentFromGround = wrapRadians(
      Math.atan2(-apparentEast, -apparentNorth),
    );
    const awa = wrapRadians(angleDelta(heading, apparentFromGround));
    const twa = wrapRadians(angleDelta(heading, twd));

    const points: ScenarioPoint[] = [
      makePoint(
        PATHS.navigation.position,
        { latitude: moved.latitude, longitude: moved.longitude },
        timestamp,
        QualityFlag.Good,
        "vessels.self",
        SOURCE,
      ),
      makePoint(PATHS.navigation.speedOverGround, sog, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.navigation.courseOverGroundTrue, cog, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.navigation.headingTrue, heading, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.environment.wind.speedApparent, aws, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.environment.wind.angleApparent, awa, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.environment.wind.speedTrue, tws, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.environment.wind.angleTrueGround, twd, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
      makePoint(PATHS.environment.wind.angleTrueWater, twa, timestamp, QualityFlag.Good, "vessels.self", SOURCE),
    ];

    return {
      state: {
        elapsedSeconds,
        latitude: moved.latitude,
        longitude: moved.longitude,
      },
      points,
    };
  },
});
