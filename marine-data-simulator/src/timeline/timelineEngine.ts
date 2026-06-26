import type {
  SimulationTimelineAction,
  SimulationTimelineActionType,
} from "@omi/marine-data-contract";

export interface TimelineEvent {
  type: SimulationTimelineActionType;
  label: string | undefined;
  channelId: string | undefined;
  value: unknown;
}

export interface TimelineState {
  actions: SimulationTimelineAction[];
  completedActionIds: Set<string>;
  activeRamps: Array<{
    actionId: string;
    channelId: string;
    startValue: number;
    endValue: number;
    startMs: number;
    endMs: number;
  }>;
  activeFaults: Set<string>;
}

export const createTimelineState = (actions: SimulationTimelineAction[]): TimelineState => ({
  actions: [...actions].sort((a, b) => a.atSimulatedMs - b.atSimulatedMs),
  completedActionIds: new Set(),
  activeRamps: [],
  activeFaults: new Set(),
});

export interface TimelineTickResult {
  state: TimelineState;
  injections: Array<{ channelId: string; value: number | boolean | string }>;
  events: TimelineEvent[];
}

export const tickTimeline = (
  state: TimelineState,
  simulatedTimeMs: number,
  _dtMs: number,
): TimelineTickResult => {
  const injections: Array<{ channelId: string; value: number | boolean | string }> = [];
  const events: TimelineEvent[] = [];
  const nextState: TimelineState = {
    actions: state.actions,
    completedActionIds: new Set(state.completedActionIds),
    activeRamps: state.activeRamps.filter((r) => r.endMs > simulatedTimeMs),
    activeFaults: new Set(state.activeFaults),
  };

  for (const action of state.actions) {
    if (state.completedActionIds.has(action.id)) continue;
    if (action.atSimulatedMs > simulatedTimeMs) continue;

    nextState.completedActionIds.add(action.id);

    switch (action.type) {
      case "set":
        if (action.channelId && action.value !== undefined) {
          injections.push({ channelId: action.channelId, value: action.value });
        }
        events.push({ type: action.type, label: action.label, channelId: action.channelId, value: action.value });
        break;
      case "ramp":
        if (action.channelId && typeof action.value === "number" && typeof action.durationMs === "number") {
          nextState.activeRamps.push({
            actionId: action.id,
            channelId: action.channelId,
            startValue: 0,
            endValue: action.value,
            startMs: action.atSimulatedMs,
            endMs: action.atSimulatedMs + action.durationMs,
          });
        }
        events.push({ type: action.type, label: action.label, channelId: action.channelId, value: action.value });
        break;
      case "fault-enable":
        if (action.channelId) {
          nextState.activeFaults.add(action.channelId);
        }
        events.push({ type: action.type, label: action.label, channelId: action.channelId, value: undefined });
        break;
      case "fault-disable":
        if (action.channelId) {
          nextState.activeFaults.delete(action.channelId);
        }
        events.push({ type: action.type, label: action.label, channelId: action.channelId, value: undefined });
        break;
      case "command":
      case "marker":
        events.push({ type: action.type, label: action.label, channelId: action.channelId, value: action.value });
        break;
    }
  }

  for (const ramp of nextState.activeRamps) {
    if (ramp.endMs <= ramp.startMs) continue;
    const progress = Math.min(1, Math.max(0, (simulatedTimeMs - ramp.startMs) / (ramp.endMs - ramp.startMs)));
    const value = ramp.startValue + (ramp.endValue - ramp.startValue) * progress;
    injections.push({ channelId: ramp.channelId, value });
  }

  return { state: nextState, injections, events };
};

export const createRamp = (
  channelId: string,
  _startValue: number,
  endValue: number,
  startMs: number,
  durationMs: number,
  label?: string,
): SimulationTimelineAction => ({
  id: `ramp-${channelId}-${startMs}`,
  atSimulatedMs: startMs,
  type: "ramp",
  channelId,
  value: endValue,
  durationMs,
  label,
});

export const createSet = (
  channelId: string,
  value: number | boolean | string,
  atMs: number,
  label?: string,
): SimulationTimelineAction => ({
  id: `set-${channelId}-${atMs}`,
  atSimulatedMs: atMs,
  type: "set",
  channelId,
  value,
  label,
});

export const createFaultEnable = (
  channelId: string,
  atMs: number,
  label?: string,
): SimulationTimelineAction => ({
  id: `fault-${channelId}-${atMs}`,
  atSimulatedMs: atMs,
  type: "fault-enable",
  channelId,
  label,
});

export const createFaultDisable = (
  channelId: string,
  atMs: number,
  label?: string,
): SimulationTimelineAction => ({
  id: `unfault-${channelId}-${atMs}`,
  atSimulatedMs: atMs,
  type: "fault-disable",
  channelId,
  label,
});

export const createMarker = (
  atMs: number,
  label: string,
): SimulationTimelineAction => ({
  id: `marker-${atMs}-${label}`,
  atSimulatedMs: atMs,
  type: "marker",
  label,
});
