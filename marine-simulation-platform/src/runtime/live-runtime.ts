import { normalizeTimestamp } from "@omi/marine-data-contract";
import { ControlledClock } from "../core/controlled-clock.js";
import { SignalGenerator, buildGeneratorOptions } from "../core/signal-generator.js";
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
    const generator = new SignalGenerator(this.config.seed, scenario, buildGeneratorOptions(this.config.parameters));

    await this.publisher.connect();
    this.clock.start();
    const intervalMs = Math.max(20, Math.floor(1000 / this.config.rateHz));
    const publishTick = async (): Promise<void> => {
      const simulatedTimeMs = this.clock.tick();
      const { timestamp } = normalizeTimestamp(Date.now());
      const { samples } = generator.generate(simulatedTimeMs);
      await this.publisher.publish(samplesToDataPoints(samples, scenario.channels, timestamp));
      if (this.config.durationMs !== undefined && simulatedTimeMs >= this.config.durationMs) await this.stop();
    };
    await publishTick();
    this.timer = setInterval(() => void publishTick(), intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clock.stop();
    await this.publisher.disconnect();
  }
}
