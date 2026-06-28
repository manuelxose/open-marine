import type {
  SimulationChannelDefinition,
  SimulationParameterDefinition,
  SimulationScenarioDocument,
  SimulationTimelineAction,
} from "@omi/marine-data-contract";
import {
  AIS_INTRUDER_CHANNELS,
  AUTOPILOT_CHANNELS,
  DEPTH_CHANNEL,
  ELECTRICAL_CHANNELS,
  ENGINE_CHANNELS,
  ENV_CHANNELS,
  NAV_CHANNELS,
  WIND_CHANNELS,
} from "../core/channel-registry.js";

const now = new Date().toISOString();

const SEED_PARAM: SimulationParameterDefinition = {
  id: "seed",
  label: "Random Seed",
  type: "number",
  defaultValue: 42,
  min: 1,
  max: 9999,
  step: 1,
  group: "General",
};

const SPEED_PARAM: SimulationParameterDefinition = {
  id: "speed",
  label: "Simulation Speed",
  type: "number",
  defaultValue: 1,
  min: 0.25,
  max: 4,
  step: 0.25,
  unit: "x",
  group: "General",
};

const DURATION_PARAM: SimulationParameterDefinition = {
  id: "durationMs",
  label: "Duration",
  type: "number",
  defaultValue: 300_000,
  min: 30_000,
  max: 3_600_000,
  step: 60_000,
  unit: "ms",
  group: "General",
};

const makePreset = (
  id: string,
  name: string,
  description: string,
  category: SimulationScenarioDocument["category"],
  channels: SimulationChannelDefinition[],
  timeline: SimulationTimelineAction[],
  tags: string[],
  durationMs = 300_000,
): SimulationScenarioDocument => ({
  id,
  version: "1.0.0",
  name,
  description,
  category,
  mode: "data",
  defaultDurationMs: durationMs,
  defaultSpeed: 1,
  parameters: [SEED_PARAM, SPEED_PARAM, { ...DURATION_PARAM, defaultValue: durationMs }],
  channels,
  timeline,
  tags,
  isPreset: true,
  createdAt: now,
  updatedAt: now,
});

const common = [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...AUTOPILOT_CHANNELS];
const fullVessel = [...common, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS, ...ENV_CHANNELS, ...AIS_INTRUDER_CHANNELS];

export const SCENARIO_PRESETS: SimulationScenarioDocument[] = [
  makePreset(
    "basic-cruise",
    "Basic Cruise",
    "Baseline navigation with wind, depth, engine, electrical and AIS traffic signals.",
    "navigation",
    fullVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Cruise started" },
      { id: "shallow-water", atSimulatedMs: 120_000, type: "ramp", channelId: "depth.belowTransducer", value: 3, durationMs: 20_000, label: "Shallow water" },
      { id: "wind-gust", atSimulatedMs: 180_000, type: "ramp", channelId: "wind.aws", value: 18, durationMs: 15_000, label: "Wind gust" },
    ],
    ["cruise", "navigation", "wind", "battery", "ais"],
  ),
  makePreset(
    "harbor-traffic",
    "Harbor Traffic",
    "Slow harbor maneuvering with dense AIS and restricted depth.",
    "navigation",
    [...common, ...AIS_INTRUDER_CHANNELS],
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Harbor entry" },
      { id: "traffic", atSimulatedMs: 45_000, type: "marker", label: "Traffic crossing" },
      { id: "low-speed", atSimulatedMs: 60_000, type: "ramp", channelId: "nav.sog", value: 1.2, durationMs: 10_000 },
    ],
    ["harbor", "traffic", "ais", "maneuvering"],
    180_000,
  ),
  makePreset(
    "coastal-run",
    "Coastal Run",
    "Coastal passage with changing depth, wind and engine load.",
    "navigation",
    [...common, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS],
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Coastal departure" },
      { id: "headland", atSimulatedMs: 90_000, type: "marker", label: "Wind shift at headland" },
      { id: "engine-load", atSimulatedMs: 150_000, type: "ramp", channelId: "motor.rpm", value: 42, durationMs: 30_000 },
    ],
    ["coastal", "depth", "tide", "wind"],
  ),
  makePreset(
    "anchored-stale",
    "Anchored Stale",
    "Anchored state with mostly static sensor values for stale-data alarm workflows.",
    "navigation",
    [...common, ...ELECTRICAL_CHANNELS],
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Anchor set" },
      { id: "stale", atSimulatedMs: 300_000, type: "fault-enable", channelId: "nav.position", label: "GPS stale" },
    ],
    ["anchor", "stale", "alarm", "monitoring"],
    600_000,
  ),
  makePreset(
    "busy-shipping-lane",
    "Busy Shipping Lane",
    "Traffic separation lane with AIS intruder and low CPA events.",
    "ais",
    [...NAV_CHANNELS, ...WIND_CHANNELS, ...AIS_INTRUDER_CHANNELS, ...AUTOPILOT_CHANNELS],
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Entered TSS" },
      { id: "cpa", atSimulatedMs: 60_000, type: "marker", label: "Low CPA" },
      { id: "avoid", atSimulatedMs: 120_000, type: "ramp", channelId: "nav.cog", value: 1.8, durationMs: 20_000 },
    ],
    ["ais", "cpa", "tss", "collision"],
    240_000,
  ),
  makePreset(
    "combined-failures",
    "Combined Failures",
    "Stacked GPS, low-voltage and engine faults for alarm and safety workflows.",
    "safety",
    [...common, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS],
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Nominal state" },
      { id: "gps-loss", atSimulatedMs: 20_000, type: "fault-enable", channelId: "nav.position", label: "GPS lost" },
      { id: "low-voltage", atSimulatedMs: 40_000, type: "fault-enable", channelId: "elec.voltage", label: "Low battery" },
      { id: "overheat", atSimulatedMs: 60_000, type: "fault-enable", channelId: "motor.coolant", label: "Engine overheat" },
      { id: "oil", atSimulatedMs: 80_000, type: "fault-enable", channelId: "motor.oil", label: "Oil pressure lost" },
    ],
    ["failure", "safety", "alarm", "gps", "engine", "battery"],
    120_000,
  ),
  makePreset(
    "anchor-drift",
    "Anchor Drift",
    "Position drift while anchored, with wind shifts and anchor alarm markers.",
    "navigation",
    common,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Anchor set" },
      { id: "drift", atSimulatedMs: 120_000, type: "marker", label: "Anchor drift begins" },
      { id: "alarm", atSimulatedMs: 180_000, type: "marker", label: "Anchor alarm" },
    ],
    ["anchor", "drift", "alarm", "position"],
  ),
  makePreset(
    "wind-gps-demo",
    "Wind GPS Demo",
    "Predictable wind and GPS pattern for instrument display validation.",
    "sensors",
    common,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Calibration started" },
      { id: "wind", atSimulatedMs: 30_000, type: "marker", label: "Wind rose" },
      { id: "heading", atSimulatedMs: 60_000, type: "marker", label: "Heading pattern" },
    ],
    ["demo", "calibration", "wind", "gps", "instruments"],
    120_000,
  ),
];

const scenarioMap = new Map(SCENARIO_PRESETS.map((scenario) => [scenario.id, scenario]));

export const listPresetScenarios = (): SimulationScenarioDocument[] => SCENARIO_PRESETS.map((scenario) => structuredClone(scenario));
export const getPresetScenario = (id: string): SimulationScenarioDocument | null => {
  const scenario = scenarioMap.get(id);
  return scenario ? structuredClone(scenario) : null;
};

