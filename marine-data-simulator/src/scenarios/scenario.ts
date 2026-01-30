import type { DataPoint, Position } from "@omi/marine-data-contract";

export type ScenarioValue = number | Position | string;
export interface ScenarioPoint extends DataPoint<ScenarioValue> {
  context?: string;
}

export interface Scenario<TState> {
  name: string;
  init: () => TState;
  tick: (state: TState, dtSeconds: number, timestamp: string) => {
    state: TState;
    points: ScenarioPoint[];
  };
}
