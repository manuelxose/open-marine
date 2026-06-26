import { normalizeTimestamp } from "@omi/marine-data-contract";
import type { Scenario } from "../scenarios/scenario.js";
import type { Publisher } from "../publishers/publisher.js";
import { ControlledClock } from "./controlledClock.js";

export class SimulatorEngine<TState> {
  private state: TState;
  private isPublishing = false;
  private clock: ControlledClock;

  constructor(
    private readonly scenario: Scenario<TState>,
    private readonly publisher: Publisher,
    private readonly rateHz: number,
    private readonly speed = 1,
  ) {
    this.state = scenario.init();
    this.clock = new ControlledClock(rateHz, speed);
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
    this.clock.start();
    const intervalMs = Math.max(100, Math.floor(1000 / this.rateHz));
    setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  private async tick(): Promise<void> {
    if (this.isPublishing) return;
    this.isPublishing = true;
    const simTimeMs = this.clock.tick();
    const dtSeconds = 1 / this.rateHz;
    const { timestamp } = normalizeTimestamp(Date.now());
    try {
      const { state, points } = this.scenario.tick(this.state, dtSeconds, timestamp);
      this.state = state;
      await this.publisher.publish(points);
      console.log(`[publish] ${points.length} points @ sim=${(simTimeMs / 1000).toFixed(1)}s`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[publish] ERROR: ${message}`);
    } finally {
      this.isPublishing = false;
    }
  }

  getSimulatedTimeMs(): number {
    return this.clock.getSimulatedTimeMs();
  }

  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
  }

  stop(): void {
    this.clock.stop();
  }
}
