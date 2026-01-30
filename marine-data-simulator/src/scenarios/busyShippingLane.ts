import {
  PATHS,
  QualityFlag,
  type Position,
} from "@omi/marine-data-contract";
import type { Scenario, ScenarioPoint } from "./scenario.js";
import {
  clamp,
  makePoint,
  makePointWithContext,
  randomInRange,
  stepPosition,
  wrapRadians,
  METERS_PER_DEG_LAT,
} from "./scenario-utils.js";

interface AisVessel {
  mmsi: string;
  name: string;
  type: 'cargo' | 'passenger' | 'fishing' | 'pleasure' | 'tug';
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  length: number;
  beam: number;
  turnRate: number; // radians per second
  broadcastTimer: number;
}

interface BusyLaneState {
  ownship: {
    latitude: number;
    longitude: number;
    sog: number;
    cog: number;
    heading: number;
  };
  targets: AisVessel[];
  time: number;
}

const CENTER_LAT = 42.2406;
const CENTER_LON = -8.7207;

// Generate diverse targets
const generateTargets = (count: number): AisVessel[] => {
  const targets: AisVessel[] = [];
  const types = ['cargo', 'passenger', 'fishing', 'pleasure', 'tug'] as const;
  
  for (let i = 0; i < count; i++) {
    // Random position within ~3 miles
    const offsetLat = randomInRange(-0.06, 0.06);
    const offsetLon = randomInRange(-0.08, 0.08);
    
    // Determine behavior
    const isCollider = i < 3; // First 3 are collision threats
    
    let cog = randomInRange(0, Math.PI * 2);
    let sog = randomInRange(2, 12);
    
    // Cargo ships are fast and straight
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === 'cargo' || type === 'passenger') {
      sog = randomInRange(10, 22);
    }
    
    if (isCollider) {
      // Aim at center (roughly)
      const bearingToCenter = Math.atan2(-offsetLon, -offsetLat); // Approximate
      cog = bearingToCenter + randomInRange(-0.1, 0.1);
      sog = 15; // Fast threat
    }

    targets.push({
      mmsi: (200000000 + i).toString(),
      name: isCollider ? `THREAT ${i+1}` : `${type.toUpperCase()} ${i+1}`,
      type,
      latitude: CENTER_LAT + offsetLat,
      longitude: CENTER_LON + offsetLon,
      sog,
      cog,
      length: randomInRange(10, 200),
      beam: randomInRange(3, 30),
      turnRate: randomInRange(-0.001, 0.001),
      broadcastTimer: Math.random() * 60
    });
  }
  return targets;
};

export const createBusyShippingLaneScenario = (): Scenario<BusyLaneState> => {
  return {
    name: "busy-shipping-lane",
    init: () => ({
      ownship: {
        latitude: CENTER_LAT,
        longitude: CENTER_LON,
        sog: 6.0,
        cog: 0, // North
        heading: 0,
      },
      targets: generateTargets(25),
      time: 0,
    }),
    tick: (state, dt, timestamp) => {
      // Move ownship
      const ownMove = stepPosition(
        state.ownship.latitude, 
        state.ownship.longitude, 
        state.ownship.sog * dt, 
        state.ownship.cog
      );
      
      const newOwn = {
        ...state.ownship,
        latitude: ownMove.latitude,
        longitude: ownMove.longitude,
      };

      const points: ScenarioPoint[] = [
        makePoint(PATHS.navigation.position, { latitude: newOwn.latitude, longitude: newOwn.longitude }, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.speedOverGround, newOwn.sog, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.courseOverGroundTrue, newOwn.cog, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.headingTrue, newOwn.heading, timestamp, QualityFlag.Good),
        // Add Environment Data so dashboard is not empty
        makePoint(PATHS.environment.depth.belowTransducer, 25.0 + randomInRange(-0.5, 0.5), timestamp, QualityFlag.Good),
        makePoint(PATHS.environment.wind.speedApparent, 12.0 + randomInRange(-2, 2), timestamp, QualityFlag.Good),
        makePoint(PATHS.environment.wind.angleApparent, 0.5, timestamp, QualityFlag.Good), // Starboard Tack
        makePoint(PATHS.electrical.batteries.house.voltage, 12.8, timestamp, QualityFlag.Good),
      ];

      // Move Targets
      const newTargets = state.targets.map(t => {
        // Simple linear motion + wandering
        t.cog = wrapRadians(t.cog + t.turnRate * dt);
        // Occasionally change turn rate
        if (Math.random() < 0.01) t.turnRate = randomInRange(-0.005, 0.005);
        
        const move = stepPosition(t.latitude, t.longitude, t.sog * dt, t.cog);
        t.latitude = move.latitude;
        t.longitude = move.longitude;
        
        // Static data broadcast
        t.broadcastTimer -= dt;
        const sendStatic = t.broadcastTimer <= 0;
        if (sendStatic) t.broadcastTimer = 60 + randomInRange(0, 10);
        
        const context = `vessels.urn:mrn:imo:mmsi:${t.mmsi}`;
        
        points.push(
          makePointWithContext(context, PATHS.navigation.position, { latitude: t.latitude, longitude: t.longitude }, timestamp, QualityFlag.Good),
          makePointWithContext(context, PATHS.navigation.speedOverGround, t.sog, timestamp, QualityFlag.Good),
          makePointWithContext(context, PATHS.navigation.courseOverGroundTrue, t.cog, timestamp, QualityFlag.Good),
          makePointWithContext(context, PATHS.navigation.headingTrue, t.cog, timestamp, QualityFlag.Good)
        );

        if (sendStatic) {
          points.push(
            makePointWithContext(context, "name", t.name, timestamp, QualityFlag.Good),
            makePointWithContext(context, "design.length", t.length, timestamp, QualityFlag.Good),
            makePointWithContext(context, "design.beam", t.beam, timestamp, QualityFlag.Good)
          );
        }

        return t;
      });

      return {
        state: {
          ownship: newOwn,
          targets: newTargets,
          time: state.time + dt,
        },
        points
      };
    },
  };
};
