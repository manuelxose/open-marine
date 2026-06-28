import type { Publisher, SimulationDataPoint } from "../core/types.js";

export class NoopPublisher implements Publisher {
  readonly name = "noop";
  readonly published: SimulationDataPoint[] = [];

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async publish(points: SimulationDataPoint[]): Promise<void> {
    this.published.push(...points);
  }
}

