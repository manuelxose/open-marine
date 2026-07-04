import type {
  SimulationChannelDefinition,
  SimulationParameterDefinition,
  SimulationScenarioExpectation,
  SimulationScenarioDocument,
  SimulationTimelineAction,
} from "@omi/marine-data-contract";
import {
  AUTOPILOT_CHANNELS,
  ELECTRICAL_CHANNELS,
  ENGINE_CHANNELS,
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
const CURRENT_SET_PARAM: SimulationParameterDefinition = { id: "currentSetDeg", label: "Current Set", type: "number", defaultValue: 90, min: 0, max: 360, step: 1, unit: "deg", group: "Tide / Current" };
const CURRENT_DRIFT_PARAM: SimulationParameterDefinition = { id: "currentDriftKt", label: "Current Drift", type: "number", defaultValue: 0.8, min: 0, max: 5, step: 0.1, unit: "kt", group: "Tide / Current" };
const WAYPOINT_BEARING_PARAM: SimulationParameterDefinition = { id: "waypointBearingDeg", label: "Waypoint Bearing", type: "number", defaultValue: 0, min: 0, max: 360, step: 1, unit: "deg", group: "Track" };
const WAYPOINT_DISTANCE_PARAM: SimulationParameterDefinition = { id: "waypointDistanceNm", label: "Waypoint Distance", type: "number", defaultValue: 0.12, min: 0.03, max: 2, step: 0.01, unit: "NM", group: "Track" };

const EXPECTATIONS: Record<string, SimulationScenarioExpectation> = {
  "ap-motor-heading-calm": {
    objective: "heading",
    summary: "Motor heading hold in calm water.",
    expectedMapBehavior: "The vessel starts at the live GPS/AIS position and tracks a steady line on the selected heading.",
    expectedAutopilotBehavior: "Autopilot engages compass mode, holds the target heading and keeps rudder/current low.",
  },
  "ap-motor-cross-current": {
    objective: "heading",
    summary: "Motor heading hold with lateral current.",
    expectedMapBehavior: "The bow holds heading while COG drifts with the current, showing a visible set across the track.",
    expectedAutopilotBehavior: "Autopilot stays in compass mode and corrects yaw disturbances without entering fault.",
  },
  "ap-sail-wind-gusts": {
    objective: "wind",
    summary: "Sailing wind mode with gusts.",
    expectedMapBehavior: "The vessel keeps moving under sail while apparent wind and heading oscillate through gusts.",
    expectedAutopilotBehavior: "Autopilot engages wind mode, keeps the target apparent wind angle and raises gust hazards.",
  },
  "ap-sail-wind-shift": {
    objective: "wind",
    summary: "Sailing wind mode through a major wind shift.",
    expectedMapBehavior: "The vessel changes heading as wind direction shifts, then settles on a new stable line.",
    expectedAutopilotBehavior: "Autopilot remains in wind mode and recovers the target apparent wind angle.",
  },
  "ap-track-waypoint": {
    objective: "waypoint",
    summary: "Track mode to a single waypoint.",
    expectedMapBehavior: "The vessel starts at the live position and reduces distance to the generated waypoint.",
    expectedAutopilotBehavior: "Autopilot engages GPS/TRACK, follows bearing-to-waypoint and reduces XTE.",
  },
  "ap-track-route": {
    objective: "route",
    summary: "Track mode through a multi-leg route.",
    expectedMapBehavior: "The vessel follows the generated route overlay and advances between legs.",
    expectedAutopilotBehavior: "Autopilot engages GPS/TRACK, publishes active leg progress and completes the route.",
  },
  "ap-safety-low-voltage": {
    objective: "safety",
    summary: "Low-voltage failsafe.",
    expectedMapBehavior: "The vessel starts from live position, then the scenario confirms a safe stop on fault.",
    expectedAutopilotBehavior: "Autopilot enters FAULT and drive output is disabled when voltage falls below cutoff.",
  },
};

const CLOSED_LOOP_PRESETS = new Set(Object.keys(EXPECTATIONS));

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
  mode: CLOSED_LOOP_PRESETS.has(id) ? "closed-loop" : "data",
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

// Channel sets for the three curated autopilot test scenarios.
const sailVessel = [...NAV_CHANNELS, ...WIND_CHANNELS, ...ELECTRICAL_CHANNELS, ...AUTOPILOT_CHANNELS];
const motorVessel = [...NAV_CHANNELS, ...WIND_CHANNELS, ...ELECTRICAL_CHANNELS, ...ENGINE_CHANNELS, ...AUTOPILOT_CHANNELS];

export const SCENARIO_PRESETS: SimulationScenarioDocument[] = [
  makePreset(
    "ap-sail-wind-gusts",
    "Autopilot - Sail Wind Gusts",
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
    "ap-motor-heading-calm",
    "Autopilot - Motor Heading Calm",
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
    "ap-safety-low-voltage",
    "Autopilot - Safety Low Voltage",
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
    "ap-sail-wind-shift",
    "Autopilot - Sail Wind Shift",
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
    "ap-motor-cross-current",
    "Autopilot - Motor Cross Current",
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
      CURRENT_SET_PARAM,
      CURRENT_DRIFT_PARAM,
      BATTERY_PARAM,
      ENGINE_RPM_PARAM,
      { ...WIND_SPEED_PARAM, defaultValue: 20 },
      WIND_DIR_PARAM,
    ],
  ),
  makePreset(
    "ap-track-waypoint",
    "Autopilot - Track Waypoint",
    "Closed-loop TRACK mode to a generated waypoint from the live start position. Tunable speed, waypoint bearing/distance, wind and current.",
    "navigation" as SimulationScenarioDocument["category"],
    motorVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Generate waypoint from live position" },
      { id: "track", atSimulatedMs: 10_000, type: "marker", label: "TRACK engaged" },
      { id: "approach", atSimulatedMs: 90_000, type: "marker", label: "Distance and XTE reducing" },
    ],
    ["autopilot", "track", "waypoint", "gps", "closed-loop"],
    [BOAT_SPEED_PARAM, WAYPOINT_BEARING_PARAM, WAYPOINT_DISTANCE_PARAM, CURRENT_SET_PARAM, { ...CURRENT_DRIFT_PARAM, defaultValue: 0.2 }, WIND_SPEED_PARAM, WIND_DIR_PARAM],
    180_000,
  ),
  makePreset(
    "ap-track-route",
    "Autopilot - Track Route",
    "Closed-loop TRACK mode through a generated three-leg route from the live start position. Watch route overlay, active leg, XTE and completion.",
    "navigation" as SimulationScenarioDocument["category"],
    motorVessel,
    [
      { id: "start", atSimulatedMs: 0, type: "marker", label: "Generate three-leg route" },
      { id: "leg1", atSimulatedMs: 20_000, type: "marker", label: "Leg 1 tracking" },
      { id: "leg2", atSimulatedMs: 90_000, type: "marker", label: "Leg advance expected" },
      { id: "complete", atSimulatedMs: 180_000, type: "marker", label: "Route completion expected" },
    ],
    ["autopilot", "track", "route", "gps", "closed-loop"],
    [BOAT_SPEED_PARAM, CURRENT_SET_PARAM, { ...CURRENT_DRIFT_PARAM, defaultValue: 0.1 }, WIND_SPEED_PARAM, WIND_DIR_PARAM],
    240_000,
  ),
];

const scenarioMap = new Map(SCENARIO_PRESETS.map((scenario) => [scenario.id, scenario]));

export const listPresetScenarios = (): SimulationScenarioDocument[] => SCENARIO_PRESETS.map((scenario) => structuredClone(scenario));
export const getPresetScenario = (id: string): SimulationScenarioDocument | null => {
  const scenario = scenarioMap.get(id);
  return scenario ? structuredClone(scenario) : null;
};
