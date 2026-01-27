import { normalizeTimestamp } from "@omi/marine-data-contract";
import type { Scenario } from "../scenarios/scenario.js";
import type { Publisher } from "../publishers/publisher.js";

export class SimulatorEngine<TState> {
  private state: TState;
  private lastTick = Date.now();
  private isPublishing = false;

  constructor(
    private readonly scenario: Scenario<TState>,
    private readonly publisher: Publisher,
    private readonly rateHz: number,
  ) {
    this.state = scenario.init();
  }

  async start(): Promise<void> {
    try {
      await this.publisher.connect();
      console.log("[connect] Signal K connection OK");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[connect] Signal K connection ERROR: ${message}`);
      throw error;
    }
    const intervalMs = Math.max(100, Math.floor(1000 / this.rateHz));

    setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  private async tick(): Promise<void> {
    if (this.isPublishing) {
      return;
    }

    this.isPublishing = true;
    const now = Date.now();
    const dtSeconds = (now - this.lastTick) / 1000;
    this.lastTick = now;

    const { timestamp } = normalizeTimestamp(now);
    try {
      const { state, points } = this.scenario.tick(this.state, dtSeconds, timestamp);
      this.state = state;

      await this.publisher.publish(points);
      console.log(`[publish] ${points.length} points @ ${timestamp}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[publish] ERROR: ${message}`);
    } finally {
      this.isPublishing = false;
    }
  }
}
