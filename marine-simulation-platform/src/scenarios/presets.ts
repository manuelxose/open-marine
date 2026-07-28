import type {
  SimulationChannelDefinition,
  SimulationParameterDefinition,
  SimulationScenarioExpectation,
  SimulationScenarioDocument,
  SimulationTimelineAction,
} from "@omi/marine-data-contract";
import {
  ELECTRICAL_CHANNELS,
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

// Environment-only tunable parameters. Their ids match the keys read by `buildGeneratorOptions`
// in signal-generator.ts and by `buildResetRequest` in run-manager.ts, so changing them actually
// drives both the simulated signal AND the real autopilot engine's bench (speed/wind/current).
// There are no autopilot-target parameters here — engagement is always manual on the real engine.
const WIND_SPEED_PARAM: SimulationParameterDefinition = { id: "windSpeedKt", label: "True Wind Speed", type: "number", defaultValue: 12, min: 0, max: 50, step: 1, unit: "kt", group: "Wind" };
const WIND_DIR_PARAM: SimulationParameterDefinition = { id: "windDirDeg", label: "True Wind Direction", type: "number", defaultValue: 45, min: 0, max: 360, step: 1, unit: "deg", group: "Wind" };
const GUST_PROB_PARAM: SimulationParameterDefinition = { id: "gustProbability", label: "Gust Probability", type: "number", defaultValue: 0.2, min: 0, max: 1, step: 0.05, unit: "ratio", group: "Wind" };
const GUST_DELTA_PARAM: SimulationParameterDefinition = { id: "gustMaxDeltaKt", label: "Gust Max Delta", type: "number", defaultValue: 6, min: 0, max: 20, step: 0.5, unit: "kt", group: "Wind" };
const BOAT_SPEED_PARAM: SimulationParameterDefinition = { id: "boatSpeedKt", label: "Boat Speed", type: "number", defaultValue: 6.5, min: 0, max: 20, step: 0.5, unit: "kt", group: "Navigation" };
const COURSE_PARAM: SimulationParameterDefinition = { id: "courseDeg", label: "Base Course", type: "number", defaultValue: 66, min: 0, max: 360, step: 1, unit: "deg", group: "Navigation" };
const BATTERY_PARAM: SimulationParameterDefinition = { id: "batteryV", label: "Battery Voltage", type: "number", defaultValue: 12.8, min: 10, max: 16, step: 0.1, unit: "V", group: "Electrical" };
const CURRENT_SET_PARAM: SimulationParameterDefinition = { id: "currentSetDeg", label: "Current Set", type: "number", defaultValue: 90, min: 0, max: 360, step: 1, unit: "deg", group: "Tide / Current" };
const CURRENT_DRIFT_PARAM: SimulationParameterDefinition = { id: "currentDriftKt", label: "Current Drift", type: "number", defaultValue: 0.8, min: 0, max: 5, step: 0.1, unit: "kt", group: "Tide / Current" };

const EXPECTATIONS: Record<string, SimulationScenarioExpectation> = {
  "env-speed": {
    objective: "heading",
    summary: "Boat speed and course, calm ambient wind.",
    expectedMapBehavior: "The vessel starts at the live GPS/AIS position and moves on the selected course at the configured speed.",
    expectedAutopilotBehavior: "Not simulated here — engage the real autopilot manually from the Autopilot page to steer against this environment.",
  },
  "env-wind": {
    objective: "wind",
    summary: "True/apparent wind, tunable gusts.",
    expectedMapBehavior: "The vessel moves while true and apparent wind (and gusts) evolve with boat speed and heading.",
    expectedAutopilotBehavior: "Not simulated here — engage the real autopilot manually (e.g. WIND mode) to see how it reacts to this wind.",
  },
  "env-current": {
    objective: "heading",
    summary: "Lateral current/tide set and drift.",
    expectedMapBehavior: "COG drifts away from heading as the current sets across the track.",
    expectedAutopilotBehavior: "Not simulated here — engage the real autopilot manually and watch it correct (or not) for this current.",
  },
};

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
  // Every environment scenario feeds the real autopilot engine's bench (via /sim/reset) so the
  // operator can manually engage the real autopilot and watch it react — there is no "data-only"
  // mode left, since a scenario that doesn't reach the real engine can't serve that purpose.
  mode: "closed-loop",
  defaultDurationMs: durationMs,
  defaultSpeed: 1,
  parameters: [SEED_PARAM, SPEED_PARAM, { ...DURATION_PARAM, defaultValue: durationMs }, ...params],
  channels,
  timeline,
  tags,
  ...(EXPECTATIONS[id] ? { expectation: EXPECTATIONS[id] } : {}),
  isPreset: true,
  createdAt: now,
  updatedAt: now,
});

// Pure environment: speed/course, wind, battery. Never engine (no real RPM/fuel sensor exists)
// and never autopilot (engagement is always the operator's real, manual action).
const environmentChannels = [...NAV_CHANNELS, ...WIND_CHANNELS, ...ELECTRICAL_CHANNELS];

export const SCENARIO_PRESETS: SimulationScenarioDocument[] = [
  makePreset(
    "env-speed",
    "Velocidad",
    "Boat speed and course over calm ambient wind: adjustable speed, course and battery. No engine or autopilot channels — speed is the only real, GPS/AIS-derived quantity.",
    "navigation",
    environmentChannels,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Underway" },
      { id: "cruise", atSimulatedMs: 30_000, type: "marker", label: "Cruise speed established" },
    ],
    ["speed", "navigation", "environment"],
    [BOAT_SPEED_PARAM, COURSE_PARAM, WIND_SPEED_PARAM, WIND_DIR_PARAM, BATTERY_PARAM],
  ),
  makePreset(
    "env-wind",
    "Viento",
    "True/apparent wind with tunable speed, direction and gusts, over a moving vessel: use for wind-mode manual testing. No engine or autopilot channels.",
    "wind",
    environmentChannels,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Wind established" },
      { id: "gust", atSimulatedMs: 42_000, type: "marker", label: "Gust window" },
    ],
    ["wind", "environment"],
    [WIND_SPEED_PARAM, WIND_DIR_PARAM, GUST_PROB_PARAM, GUST_DELTA_PARAM, BOAT_SPEED_PARAM, COURSE_PARAM, BATTERY_PARAM],
  ),
  makePreset(
    "env-current",
    "Marea / Corriente",
    "Lateral current/tide set and drift over a moving vessel: COG diverges from heading. No engine or autopilot channels.",
    "navigation",
    environmentChannels,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Underway" },
      { id: "set", atSimulatedMs: 20_000, type: "marker", label: "Current set building" },
    ],
    ["current", "tide", "navigation", "environment"],
    [CURRENT_SET_PARAM, CURRENT_DRIFT_PARAM, BOAT_SPEED_PARAM, COURSE_PARAM, WIND_SPEED_PARAM, WIND_DIR_PARAM, BATTERY_PARAM],
  ),
];

const scenarioMap = new Map(SCENARIO_PRESETS.map((scenario) => [scenario.id, scenario]));

export const listPresetScenarios = (): SimulationScenarioDocument[] => SCENARIO_PRESETS.map((scenario) => structuredClone(scenario));
export const getPresetScenario = (id: string): SimulationScenarioDocument | null => {
  const scenario = scenarioMap.get(id);
  return scenario ? structuredClone(scenario) : null;
};
