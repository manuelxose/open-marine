import { normalizeTimestamp } from "@omi/marine-data-contract";
import { ControlledClock } from "../core/controlled-clock.js";
import { SignalGenerator } from "../core/signal-generator.js";
import type { ExecutionConfig, Publisher } from "../core/types.js";
import { samplesToDataPoints } from "../publishers/utils.js";
import { getPresetScenario } from "../scenarios/presets.js";

export class LiveRuntime {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly clock: ControlledClock;

  constructor(
    private readonly config: ExecutionConfig,
    private readonly publisher: Publisher,
  ) {
    this.clock = new ControlledClock(config.speed);
  }

  async start(): Promise<void> {
    const scenario = getPresetScenario(this.config.scenarioId);
    if (!scenario) throw new Error(`Unsupported scenario: ${this.config.scenarioId}`);
    const generator = new SignalGenerator(this.config.seed, scenario, {
      wind: {
        twsKt: numberParam(this.config.parameters["windSpeedKt"], 12),
        twdDeg: numberParam(this.config.parameters["windDirDeg"], 45),
      },
    });

    await this.publisher.connect();
    this.clock.start();
    const intervalMs = Math.max(20, Math.floor(1000 / this.config.rateHz));
    this.timer = setInterval(async () => {
      const simulatedTimeMs = this.clock.tick();
      const { timestamp } = normalizeTimestamp(Date.now());
      const { samples } = generator.generate(simulatedTimeMs);
      await this.publisher.publish(samplesToDataPoints(samples, scenario.channels, timestamp));
      if (this.config.durationMs !== undefined && simulatedTimeMs >= this.config.durationMs) await this.stop();
    }, intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clock.stop();
    await this.publisher.disconnect();
  }
}

const numberParam = (value: unknown, fallback: number): number => typeof value === "number" ? value : fallback;

