import {
  PATHS,
  QualityFlag,
  type Position,
  type SignalKPath,
  type SourceRef,
} from "@omi/marine-data-contract";
import type { Scenario, ScenarioPoint } from "./scenario.js";

interface BasicCruiseState {
  latitude: number;
  longitude: number;
  sog: number;
  sogTarget: number;
  cog: number;
  cogTarget: number;
  headingOffset: number;
  distanceTravelled: number;
  depth: number;
  shallowRemainingSec: number;
  shallowDurationSec: number;
  shallowSeverity: number;
  nextShallowSec: number;
  tws: number;          // True Wind Speed
  twsTarget: number;
  twd: number;          // True Wind Direction (North ref)
  twdTarget: number;
  gustRemainingSec: number;
  gustDurationSec: number;
  gustAmplitude: number;
  gustNextSec: number;
  batterySoc: number;
  batteryMode: "charge" | "discharge";
  batteryCurrent: number;
  batteryCurrentTarget: number;
  batteryPhaseRemainingSec: number;
}

const METERS_PER_DEG_LAT = 111_320;
const MIN_SOG = 1.5;
const MAX_SOG = 5.2;
const MIN_DEPTH = 0.6;
const MIN_WIND_SPEED = 2.0;
const MAX_WIND_SPEED = 9.5;
const BATTERY_CAPACITY_AH = 200;
const BATTERY_INTERNAL_RESISTANCE = 0.03;
const BATTERY_VOLTAGE_MIN = 10.8;
const BATTERY_VOLTAGE_MAX = 14.4;

const SOURCE_REF: SourceRef = {
  label: "mock",
  type: "virtual",
  priority: 10,
  fallback: "signalk",
  validityTimeoutMs: 5_000,
};

const wrapRadians = (value: number): number => {
  const twoPi = Math.PI * 2;
  const wrapped = value % twoPi;
  return wrapped < 0 ? wrapped + twoPi : wrapped;
};

