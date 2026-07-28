import type {
  SimulationChannelDefinition,
  SimulationChannelQuality,
  SimulationSample,
  SimulationScenarioDocument,
} from "@omi/marine-data-contract";
import { createSeededRandom, type SeededRandom } from "./seeded-random.js";
import { TimelineEngine, type ChannelState } from "./timeline-engine.js";

const KT_TO_MS = 0.514444;

export interface SignalGeneratorOptions {
  wind?: {
    twsKt?: number | undefined;
    twdDeg?: number | undefined;
    gustProbability?: number | undefined;
    gustMaxDeltaKt?: number | undefined;
  };
  nav?: {
    boatSpeedKt?: number | undefined;
    courseDeg?: number | undefined;
    origin?: { latitude: number; longitude: number } | undefined;
    currentSetDeg?: number | undefined;
    currentDriftKt?: number | undefined;
  };
  depth?: { baseM?: number | undefined };
  electrical?: { batteryV?: number | undefined };
  engine?: { rpm?: number | undefined };
  autopilot?: { targetAwaDeg?: number | undefined; targetHeadingDeg?: number | undefined };
  safety?: { faultStartSec?: number | undefined };
}

/**
 * Build generator options from a run's tunable `parameters`. Parameter ids here are the canonical
 * keys that presets and the wind generator must declare so the values actually drive the signal.
 */
export const buildGeneratorOptions = (
  parameters: Record<string, number | boolean | string> = {},
  origin?: { latitude: number; longitude: number } | undefined,
): SignalGeneratorOptions => {
  const num = (key: string): number | undefined =>
    typeof parameters[key] === "number" ? (parameters[key] as number) : undefined;
  return {
    wind: {
      twsKt: num("windSpeedKt"),
      twdDeg: num("windDirDeg"),
      gustProbability: num("gustProbability"),
      gustMaxDeltaKt: num("gustMaxDeltaKt"),
    },
    nav: {
      boatSpeedKt: num("boatSpeedKt"),
      courseDeg: num("courseDeg"),
      origin,
      currentSetDeg: num("currentSetDeg"),
      currentDriftKt: num("currentDriftKt"),
    },
    depth: { baseM: num("depthM") },
    electrical: { batteryV: num("batteryV") },
    engine: { rpm: num("engineRpm") },
    autopilot: { targetAwaDeg: num("targetAwaDeg"), targetHeadingDeg: num("targetHeadingDeg") },
    safety: { faultStartSec: num("faultStartSec") },
  };
};

export interface SignalSnapshot {
  value: unknown;
  unit: string;
  quality: SimulationChannelQuality;
}

/** Per-tick physical state, computed once so wind/nav channels stay mutually consistent. */
interface TickState {
  position: { latitude: number; longitude: number };
  sogMs: number;
  cogRad: number;
  headingRad: number;
  twsMs: number;
  twdRad: number;
  awsMs: number;
  awaRad: number;
}

/** Per-tick autopilot telemetry, derived from the boat motion + scenario kind. */
interface AutopilotTick {
  state: string;
  mode: string;
  engaged: boolean;
  driveEnabled: boolean;
  fault: string;
  windHazard: string;
  noGo: boolean;
  targetHeading: number;
  targetWindAngle: number;
  targetRudder: number;
  rudder: number;
  driveCurrent: number;
  voltage: number | undefined;
}

type AutopilotKind = "sail" | "motor" | "safety";

export class SignalGenerator {
  private readonly random: SeededRandom;
  private readonly timeline: TimelineEngine;
  private readonly channelStates = new Map<string, ChannelState>();
  private readonly wind;
  private readonly nav;
  private readonly autopilotTuning;
  private readonly faultStartSec: number;
  private readonly kind: AutopilotKind | null;
  private readonly adverse: boolean;
  private readonly depthBaseM: number | undefined;
  private readonly batteryV: number | undefined;
  private readonly engineRpmHz: number | undefined;
  private tick: TickState | null = null;
  private ap: AutopilotTick | null = null;

