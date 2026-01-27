import type { ScenarioPoint } from "../scenarios/scenario.js";

export interface Publisher {
  connect: () => Promise<void>;
  publish: (points: ScenarioPoint[]) => Promise<void>;
}
