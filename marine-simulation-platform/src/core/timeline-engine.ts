import type { SimulationTimelineAction } from "@omi/marine-data-contract";

export interface ChannelState {
  baseValue: number;
  currentValue: unknown;
  faultActive: boolean;
  rampEndMs?: number;
  rampTargetValue?: number;
  rampStartValue?: number;
  rampStartMs?: number;
}

export class TimelineEngine {
  private readonly processedActions = new Set<string>();

  constructor(private readonly timeline: SimulationTimelineAction[]) {}

  tick(simulatedTimeMs: number, states: Map<string, ChannelState>): SimulationTimelineAction[] {
    const processed: SimulationTimelineAction[] = [];
    for (const action of this.timeline) {
      if (this.processedActions.has(action.id) || simulatedTimeMs < action.atSimulatedMs) continue;
      this.processedActions.add(action.id);
      this.applyAction(action, states);
      processed.push(action);
    }
    return processed;
  }

  reset(): void {
    this.processedActions.clear();
  }

  private applyAction(action: SimulationTimelineAction, states: Map<string, ChannelState>): void {
    if (!action.channelId) return;
    const state = states.get(action.channelId);
    if (!state) return;

    if (action.type === "fault-enable") state.faultActive = true;
    if (action.type === "fault-disable") state.faultActive = false;
    if (action.type === "set" && typeof action.value === "number") state.baseValue = action.value;
    if (action.type === "ramp" && typeof action.value === "number") {
      state.rampStartMs = action.atSimulatedMs;
      state.rampEndMs = action.atSimulatedMs + (action.durationMs ?? 5000);
      state.rampStartValue = typeof state.currentValue === "number" ? state.currentValue : state.baseValue;
      state.rampTargetValue = action.value;
    }
  }
}