  constructor(
    private readonly seed: number,
    private readonly scenario: SimulationScenarioDocument,
    options: SignalGeneratorOptions = {},
  ) {
    this.random = createSeededRandom(seed, "lcg");
    this.timeline = new TimelineEngine(scenario.timeline);
    this.wind = {
      twsKt: options.wind?.twsKt ?? 12,
      twdDeg: options.wind?.twdDeg ?? 45,
      gustProbability: options.wind?.gustProbability ?? 0.1,
      gustMaxDeltaKt: options.wind?.gustMaxDeltaKt ?? 5,
    };
    this.nav = {
      boatSpeedKt: options.nav?.boatSpeedKt ?? 8.16, // ~4.2 m/s baseline
      courseDeg: options.nav?.courseDeg ?? 65.9, // ~1.15 rad baseline
      origin: options.nav?.origin ?? { latitude: 42.2406, longitude: -8.7207 },
      currentSetDeg: options.nav?.currentSetDeg ?? 0,
      currentDriftKt: options.nav?.currentDriftKt ?? 0,
    };
    this.autopilotTuning = {
      targetAwaDeg: options.autopilot?.targetAwaDeg ?? 42,
      targetHeadingDeg: options.autopilot?.targetHeadingDeg ?? (options.nav?.courseDeg ?? 65.9),
    };
    this.faultStartSec = options.safety?.faultStartSec ?? 30;
    this.adverse = scenario.tags.includes("stress") || scenario.tags.includes("current") || scenario.id.includes("wind-shift");
    const hasAutopilotChannels = scenario.channels.some((channel) => channel.id.startsWith("ap."));
    this.kind = !hasAutopilotChannels
      ? null
      : scenario.expectation?.objective === "safety" || scenario.id.includes("safety")
        ? "safety"
        : scenario.expectation?.objective === "wind" || scenario.id.includes("sail")
          ? "sail"
          : scenario.expectation?.objective === "heading" || scenario.id.includes("motor")
            ? "motor"
            : null;
    this.depthBaseM = options.depth?.baseM;
    this.batteryV = options.electrical?.batteryV;
    this.engineRpmHz = typeof options.engine?.rpm === "number" ? options.engine.rpm / 60 : undefined;

    for (const channel of scenario.channels) {
      const initial = this.initialValue(channel);
      this.channelStates.set(channel.id, {
        baseValue: initial,
        currentValue: initial,
        faultActive: false,
      });
    }
  }

  generate(simulatedTimeMs: number): {
    samples: SimulationSample[];
    snapshots: Map<string, SignalSnapshot>;
  } {
    this.timeline.tick(simulatedTimeMs, this.channelStates);
    this.tick = this.computeTickState(simulatedTimeMs);
    this.ap = this.computeAutopilot(simulatedTimeMs / 1000, this.tick.headingRad);
    const samples: SimulationSample[] = [];
    const snapshots = new Map<string, SignalSnapshot>();

    for (const channel of this.scenario.channels) {
      const state = this.channelStates.get(channel.id);
      if (!state) continue;

      let value = this.computeValue(channel, simulatedTimeMs, state);
      let quality: SimulationChannelQuality = "good";

      if (state.faultActive) {
        quality = "bad";
        value = this.faultValue(channel, value);
      }

      if (typeof value === "number" && channel.range) {
        value = Math.max(channel.range.min, Math.min(channel.range.max, value));
      }

      state.currentValue = value;
      samples.push({ channelId: channel.id, value, quality });
      snapshots.set(channel.id, { value, unit: channel.canonicalUnit, quality });
    }

    return { samples, snapshots };
  }

  /**
   * Boat motion (position/SOG/heading) + coupled true/apparent wind for this tick. Apparent wind is
   * the true wind vector plus the boat velocity (vector addition), never a copy of TWS/TWD. Motion
   * uses the parametric cruise so the tunable boat-speed/course actually move the vessel; the
   * autopilot only steers around it (see computeAutopilot).
   */
  private computeTickState(simulatedTimeMs: number): TickState {
    const t = simulatedTimeMs / 1000;
    const phase = t * 0.05 + (this.seed % 1000) * 0.001;

    // Adverse scenarios add large wave/current disturbances that push the bow off course so the
    // autopilot has to fight back with bigger rudder and drive current.
    const disturbance = this.adverse
      ? 0.32 * Math.sin(t / 6.5) + 0.16 * Math.sin(t / 2.1) + (this.isGust(t) ? 0.28 * Math.sin(t * 1.7) : 0)
      : 0;
    const sogJitter = this.adverse ? 0.5 * Math.sin(t / 4) : 0;

    const position = this.cruisePosition(t);
    const sogMs = Math.max(0, this.boatSpeedMs() + 0.7 * Math.sin(phase * 0.6) + sogJitter + this.random.nextNoise(this.adverse ? 0.2 : 0.08));
    const cogRad = this.courseOverGround(t, disturbance);
    const headingRad = wrapRadians(this.cruiseCourse(t) + 0.06 * Math.sin(phase) + disturbance);

    const twsMs = this.windSpeed(phase);
    const twdRad = wrapRadians(degToRad(this.wind.twdDeg) + phase * 0.5 + (this.adverse ? 0.45 * Math.sin(t / 17) : 0));

    const twaRad = wrapToPi(twdRad - headingRad);
    const awsMs = Math.sqrt(twsMs * twsMs + sogMs * sogMs + 2 * twsMs * sogMs * Math.cos(twaRad));
    const physicsAwa = Math.atan2(twsMs * Math.sin(twaRad), twsMs * Math.cos(twaRad) + sogMs);

    // In wind mode the autopilot holds a set apparent-wind angle, so AWA tracks the target (with gust
    // excursions) rather than the raw physics value.
    const awaRad = this.kind === "sail" ? this.heldApparentWindAngle(t) : physicsAwa;

    return { position, sogMs, cogRad, headingRad, twsMs, twdRad, awsMs, awaRad };
  }

