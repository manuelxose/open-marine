import type {
  SimulationChannelDefinition,
  SimulationChannelQuality,
  SimulationSample,
  SimulationScenarioDocument,
} from "@omi/marine-data-contract";
import { createSeededRandom, type SeededRandom } from "./seeded-random.js";
import { TimelineEngine, type ChannelState } from "./timeline-engine.js";

interface SignalGeneratorOptions {
  wind?: {
    twsKt?: number;
    twdDeg?: number;
    gustProbability?: number;
    gustMaxDeltaKt?: number;
  };
}

export interface SignalSnapshot {
  value: unknown;
  unit: string;
  quality: SimulationChannelQuality;
}

export class SignalGenerator {
  private readonly random: SeededRandom;
  private readonly timeline: TimelineEngine;
  private readonly channelStates = new Map<string, ChannelState>();
  private readonly wind;

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

  private initialValue(channel: SimulationChannelDefinition): number {
    if (!channel.range) return 0;
    return channel.range.min + (channel.range.max - channel.range.min) * 0.3;
  }

  private computeValue(channel: SimulationChannelDefinition, simulatedTimeMs: number, state: ChannelState): unknown {
    const t = simulatedTimeMs / 1000;
    const phase = t * 0.05 + (this.seed % 1000) * 0.001;
    this.applyRamp(simulatedTimeMs, state);

    switch (channel.id) {
      case "nav.position":
        return { latitude: 42.2406 + Math.sin(phase * 0.1) * 0.02, longitude: -8.7207 + Math.cos(phase * 0.1) * 0.02 };
      case "nav.sog":
        return state.baseValue + 1.5 * Math.sin(phase) + this.random.nextNoise(0.2);
      case "nav.cog":
        return wrapRadians(phase * 10);
      case "nav.heading":
        return wrapRadians(phase * 10 + 0.1);
      case "wind.tws":
      case "wind.aws":
        return this.windSpeed(phase);
      case "wind.twd":
        return wrapRadians(this.wind.twdDeg * Math.PI / 180 + phase * 0.5);
      case "wind.awa":
        return clamp(Math.sin(phase * 1.5) * 1.2 + this.random.nextNoise(0.2), -Math.PI, Math.PI);
      case "depth.belowTransducer":
        return state.baseValue + 4 * Math.sin(phase * 0.3) + this.random.nextNoise(0.3);
      case "elec.voltage":
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
        return "standby";
      case "ap.mode":
        return "compass";
      case "ap.engaged":
      case "ap.driveEnabled":
      case "ap.clutch":
        return false;
      case "ap.fault":
        return state.faultActive ? "overcurrent" : "none";
      case "ap.targetHeading":
        return wrapRadians(phase * 5);
      case "ap.targetWindAngle":
        return Math.sin(phase) * 0.5;
      case "ap.rudderAngle":
        return clamp(Math.sin(phase * 3) * 0.3 + this.random.nextNoise(0.02), -0.61, 0.61);
      case "ap.driveCurrent":
        return state.faultActive ? 18 : Math.max(0, 2 + 3 * Math.abs(Math.sin(phase * 3)) + this.random.nextNoise(0.2));
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

  private windSpeed(phase: number): number {
    const baseMs = this.wind.twsKt * 0.514444;
    const gust = this.random.next() < this.wind.gustProbability
      ? this.random.nextRange(0, this.wind.gustMaxDeltaKt * 0.514444)
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
