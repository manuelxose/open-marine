import type { Publisher, SimulationDataPoint } from "../core/types.js";

export class CompositePublisher implements Publisher {
  readonly name = "composite";

  constructor(private readonly publishers: Publisher[]) {}

  async connect(): Promise<void> {
    await Promise.all(this.publishers.map((publisher) => publisher.connect()));
  }

  async disconnect(): Promise<void> {
    await Promise.all(this.publishers.map((publisher) => publisher.disconnect()));
  }

  async publish(points: SimulationDataPoint[]): Promise<void> {
    await Promise.all(this.publishers.map((publisher) => publisher.publish(points)));
  }
}