  private heldApparentWindAngle(t: number): number {
    const target = degToRad(this.autopilotTuning.targetAwaDeg);
    const gustAmp = this.adverse ? 26 : 12;
    const wanderAmp = this.adverse ? 7 : 3;
    const gust = this.isGust(t) ? degToRad(gustAmp) * Math.sin(t * 1.3) : 0;
    return clamp(target + degToRad(wanderAmp) * Math.sin(t / 9) + gust, -Math.PI, Math.PI);
  }

  private isGust(t: number): boolean {
    // Adverse conditions gust roughly every 30 s; calm conditions every 60 s.
    return this.adverse ? t % 30 >= 18 && t % 30 < 27 : t % 60 >= 42 && t % 60 < 54;
  }

  /** Adverse sail runs occasionally trip an accidental-tack hazard for the pilot to recover from. */
  private isAccidentalTack(t: number): boolean {
    return this.adverse && this.kind === "sail" && t % 48 >= 36 && t % 48 < 41;
  }

  /**
   * Autopilot telemetry for the curated scenarios; null/standby leaves channels at safe defaults.
   * Closed-loop scenarios always report standby here — engagement is now the operator's real
   * action on the real autopilot engine, never scripted by the scenario, so this generator must
   * not fake "engaged" state that could be mistaken for the real thing. Real autopilot telemetry
   * for those runs comes from the engine's own Signal K publish, not this mirror.
   */
  private computeAutopilot(t: number, headingRad: number): AutopilotTick {
    const standby: AutopilotTick = {
      state: "standby", mode: "compass", engaged: false, driveEnabled: false, fault: "none",
      windHazard: "none", noGo: false, targetHeading: headingRad, targetWindAngle: 0,
      targetRudder: 0, rudder: 0, driveCurrent: 0, voltage: undefined,
    };
    if (!this.kind || this.scenario.mode === "closed-loop") {
      // Battery sag is an environmental fault condition (like wind or current), not an autopilot
      // command, so it still plays out even though engagement itself is never faked.
      const voltageFaultActive = this.kind === "safety" && t >= this.faultStartSec;
      return { ...standby, voltage: voltageFaultActive ? 10.6 : undefined };
    }

    const faulted = this.kind === "safety" && t >= this.faultStartSec;
    const targetHeading = this.kind === "motor" || this.kind === "safety"
      ? degToRad(this.autopilotTuning.targetHeadingDeg)
      : wrapRadians(headingRad); // wind mode holds the wind, target tracks the bow
    // Compass modes steer on heading error; wind mode steers to cancel the apparent-wind-angle error.
    const error = this.kind === "sail"
      ? wrapToPi(this.heldApparentWindAngle(t) - degToRad(this.autopilotTuning.targetAwaDeg))
      : wrapToPi(targetHeading - headingRad);
    const gain = this.kind === "sail" ? 1.6 : 1.3;
    const targetRudder = clamp(error * gain, -0.5, 0.5);
    const rudder = clamp(targetRudder * 0.85 + this.random.nextNoise(0.01), -0.61, 0.61);

    const state = faulted ? "fault" : this.kind === "sail" ? "wind" : "auto";
    const mode = this.kind === "sail" ? "wind" : "compass";
    const engaged = !faulted;
    const windHazard = this.kind !== "sail"
      ? "none"
      : this.isAccidentalTack(t)
        ? "accidental-tack"
        : this.isGust(t)
          ? "gust"
          : "none";
    const driveCurrent = faulted
      ? 0
      : Math.max(0, 1.2 + Math.abs(rudder) * 9 + this.random.nextNoise(0.2));
    const voltage = faulted ? 10.6 : undefined;

    return {
      state,
      mode,
      engaged,
      driveEnabled: engaged,
      fault: faulted ? "low-battery" : "none",
      windHazard,
      noGo: false,
      targetHeading,
      targetWindAngle: degToRad(this.autopilotTuning.targetAwaDeg),
      targetRudder: faulted ? 0 : targetRudder,
      rudder: faulted ? 0 : rudder,
      driveCurrent,
      voltage,
    };
  }

