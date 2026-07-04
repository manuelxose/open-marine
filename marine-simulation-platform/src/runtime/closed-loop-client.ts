import { type SimulationBenchResetRequest, type SimulationScenarioDocument } from "@omi/marine-data-contract";

export class ClosedLoopClient {
  constructor(private readonly baseUrl: string) {}

  async reset(request: SimulationBenchResetRequest): Promise<void> {
    await this.post("/sim/reset", request);
  }

  async configureAndEngage(
    scenario: SimulationScenarioDocument,
    parameters: Record<string, number | boolean | string>,
  ): Promise<void> {
    const objective = scenario.expectation?.objective;
    if (objective === "wind") {
      await this.setMode("wind");
      await this.setTargetDeg(asNumber(parameters["targetAwaDeg"], 42));
      await this.engage();
      return;
    }
    if (objective === "waypoint" || objective === "route") {
      await this.setMode("gps");
      await this.engage();
      return;
    }
    await this.setMode("compass");
    await this.setTargetDeg(asNumber(parameters["targetHeadingDeg"], asNumber(parameters["courseDeg"], 66)));
    await this.engage();
  }

  async disengage(): Promise<void> {
    await this.post("/vessels/self/autopilots/_default/disengage", {});
  }

  private async setMode(mode: "compass" | "wind" | "gps"): Promise<void> {
    await this.post("/vessels/self/autopilots/_default/mode", { value: mode });
  }

  private async setTargetDeg(degrees: number): Promise<void> {
    await this.post("/vessels/self/autopilots/_default/target", { value: degrees * Math.PI / 180 });
  }

  private async engage(): Promise<void> {
    await this.post("/vessels/self/autopilots/_default/engage", {});
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

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
