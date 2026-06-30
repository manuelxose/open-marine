import type {
  SimulationChannelDefinition,
  SimulationParameterDefinition,
  SimulationScenarioDocument,
  SimulationTimelineAction,
} from "@omi/marine-data-contract";
import {
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

// Scenario-tunable parameters. Their ids match the keys read by `buildGeneratorOptions` in
// signal-generator.ts, so changing them actually drives the simulated signal (not just the UI form).
const WIND_SPEED_PARAM: SimulationParameterDefinition = { id: "windSpeedKt", label: "True Wind Speed", type: "number", defaultValue: 12, min: 0, max: 50, step: 1, unit: "kt", group: "Wind" };
const WIND_DIR_PARAM: SimulationParameterDefinition = { id: "windDirDeg", label: "True Wind Direction", type: "number", defaultValue: 45, min: 0, max: 360, step: 1, unit: "deg", group: "Wind" };
const GUST_PROB_PARAM: SimulationParameterDefinition = { id: "gustProbability", label: "Gust Probability", type: "number", defaultValue: 0.2, min: 0, max: 1, step: 0.05, unit: "ratio", group: "Wind" };
const GUST_DELTA_PARAM: SimulationParameterDefinition = { id: "gustMaxDeltaKt", label: "Gust Max Delta", type: "number", defaultValue: 6, min: 0, max: 20, step: 0.5, unit: "kt", group: "Wind" };
const BOAT_SPEED_PARAM: SimulationParameterDefinition = { id: "boatSpeedKt", label: "Boat Speed", type: "number", defaultValue: 6.5, min: 0, max: 20, step: 0.5, unit: "kt", group: "Navigation" };
const COURSE_PARAM: SimulationParameterDefinition = { id: "courseDeg", label: "Base Course", type: "number", defaultValue: 66, min: 0, max: 360, step: 1, unit: "deg", group: "Navigation" };
const BATTERY_PARAM: SimulationParameterDefinition = { id: "batteryV", label: "Battery Voltage", type: "number", defaultValue: 12.8, min: 10, max: 16, step: 0.1, unit: "V", group: "Electrical" };
const ENGINE_RPM_PARAM: SimulationParameterDefinition = { id: "engineRpm", label: "Engine RPM", type: "number", defaultValue: 1800, min: 0, max: 3000, step: 50, unit: "rpm", group: "Engine" };
const TARGET_AWA_PARAM: SimulationParameterDefinition = { id: "targetAwaDeg", label: "Target Apparent Wind Angle", type: "number", defaultValue: 42, min: 20, max: 160, step: 1, unit: "deg", group: "Autopilot" };
const TARGET_HEADING_PARAM: SimulationParameterDefinition = { id: "targetHeadingDeg", label: "Target Heading", type: "number", defaultValue: 66, min: 0, max: 360, step: 1, unit: "deg", group: "Autopilot" };
const FAULT_START_PARAM: SimulationParameterDefinition = { id: "faultStartSec", label: "Fault Onset", type: "number", defaultValue: 30, min: 5, max: 300, step: 5, unit: "s", group: "Safety" };

const makePreset = (
  id: string,
  name: string,
  description: string,
  category: SimulationScenarioDocument["category"],
  channels: SimulationChannelDefinition[],
  timeline: SimulationTimelineAction[],
  tags: string[],
  params: SimulationParameterDefinition[],
  durationMs = 180_000,
): SimulationScenarioDocument => ({
  id,
  version: "1.0.0",
  name,
  description,
  category,
  mode: "data",
  defaultDurationMs: durationMs,
  defaultSpeed: 1,
  parameters: [SEED_PARAM, SPEED_PARAM, { ...DURATION_PARAM, defaultValue: durationMs }, ...params],
  channels,
  timeline,
  tags,
  isPreset: true,
  createdAt: now,
  updatedAt: now,
});

const DEPTH_PARAM: SimulationParameterDefinition = { id: "depthM", label: "Base Depth", type: "number", defaultValue: 15, min: 1, max: 200, step: 1, unit: "m", group: "Environment" };

// Channel sets for the three curated autopilot test scenarios.
const sailVessel = [...NAV_CHANNELS, ...WIND_CHANNELS, ...ELECTRICAL_CHANNELS, ...AUTOPILOT_CHANNELS];
const motorVessel = [...NAV_CHANNELS, ...WIND_CHANNELS, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS, ...AUTOPILOT_CHANNELS];

// Channel sets for navigation-only scenarios (no autopilot).
const navSailVessel = [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...ELECTRICAL_CHANNELS];
const navMotorVessel = [...NAV_CHANNELS, ...WIND_CHANNELS, DEPTH_CHANNEL, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS];

export const SCENARIO_PRESETS: SimulationScenarioDocument[] = [
  makePreset(
    "ap-sail",
    "Autopilot — Sail (Wind Mode)",
    "Autopilot steering to a set apparent-wind angle under sail: moving vessel, true + apparent wind, gust detection, rudder and drive response. Tunable wind, gusts, boat speed/course and AWA target.",
    "safety",
    sailVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Engage wind mode" },
      { id: "settle", atSimulatedMs: 30_000, type: "marker", label: "AWA holding on target" },
      { id: "gust", atSimulatedMs: 42_000, type: "marker", label: "Apparent wind gust" },
      { id: "recover", atSimulatedMs: 54_000, type: "marker", label: "Gust cleared" },
    ],
    ["autopilot", "sail", "wind", "gust", "rudder"],
    [WIND_SPEED_PARAM, WIND_DIR_PARAM, GUST_PROB_PARAM, GUST_DELTA_PARAM, BOAT_SPEED_PARAM, COURSE_PARAM, TARGET_AWA_PARAM],
  ),
  makePreset(
    "ap-motor",
    "Autopilot — Motor (Heading Hold)",
    "Autopilot holding a compass heading while motoring: moving vessel, engine RPM/coolant, drive current, rudder response and target-vs-actual heading. Tunable boat speed/course, target heading, battery and engine RPM.",
    "safety",
    motorVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Engage compass mode" },
      { id: "settle", atSimulatedMs: 30_000, type: "marker", label: "Heading settled on target" },
      { id: "disturb", atSimulatedMs: 90_000, type: "marker", label: "Course disturbance" },
    ],
    ["autopilot", "motor", "heading", "engine", "rudder"],
    [BOAT_SPEED_PARAM, COURSE_PARAM, TARGET_HEADING_PARAM, BATTERY_PARAM, ENGINE_RPM_PARAM, WIND_SPEED_PARAM, WIND_DIR_PARAM],
  ),
  makePreset(
    "ap-safety",
    "Autopilot — Safety / Failsafe",
    "Autopilot failsafe case: motoring with heading hold until house voltage drops below cutoff, forcing a FAULT that disables the drive. Tunable fault onset, boat speed/course, target heading and battery.",
    "safety",
    motorVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Heading hold engaged" },
      { id: "fault", atSimulatedMs: 30_000, type: "marker", label: "Low-voltage cutoff → FAULT" },
    ],
    ["autopilot", "safety", "failsafe", "battery", "fault"],
    [FAULT_START_PARAM, BOAT_SPEED_PARAM, COURSE_PARAM, TARGET_HEADING_PARAM, BATTERY_PARAM],
    120_000,
  ),
  makePreset(
    "ap-sail-adverse",
    "Autopilot — Sail · Adverse",
    "Stress test for wind-mode steering: strong shifting wind, frequent heavy gusts, big wave-driven yaw and accidental-tack hazards. Watch the pilot recover AWA with large rudder and drive-current swings.",
    "safety",
    sailVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Engage wind mode (rough)" },
      { id: "gust", atSimulatedMs: 18_000, type: "marker", label: "Heavy gust front" },
      { id: "tack", atSimulatedMs: 36_000, type: "marker", label: "Accidental-tack hazard" },
      { id: "shift", atSimulatedMs: 60_000, type: "marker", label: "Large wind shift" },
    ],
    ["autopilot", "sail", "adverse", "gust", "stress"],
    [
      { ...WIND_SPEED_PARAM, defaultValue: 22 },
      WIND_DIR_PARAM,
      { ...GUST_PROB_PARAM, defaultValue: 0.6 },
      { ...GUST_DELTA_PARAM, defaultValue: 14 },
      { ...BOAT_SPEED_PARAM, defaultValue: 7 },
      COURSE_PARAM,
      TARGET_AWA_PARAM,
    ],
  ),
  makePreset(
    "ap-motor-adverse",
    "Autopilot — Motor · Adverse",
    "Stress test for compass heading-hold while motoring in a beam sea/cross-current: strong yaw disturbances push the bow off heading so the pilot drives large, frequent rudder corrections at high drive current.",
    "safety",
    motorVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Engage compass mode (rough)" },
      { id: "seaway", atSimulatedMs: 20_000, type: "marker", label: "Beam sea building" },
      { id: "set", atSimulatedMs: 60_000, type: "marker", label: "Cross-current set" },
    ],
    ["autopilot", "motor", "adverse", "seaway", "stress"],
    [
      { ...BOAT_SPEED_PARAM, defaultValue: 5.5 },
      COURSE_PARAM,
      TARGET_HEADING_PARAM,
      BATTERY_PARAM,
      ENGINE_RPM_PARAM,
      { ...WIND_SPEED_PARAM, defaultValue: 20 },
      WIND_DIR_PARAM,
    ],
  ),
  makePreset(
    "nav-sail",
    "Navigation — Sailing (Free Helm)",
    "Free-sailing vessel with wind, depth, and electrical data. No autopilot — practice creating waypoints and routes on the chart, then engage autopilot TRACK mode to follow them. Tunable wind, boat speed, course, and depth.",
    "navigation" as SimulationScenarioDocument["category"],
    navSailVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Departure" },
      { id: "wind-shift", atSimulatedMs: 60_000, type: "marker", label: "Wind shift" },
      { id: "shallow", atSimulatedMs: 120_000, type: "marker", label: "Shallow water approach" },
    ],
    ["navigation", "sail", "wind", "depth", "free"],
    [WIND_SPEED_PARAM, WIND_DIR_PARAM, GUST_PROB_PARAM, GUST_DELTA_PARAM, BOAT_SPEED_PARAM, COURSE_PARAM, DEPTH_PARAM],
    300_000,
  ),
  makePreset(
    "nav-motor",
    "Navigation — Motor Cruising (Free Helm)",
    "Motor-cruising vessel with engine, depth, and electrical data. No autopilot — practice creating waypoints and routes on the chart, then engage autopilot TRACK mode to follow them. Tunable speed, course, engine RPM, and depth.",
    "navigation" as SimulationScenarioDocument["category"],
    navMotorVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Departure" },
      { id: "channel", atSimulatedMs: 90_000, type: "marker", label: "Channel transit" },
      { id: "approach", atSimulatedMs: 180_000, type: "marker", label: "Anchoring approach" },
    ],
    ["navigation", "motor", "engine", "depth", "free"],
    [BOAT_SPEED_PARAM, COURSE_PARAM, ENGINE_RPM_PARAM, BATTERY_PARAM, DEPTH_PARAM, WIND_SPEED_PARAM, WIND_DIR_PARAM],
    300_000,
  ),
];

const scenarioMap = new Map(SCENARIO_PRESETS.map((scenario) => [scenario.id, scenario]));

export const listPresetScenarios = (): SimulationScenarioDocument[] => SCENARIO_PRESETS.map((scenario) => structuredClone(scenario));
export const getPresetScenario = (id: string): SimulationScenarioDocument | null => {
  const scenario = scenarioMap.get(id);
  return scenario ? structuredClone(scenario) : null;
};