  private initialValue(channel: SimulationChannelDefinition): number {
    if (channel.id === "depth.belowTransducer" && this.depthBaseM !== undefined) return this.depthBaseM;
    if (channel.id === "elec.voltage" && this.batteryV !== undefined) return this.batteryV;
    if (channel.id === "motor.rpm" && this.engineRpmHz !== undefined) return this.engineRpmHz;
    if (!channel.range) return 0;
    return channel.range.min + (channel.range.max - channel.range.min) * 0.3;
  }

  private computeValue(channel: SimulationChannelDefinition, simulatedTimeMs: number, state: ChannelState): unknown {
    const t = simulatedTimeMs / 1000;
    const phase = t * 0.05 + (this.seed % 1000) * 0.001;
    const tick = this.tick!;
    const ap = this.ap!;
    this.applyRamp(simulatedTimeMs, state);

    switch (channel.id) {
      case "nav.position":
        return tick.position;
      case "nav.sog":
        return tick.sogMs;
      case "nav.cog":
        return tick.cogRad;
      case "nav.heading":
        return tick.headingRad;
      case "wind.tws":
        return tick.twsMs;
      case "wind.aws":
        return tick.awsMs;
      case "wind.twd":
        return tick.twdRad;
      case "wind.awa":
        return tick.awaRad;
      case "depth.belowTransducer":
        return state.baseValue + 4 * Math.sin(phase * 0.3) + this.random.nextNoise(0.3);
      case "elec.voltage":
        if (ap.voltage !== undefined) return ap.voltage;
        return state.baseValue + 0.8 * Math.sin(phase * 0.5) + this.random.nextNoise(0.05);
      case "elec.current":
        return state.baseValue + 3 * Math.sin(phase * 0.8) + this.random.nextNoise(0.5);
      case "elec.soc":
        return clamp(state.baseValue + 0.1 * Math.sin(phase * 0.2), 0, 1);
      case "motor.rpm":
        return state.baseValue + 10 * Math.sin(phase * 0.4) + this.random.nextNoise(2);
      case "motor.coolant":
        return state.baseValue + 10 * Math.sin(phase * 0.3) + this.random.nextNoise(1);
      case "motor.oil":
        return state.baseValue + 50_000 * Math.sin(phase * 0.6) + this.random.nextNoise(1000);
      case "motor.fuel":
        return clamp(state.baseValue - 0.05 * (t / 300), 0, 1);
      case "motor.fuelRate":
        return Math.max(0, 2.5e-6 + 1e-6 * Math.sin(phase) + this.random.nextNoise(1e-7));
      case "env.waterTemp":
        return state.baseValue + 2 * Math.sin(phase * 0.2);
      case "env.airTemp":
        return state.baseValue + 3 * Math.sin(phase * 0.15);
      case "env.baro":
        return state.baseValue + 200 * Math.sin(phase * 0.1);
      case "env.humidity":
        return clamp(state.baseValue + 0.1 * Math.sin(phase * 0.25), 0, 1);
      case "ap.state":
        return ap.state;
      case "ap.mode":
        return ap.mode;
      case "ap.engaged":
        return ap.engaged;
      case "ap.driveEnabled":
      case "ap.clutch":
        return ap.driveEnabled;
      case "ap.fault":
        return ap.fault;
      case "ap.windHazard":
        return ap.windHazard;
      case "ap.noGo":
        return ap.noGo;
      case "ap.targetHeading":
        return ap.targetHeading;
      case "ap.targetWindAngle":
        return ap.targetWindAngle;
      case "ap.targetRudderAngle":
        return ap.targetRudder;
      case "ap.rudderAngle":
        return ap.rudder;
      case "ap.driveCurrent":
        return ap.driveCurrent;
      case "ap.route.activeLeg":
      case "ap.route.length":
        return 0;
      case "ap.route.complete":
        return false;
      case "ap.route.waypoints":
        return [];
      case "ap.route.xte":
      case "ap.route.bearing":
      case "ap.route.distance":
        return 0;
      case "ais.intruder.position":
        return { latitude: 42.25 + Math.sin(phase * 0.05) * 0.01, longitude: -8.71 + Math.cos(phase * 0.05) * 0.01 };
      case "ais.intruder.sog":
        return 3 + 2 * Math.sin(phase * 0.7);
      case "ais.intruder.cog":
        return wrapRadians(phase * 8);
      case "uart.tx":
      case "uart.rx":
        return "";
      default:
        return state.baseValue + this.random.nextNoise(1);
    }
  }

