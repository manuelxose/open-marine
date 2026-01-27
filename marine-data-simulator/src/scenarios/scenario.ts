import type { DataPoint, Position } from "@omi/marine-data-contract";

export type ScenarioValue = number | Position;
export type ScenarioPoint = DataPoint<ScenarioValue>;

export interface Scenario<TState> {
  name: string;
  init: () => TState;
  tick: (state: TState, dtSeconds: number, timestamp: string) => {
    state: TState;
    points: ScenarioPoint[];
  };
}
