import type { Publisher, SimulationDataPoint } from "../core/types.js";
import { buildDeltaMessages } from "./ws-publisher.js";
import { resolveVesselPath } from "./utils.js";

export class HttpPublisher implements Publisher {
  readonly name = "signalk-http";
  private readonly normalizedBaseUrl: string;

  constructor(baseUrl: string, private readonly token?: string) {
    this.normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  async connect(): Promise<void> {
    const response = await fetch(new URL("signalk/v1/api/", this.normalizedBaseUrl));
    if (!response.ok) throw new Error(`Signal K API not reachable (${response.status})`);
  }

  async disconnect(): Promise<void> {}

  async publish(points: SimulationDataPoint[]): Promise<void> {
    if (points.length === 0) return;
    if (!this.token) {
      await Promise.all(buildDeltaMessages(points).map((message) => this.postDelta(message)));
      return;
    }
    await Promise.all(points.map((point) => this.putValue(point)));
  }

  private async postDelta(message: unknown): Promise<void> {
    const response = await fetch(new URL("signalk/v1/api/", this.normalizedBaseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error(`Failed to publish Signal K delta (${response.status})`);
  }

  private async putValue(point: SimulationDataPoint): Promise<void> {
    const path = point.path.split(".").join("/");
    const url = new URL(`signalk/v1/api/${resolveVesselPath(point.context)}/${path}`, this.normalizedBaseUrl);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ value: point.value, timestamp: point.timestamp, source: point.source }),
    });
    if (!response.ok) throw new Error(`Failed to publish ${point.path} (${response.status})`);
  }
}