  private applyRamp(simulatedTimeMs: number, state: ChannelState): void {
    if (
      state.rampStartMs === undefined ||
      state.rampEndMs === undefined ||
      state.rampStartValue === undefined ||
      state.rampTargetValue === undefined
    ) {
      return;
    }
    if (simulatedTimeMs >= state.rampEndMs) {
      state.baseValue = state.rampTargetValue;
      delete state.rampStartMs;
      delete state.rampEndMs;
      delete state.rampStartValue;
      delete state.rampTargetValue;
      return;
    }
    const progress = (simulatedTimeMs - state.rampStartMs) / (state.rampEndMs - state.rampStartMs);
    state.baseValue = state.rampStartValue + (state.rampTargetValue - state.rampStartValue) * progress;
  }

  private boatSpeedMs(): number {
    return this.nav.boatSpeedKt * KT_TO_MS;
  }

  private cruiseCourse(timeSeconds: number): number {
    return wrapRadians(degToRad(this.nav.courseDeg) + (this.seed % 31) * 0.003 + 0.18 * Math.sin(timeSeconds / 90));
  }

  private cruisePosition(timeSeconds: number): { latitude: number; longitude: number } {
    const originLatitude = this.nav.origin.latitude;
    const originLongitude = this.nav.origin.longitude;
    const speedMs = this.boatSpeedMs() + 0.4 * Math.sin(timeSeconds / 75);
    const distanceMeters = Math.max(0, speedMs * timeSeconds);
    const course = this.cruiseCourse(timeSeconds);
    const currentMeters = Math.max(0, this.nav.currentDriftKt) * KT_TO_MS * timeSeconds;
    const currentSet = degToRad(this.nav.currentSetDeg);
    const northMeters = Math.cos(course) * distanceMeters + Math.cos(currentSet) * currentMeters;
    const eastMeters = Math.sin(course) * distanceMeters + Math.sin(currentSet) * currentMeters;
    const latitude = originLatitude + northMeters / 111_320;
    const longitude = originLongitude + eastMeters / (111_320 * Math.cos(originLatitude * Math.PI / 180));
    return { latitude, longitude };
  }

  private courseOverGround(timeSeconds: number, disturbance: number): number {
    const course = this.cruiseCourse(timeSeconds) + disturbance;
    const boatMs = this.boatSpeedMs();
    const currentMs = Math.max(0, this.nav.currentDriftKt) * KT_TO_MS;
    const currentSet = degToRad(this.nav.currentSetDeg);
    const north = Math.cos(course) * boatMs + Math.cos(currentSet) * currentMs;
    const east = Math.sin(course) * boatMs + Math.sin(currentSet) * currentMs;
    return wrapRadians(Math.atan2(east, north));
  }

  private windSpeed(phase: number): number {
    const baseMs = this.wind.twsKt * KT_TO_MS;
    const gust = this.random.next() < this.wind.gustProbability
      ? this.random.nextRange(0, this.wind.gustMaxDeltaKt * KT_TO_MS)
      : 0;
    return Math.max(0, baseMs + 2 * Math.sin(phase * 2) + gust + this.random.nextNoise(0.3));
  }

  private faultValue(channel: SimulationChannelDefinition, value: unknown): unknown {
    switch (channel.id) {
      case "nav.position":
        return null;
      case "elec.voltage":
        return 10.5;
      case "motor.coolant":
        return 390;
      case "motor.oil":
        return 50_000;
      case "motor.rpm":
        return 0;
      case "ap.driveCurrent":
        return 20;
      case "ap.driveEnabled":
      case "ap.clutch":
        return false;
      default:
        return value;
    }
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const wrapRadians = (value: number): number => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
const wrapToPi = (value: number): number => {
  const wrapped = wrapRadians(value);
  return wrapped > Math.PI ? wrapped - Math.PI * 2 : wrapped;
};
const degToRad = (value: number): number => value * Math.PI / 180;
