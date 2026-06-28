import type {
  SimulationParameterDefinition,
  SimulationScenarioDocument,
  SimulationTimelineAction,
} from "@omi/marine-data-contract";
import { AUTOPILOT_CHANNELS, DEPTH_CHANNEL, ELECTRICAL_CHANNELS, ENGINE_CHANNELS, NAV_CHANNELS, WIND_CHANNELS } from "../core/channel-registry.js";
import { createSeededRandom } from "../core/seeded-random.js";

export interface WindScenarioOptions {
  name?: string;
  description?: string;
  baseWindSpeedKt: number;
  baseWindDirDeg: number;
  gustProbability: number;
  gustMaxDeltaKt: number;
  durationMs: number;
  seed: number;
  mode?: "data" | "closed-loop";
}

export function generateWindScenario(options: WindScenarioOptions): SimulationScenarioDocument {
  const random = createSeededRandom(options.seed, "lcg");
  const now = new Date().toISOString();
  const mode = options.mode ?? "data";
  const timeline: SimulationTimelineAction[] = [{
    id: "start",
    atSimulatedMs: 0,
    type: "marker",
    label: `Base wind: ${options.baseWindSpeedKt} kt @ ${options.baseWindDirDeg} deg`,
  }];

  let nextGustMs = 5_000;
  for (let t = 15_000; t < options.durationMs; t += 15_000) {
    const directionShift = (random.next() - 0.5) * 30;
    const newDir = wrapDegrees(options.baseWindDirDeg + directionShift);
    timeline.push({
      id: `wind-dir-${t}`,
      atSimulatedMs: t,
      type: "ramp",
      channelId: "wind.twd",
      value: newDir * Math.PI / 180,
      durationMs: 10_000,
      label: `Wind direction ${newDir.toFixed(0)} deg`,
    });
    timeline.push({
      id: `wind-tws-${t}`,
      atSimulatedMs: t,
      type: "ramp",
      channelId: "wind.tws",
      value: Math.max(0, options.baseWindSpeedKt + (random.next() - 0.5) * 4) * 0.514444,
      durationMs: 10_000,
      label: "True wind speed adjustment",
    });

    while (nextGustMs < t + 15_000 && nextGustMs < options.durationMs) {
      if (random.next() < options.gustProbability) {
        const gustDelta = random.nextRange(0, options.gustMaxDeltaKt);
        const gustDurationMs = Math.floor(random.nextRange(3_000, 8_000));
        timeline.push({
          id: `gust-${nextGustMs}`,
          atSimulatedMs: nextGustMs,
          type: "ramp",
          channelId: "wind.aws",
          value: Math.max(0, options.baseWindSpeedKt + gustDelta) * 0.514444,
          durationMs: gustDurationMs,
          label: `Gust +${gustDelta.toFixed(1)} kt`,
        });
        timeline.push({
          id: `gust-end-${nextGustMs}`,
          atSimulatedMs: nextGustMs + gustDurationMs,
          type: "ramp",
          channelId: "wind.aws",
          value: options.baseWindSpeedKt * 0.514444,
          durationMs: 2_000,
          label: "Gust end",
        });
      }
      nextGustMs += 5_000;
    }
  }

  timeline.push({
    id: "end",
    atSimulatedMs: options.durationMs,
    type: "marker",
    label: "Wind scenario complete",
  });

  return {
    id: `wind-${Date.now()}-${Math.floor(random.next() * 10000)}`,
    version: "1.0.0",
    name: options.name ?? `Random Wind ${options.baseWindSpeedKt}kt/${options.baseWindDirDeg}deg`,
    description: options.description ?? `Generated wind scenario with base ${options.baseWindSpeedKt} kt @ ${options.baseWindDirDeg} deg, gusts up to +${options.gustMaxDeltaKt} kt and seed ${options.seed}.`,
    category: "wind",
    mode,
    defaultDurationMs: options.durationMs,
    defaultSpeed: 1,
    parameters: parameters(options),
    channels: [
      ...NAV_CHANNELS,
      ...WIND_CHANNELS,
      DEPTH_CHANNEL,
      ...ELECTRICAL_CHANNELS,
      ...ENGINE_CHANNELS,
      ...AUTOPILOT_CHANNELS,
    ],
    timeline,
    tags: ["wind", "generated", "random"],
    isPreset: false,
    createdAt: now,
    updatedAt: now,
  };
}

const parameters = (options: WindScenarioOptions): SimulationParameterDefinition[] => [
  { id: "seed", label: "Random Seed", type: "number", defaultValue: options.seed, min: 1, max: 9999, step: 1, group: "General" },
  { id: "speed", label: "Simulation Speed", type: "number", defaultValue: 1, min: 0.25, max: 4, step: 0.25, unit: "x", group: "General" },
  { id: "durationMs", label: "Duration", type: "number", defaultValue: options.durationMs, min: 30_000, max: 3_600_000, step: 60_000, unit: "ms", group: "General" },
  { id: "baseWindSpeedKt", label: "Base Wind Speed", type: "number", defaultValue: options.baseWindSpeedKt, min: 0, max: 50, step: 1, unit: "kt", group: "Wind" },
  { id: "baseWindDirDeg", label: "Base Wind Direction", type: "number", defaultValue: options.baseWindDirDeg, min: 0, max: 360, step: 1, unit: "deg", group: "Wind" },
  { id: "gustProbability", label: "Gust Probability", type: "number", defaultValue: options.gustProbability, min: 0, max: 1, step: 0.05, unit: "ratio", group: "Wind" },
  { id: "gustMaxDeltaKt", label: "Gust Max Delta", type: "number", defaultValue: options.gustMaxDeltaKt, min: 0, max: 20, step: 0.5, unit: "kt", group: "Wind" },
];

const wrapDegrees = (degrees: number): number => {
  const value = degrees % 360;
  return value < 0 ? value + 360 : value;
};

