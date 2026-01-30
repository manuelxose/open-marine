import {
  PATHS,
  QualityFlag,
  type Position,
} from "@omi/marine-data-contract";
import type { Scenario, ScenarioPoint } from "./scenario.js";
import {
  makePoint,
  makePointWithContext,
  stepPosition,
  METERS_PER_DEG_LAT,
} from "./scenario-utils.js";

interface FailureState {
  time: number;
  latitude: number;
  longitude: number;
  // AIS Threat
  threatLat: number;
  threatLon: number;
}

const START_LAT = 42.15;
const START_LON = -8.85;

export const createCombinedFailuresScenario = (): Scenario<FailureState> => {
  return {
    name: "combined-failures",
    init: () => ({
      time: 0,
      latitude: START_LAT,
      longitude: START_LON,
      threatLat: START_LAT + 0.05, // 3 miles North
      threatLon: START_LON // Same longitude
    }),
    tick: (state, dt, timestamp) => {
      const time = state.time + dt;
      
      // OWNSHIP: Static or slow moving North
      const ownSog = 5.0;
      const ownCog = 0; // North
      
      const moved = stepPosition(state.latitude, state.longitude, ownSog * dt, ownCog);
      
      // PHASES
      // 0-15s: NORMAL
      // 15s+: DEPTH ALARM (Shallow)
      // 30s+: BATTERY ALARM (Critical)
      // 45s+: AIS ALARM (Collision imminent)
      
      let depth = 15.0;
      if (time > 15) {
        depth = 1.8; // Shallow Alarm (< 2.5m?)
      }
      
      let voltage = 13.2;
      let current = 2.0;
      if (time > 30) {
        voltage = 10.5; // Critical low
        current = -50.0; // Massive discharge
      }
      
      let windSpeed = 12.0;
      if (time > 60) {
          windSpeed = 45.0; // Gale force
      }

      const points: ScenarioPoint[] = [
        makePoint(PATHS.navigation.position, { latitude: moved.latitude, longitude: moved.longitude }, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.speedOverGround, ownSog, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.courseOverGroundTrue, ownCog, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.headingTrue, ownCog, timestamp, QualityFlag.Good),
        
        makePoint(PATHS.environment.depth.belowTransducer, depth, timestamp, QualityFlag.Good),
        
        makePoint(PATHS.electrical.batteries.house.voltage, voltage, timestamp, QualityFlag.Warn),
        makePoint(PATHS.electrical.batteries.house.current, current, timestamp, QualityFlag.Good),
        
        makePoint(PATHS.environment.wind.speedApparent, windSpeed, timestamp, QualityFlag.Good),
        makePoint(PATHS.environment.wind.angleApparent, 0.5, timestamp, QualityFlag.Good),
      ];
      
      // AIS THREAT LOGIC
      // Target moving South, head on collision
      let threatLat = state.threatLat;
      let threatLon = state.threatLon;
      
      if (time > 45) {
        // Activate threat movement (fast approach)
        // Move south towards ownship
        const threatMove = stepPosition(threatLat, threatLon, 15.0 * dt, Math.PI); // South
        threatLat = threatMove.latitude;
        threatLon = threatMove.longitude;
        
        const context = "vessels.urn:mrn:imo:mmsi:666666666";
        points.push(
            makePointWithContext(context, PATHS.navigation.position, { latitude: threatLat, longitude: threatLon }, timestamp, QualityFlag.Good),
            makePointWithContext(context, PATHS.navigation.speedOverGround, 15.0, timestamp, QualityFlag.Good),
            makePointWithContext(context, PATHS.navigation.courseOverGroundTrue, Math.PI, timestamp, QualityFlag.Good), // South 180 deg
            makePointWithContext(context, PATHS.navigation.headingTrue, Math.PI, timestamp, QualityFlag.Good),
            makePointWithContext(context, "name", "COLLISION TESTER", timestamp, QualityFlag.Good)
        );
      }

      return {
        state: {
          time,
          latitude: moved.latitude,
          longitude: moved.longitude,
          threatLat,
          threatLon
        },
        points
      };
    },
  };
};