const angleDelta = (from: number, to: number): number => {
  const delta = wrapRadians(to - from);
  return delta > Math.PI ? delta - Math.PI * 2 : delta;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const smoothValue = (current: number, target: number, factor: number): number => {
  return current + (target - current) * factor;
};

const smoothAngle = (current: number, target: number, factor: number): number => {
  return wrapRadians(current + angleDelta(current, target) * factor);
};

const jitter = (value: number, amplitude: number): number => {
  return value + (Math.random() * 2 - 1) * amplitude;
};

const randomInRange = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

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

const scheduleShallowEvent = (): {
  durationSec: number;
  nextShallowSec: number;
  severity: number;
} => {
  return {
    durationSec: randomInRange(18, 28),
    nextShallowSec: randomInRange(140, 240),
    severity: randomInRange(4, 7),
  };
};

const scheduleGust = (): {
  durationSec: number;
  nextGustSec: number;
  amplitude: number;
} => {
  return {
    durationSec: randomInRange(6, 12),
    nextGustSec: randomInRange(18, 40),
    amplitude: randomInRange(1.2, 3.2),
  };
};

const scheduleBatteryPhase = (): {
  durationSec: number;
  mode: "charge" | "discharge";
  targetCurrent: number;
} => {
  const charge = Math.random() < 0.4;
  return {
    durationSec: randomInRange(120, 220),
    mode: charge ? "charge" : "discharge",
    targetCurrent: charge ? randomInRange(-10, -4) : randomInRange(6, 18),
  };
};

const computeProfileDepth = (distanceMeters: number): number => {
  const longWave = 2.6 * Math.sin(distanceMeters / 260);
  const midWave = 1.4 * Math.sin(distanceMeters / 120);
  const shortWave = 0.7 * Math.sin(distanceMeters / 40);
  return 14 + longWave + midWave + shortWave;
};

const computeShallowDrop = (
  remainingSec: number,
  durationSec: number,
  severity: number,
): number => {
  if (remainingSec <= 0 || durationSec <= 0) {
    return 0;
  }
  const progress = 1 - remainingSec / durationSec;
  const shape = Math.sin(Math.PI * progress);
  return severity * shape;
};

const computeGustBoost = (
  remainingSec: number,
  durationSec: number,
  amplitude: number,
): number => {
  if (remainingSec <= 0 || durationSec <= 0) {
    return 0;
  }
  const progress = 1 - remainingSec / durationSec;
  return amplitude * Math.sin(Math.PI * progress);
};

const makePoint = (
  path: SignalKPath,
  value: number | Position,
  timestamp: string,
  quality: QualityFlag,
): ScenarioPoint => ({
  path,
  value,
  timestamp,
  source: SOURCE_REF,
  quality,
});

export const createBasicCruiseScenario = (): Scenario<BasicCruiseState> => {
  return {
    name: "basic-cruise",
    init: () => ({
      latitude: 42.2406,
      longitude: -8.7207,
      sog: 3.2,
      sogTarget: 3.2,
      cog: 1.1,
      cogTarget: 1.1,
      headingOffset: -0.05,
      distanceTravelled: 0,
      depth: 12.5,
      shallowRemainingSec: 0,
      shallowDurationSec: 0,
      shallowSeverity: 0,
      nextShallowSec: 160,
      tws: 5.4,
      twsTarget: 5.4,
      twd: 3.2, // ~South wind
      twdTarget: 3.2,
      gustRemainingSec: 0,
      gustDurationSec: 0,
      gustAmplitude: 0,
      gustNextSec: 24,
      batterySoc: 0.82,
      batteryMode: "discharge",
      batteryCurrent: 8.0,
      batteryCurrentTarget: 8.0,
      batteryPhaseRemainingSec: 150,
    }),
    tick: (state, dtSeconds, timestamp) => {
      const nextSogTarget = clamp(state.sogTarget + randomInRange(-0.08, 0.08), MIN_SOG, MAX_SOG);
      const nextSog = smoothValue(state.sog, nextSogTarget, 0.08);

      const nextCogTarget = wrapRadians(state.cogTarget + randomInRange(-0.01, 0.01));
      const nextCog = smoothAngle(state.cog, nextCogTarget, 0.12);

      const nextHeadingOffset = clamp(
        state.headingOffset + randomInRange(-0.005, 0.005),
        -0.2,
        0.2,
      );
      const nextHeading = wrapRadians(nextCog + nextHeadingOffset);

      const distanceMeters = nextSog * dtSeconds;
      const moved = stepPosition(state.latitude, state.longitude, distanceMeters, nextCog);
      const nextDistanceTravelled = state.distanceTravelled + nextSog * dtSeconds;

      let shallowRemainingSec = Math.max(0, state.shallowRemainingSec - dtSeconds);
      let shallowDurationSec = state.shallowDurationSec;
      let shallowSeverity = state.shallowSeverity;
      let nextShallowSec = Math.max(0, state.nextShallowSec - dtSeconds);

      if (shallowRemainingSec <= 0 && nextShallowSec <= 0) {
        const scheduled = scheduleShallowEvent();
        shallowRemainingSec = scheduled.durationSec;
        shallowDurationSec = scheduled.durationSec;
        shallowSeverity = scheduled.severity;
        nextShallowSec = scheduled.nextShallowSec;
      }

      const profileDepth = computeProfileDepth(nextDistanceTravelled);
      const shallowDrop = computeShallowDrop(
        shallowRemainingSec,
        shallowDurationSec,
        shallowSeverity,
      );
      const rawDepth = Math.max(MIN_DEPTH, jitter(profileDepth - shallowDrop, 0.15));
      const nextDepth = smoothValue(state.depth, rawDepth, 0.2);

      // Wind Dynamics (True Wind)
      const nextTwsTarget = clamp(
        state.twsTarget + randomInRange(-0.1, 0.1),
        MIN_WIND_SPEED,
        MAX_WIND_SPEED,
      );
      const nextTws = smoothValue(state.tws, nextTwsTarget, 0.12);

      const nextTwdTarget = wrapRadians(
        state.twdTarget + randomInRange(-0.012, 0.012),
      );
      const nextTwd = smoothAngle(state.twd, nextTwdTarget, 0.1);

      let gustRemainingSec = Math.max(0, state.gustRemainingSec - dtSeconds);
      let gustDurationSec = state.gustDurationSec;
      let gustAmplitude = state.gustAmplitude;
      let gustNextSec = Math.max(0, state.gustNextSec - dtSeconds);

      if (gustRemainingSec <= 0 && gustNextSec <= 0) {
        const scheduled = scheduleGust();
        gustRemainingSec = scheduled.durationSec;
        gustDurationSec = scheduled.durationSec;
        gustAmplitude = scheduled.amplitude;
        gustNextSec = scheduled.nextGustSec;
      }

      const gustBoost = computeGustBoost(gustRemainingSec, gustDurationSec, gustAmplitude);
      const twsInstant = Math.max(0, nextTws + gustBoost);
      
      // Calculate Apparent Wind
      // Vectors: Wind comes FROM TWD, Boat moves TOWARDS COG
      const windU = -twsInstant * Math.sin(nextTwd);
      const windV = -twsInstant * Math.cos(nextTwd);
      const boatU = nextSog * Math.sin(nextCog);
      const boatV = nextSog * Math.cos(nextCog);
      
      const appU = windU - boatU;
      const appV = windV - boatV;
      
      const awsInstant = Math.sqrt(appU * appU + appV * appV);
      // atan2(x, y) for Map/Nav conventions (Clockwise from North) is typically atan2(x, y) 
      // but JS atan2 is (y, x). 
      // Let's use standard atan2(-u, -v) to get direction FROM.
      // u is East (sin), v is North (cos).
      const awaGeo = Math.atan2(-appU, -appV); // Direction FROM
      
      const reportedAws = Math.max(0, jitter(awsInstant, 0.12));
      const reportedAwa = wrapRadians(angleDelta(nextHeading, awaGeo)); // Relative to Bow
      const reportedTws = Math.max(0, jitter(twsInstant, 0.12));
      const reportedTwd = wrapRadians(jitter(nextTwd, 0.05));
      const reportedTwa = wrapRadians(angleDelta(nextHeading, reportedTwd)); // True Wind Angle (Bow ref)

      let batteryPhaseRemainingSec = Math.max(0, state.batteryPhaseRemainingSec - dtSeconds);
      let batteryMode = state.batteryMode;
      let batteryCurrentTarget = state.batteryCurrentTarget;

      if (batteryPhaseRemainingSec <= 0) {
        const scheduled = scheduleBatteryPhase();
        batteryPhaseRemainingSec = scheduled.durationSec;
        batteryMode = scheduled.mode;
        batteryCurrentTarget = scheduled.targetCurrent;
      }

      const nextBatteryCurrent = smoothValue(state.batteryCurrent, batteryCurrentTarget, 0.18);
      const deltaAh = (nextBatteryCurrent * dtSeconds) / 3_600;
      const nextBatterySoc = clamp(
        state.batterySoc - deltaAh / BATTERY_CAPACITY_AH,
        0.05,
        1,
      );
      const baseVoltage =
        11.8 + nextBatterySoc * 1.4 + (batteryMode === "charge" ? 0.2 : 0);
      const sagVoltage = baseVoltage - nextBatteryCurrent * BATTERY_INTERNAL_RESISTANCE;
      const nextBatteryVoltage = clamp(
        jitter(sagVoltage, 0.05),
        BATTERY_VOLTAGE_MIN,
        BATTERY_VOLTAGE_MAX,
      );

      const nextState: BasicCruiseState = {
        latitude: moved.latitude,
        longitude: moved.longitude,
        sog: nextSog,
        sogTarget: nextSogTarget,
        cog: nextCog,
        cogTarget: nextCogTarget,
        headingOffset: nextHeadingOffset,
        distanceTravelled: nextDistanceTravelled,
        depth: nextDepth,
        shallowRemainingSec,
        shallowDurationSec,
        shallowSeverity,
        nextShallowSec,
        tws: nextTws,
        twsTarget: nextTwsTarget,
        twd: nextTwd,
        twdTarget: nextTwdTarget,
        gustRemainingSec,
        gustDurationSec,
        gustAmplitude,
        gustNextSec,
        batterySoc: nextBatterySoc,
        batteryMode,
        batteryCurrent: nextBatteryCurrent,
        batteryCurrentTarget,
        batteryPhaseRemainingSec,
      };

      const position: Position = {
        latitude: moved.latitude,
        longitude: moved.longitude,
      };

      const reportedSog = Math.max(0, jitter(nextSog, 0.08));
      const reportedCog = wrapRadians(jitter(nextCog, 0.03));
      const reportedHeading = wrapRadians(jitter(nextHeading, 0.02));

      const points: ScenarioPoint[] = [
        makePoint(PATHS.environment.depth.belowTransducer, nextDepth, timestamp, QualityFlag.Good),
        makePoint(
          PATHS.environment.wind.speedApparent,
          reportedAws,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(
          PATHS.environment.wind.angleApparent,
          reportedAwa,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(
          PATHS.environment.wind.speedTrue,
          reportedTws,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(
          PATHS.environment.wind.angleTrueGround,
          reportedTwd,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(
          PATHS.environment.wind.angleTrueWater,
          reportedTwa,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(
          PATHS.electrical.batteries.house.voltage,
          nextBatteryVoltage,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(
          PATHS.electrical.batteries.house.current,
          nextBatteryCurrent,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(PATHS.navigation.position, position, timestamp, QualityFlag.Good),
        makePoint(PATHS.navigation.speedOverGround, reportedSog, timestamp, QualityFlag.Good),
        makePoint(
          PATHS.navigation.courseOverGroundTrue,
          reportedCog,
          timestamp,
          QualityFlag.Good,
        ),
        makePoint(PATHS.navigation.headingTrue, reportedHeading, timestamp, QualityFlag.Good),
      ];

      return {
        state: nextState,
        points,
      };
    },
  };
};
