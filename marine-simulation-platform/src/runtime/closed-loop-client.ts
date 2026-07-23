import { type SimulationBenchResetRequest } from "@omi/marine-data-contract";

export class ClosedLoopClient {
  constructor(private readonly baseUrl: string) {}

  async reset(request: SimulationBenchResetRequest): Promise<void> {
    await this.post("/sim/reset", request);
  }

  async disengage(): Promise<void> {
    await this.post("/vessels/self/autopilots/_default/disengage", {});
  }

  private async post(path: string, body: unknown): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const payload = await response.json() as { error?: unknown };
        if (typeof payload.error === "string") message = payload.error;
      } catch {
        // Keep the HTTP status message.
      }
      throw new Error(`closed-loop autopilot request failed: ${message}`);
    }
  }
}
