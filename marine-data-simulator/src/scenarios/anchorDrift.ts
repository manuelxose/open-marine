import { PATHS, QualityFlag, type Position } from "@omi/marine-data-contract";
import type { Scenario, ScenarioPoint } from "./scenario.js";

interface AnchorDriftState {
  latitude: number;
  longitude: number;
  driftSpeedKnots: number;
  driftHeading: number;
  distanceFromAnchor: number;
  elapsedTime: number;
}

const METERS_PER_DEG_LAT = 111_320;
const START_LAT = 42.1234;
const START_LON = -8.1234;

const stepPosition = (
  latitude: number,
  longitude: number,
  distanceMeters: number,
  cog: number,
): { latitude: number; longitude: number } => {
  const latRad = (latitude * Math.PI) / 180;
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(latRad);

  const north = Math.cos(cog) * distanceMeters;
  const east = Math.sin(cog) * distanceMeters;

  const deltaLat = north / METERS_PER_DEG_LAT;
  const deltaLon = east / metersPerDegLon;

  return {
    latitude: latitude + deltaLat,
    longitude: longitude + deltaLon,
  };
};

export const createAnchorDriftScenario = (): Scenario<AnchorDriftState> => {
  return {
    name: "anchor-drift",
    init: () => ({
      latitude: START_LAT,
      longitude: START_LON,
      driftSpeedKnots: 2.0, // ~1 m/s
      driftHeading: Math.PI / 4, // NE
      distanceFromAnchor: 0,
      elapsedTime: 0,
    }),
    tick: (state, dtSeconds, timestamp) => {
      // Move boat
      const speedMetersPerSec = state.driftSpeedKnots * 0.514444; 
      const dist = speedMetersPerSec * dtSeconds;
      
      const moved = stepPosition(state.latitude, state.longitude, dist, state.driftHeading);
      const newDistance = state.distanceFromAnchor + dist; 

      const position: Position = {
        latitude: moved.latitude,
        longitude: moved.longitude,
      };

      const points: ScenarioPoint[] = [
        {
          path: PATHS.navigation.position,
          value: position,
          timestamp,
          quality: QualityFlag.Good,
          source: { label: "sim", type: "virtual" }
        },
        {
          path: PATHS.navigation.speedOverGround,
          value: speedMetersPerSec,
          timestamp,
          quality: QualityFlag.Good,
          source: { label: "sim", type: "virtual" }
        },
        {
          path: PATHS.environment.depth.belowTransducer,
          value: 10.0,
          timestamp,
          quality: QualityFlag.Good,
           source: { label: "sim", type: "virtual" }
        },
        {
            path: PATHS.electrical.batteries.house.voltage,
            value: 12.8,
            timestamp,
             quality: QualityFlag.Good,
             source: { label: "sim", type: "virtual" }
        }
      ];

      return {
        state: {
          ...state,
          latitude: moved.latitude,
          longitude: moved.longitude,
          distanceFromAnchor: newDistance,
          elapsedTime: state.elapsedTime + dtSeconds
        },
        points,
      };
    },
  };
};
