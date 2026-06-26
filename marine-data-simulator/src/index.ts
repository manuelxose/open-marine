import { SimulatorEngine } from "./engine/simulatorEngine.js";
import { createAnchoredStaleScenario } from "./scenarios/anchoredStale.js";
import { createBasicCruiseScenario } from "./scenarios/basicCruise.js";
import { createCoastalRunScenario } from "./scenarios/coastalRun.js";
import { createHarborTrafficScenario } from "./scenarios/harborTraffic.js";
import { createBusyShippingLaneScenario } from "./scenarios/busyShippingLane.js";
import { createCombinedFailuresScenario } from "./scenarios/combinedFailures.js";
import { createAnchorDriftScenario } from "./scenarios/anchorDrift.js";
import { createWindGpsDemoScenario } from "./scenarios/windGpsDemo.js";
import { WsPublisher } from "./publishers/wsPublisher.js";
import type { Scenario } from "./scenarios/scenario.js";
import { registerScenario } from "./registry.js";

interface CliOptions {
  host: string;
  scenario: string;
  rate: number;
  seed: number;
  speed: number;
}

const defaultOptions: CliOptions = {
  host: "http://localhost:3000",
  scenario: "basic-cruise",
  rate: 1,
  seed: 42,
  speed: 1,
};

const printHelp = (): void => {
  console.log(`
Marine Data Simulator

Options:
  --host <url>       Signal K base URL (default: ${defaultOptions.host})
  --scenario <name>  Scenario name (default: ${defaultOptions.scenario})
  --rate <hz>        Update rate in Hz (default: ${defaultOptions.rate})
  --seed <number>    Random seed for deterministic output (default: ${defaultOptions.seed})
  --speed <factor>   Simulation speed multiplier 0.25-4 (default: ${defaultOptions.speed})
  --help             Show this help

Scenarios:
  basic-cruise
  harbor-traffic
  coastal-run
  anchored-stale
  busy-shipping-lane
  combined-failures
  anchor-drift
  wind-gps-demo
`);
};

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = { ...defaultOptions };
  const [firstArg, secondArg, thirdArg] = args;
  if (firstArg && !firstArg.startsWith("--")) {
    options.host = firstArg;
    if (secondArg) options.scenario = secondArg;
    if (thirdArg) {
      const parsed = Number(thirdArg);
      if (Number.isFinite(parsed) && parsed > 0) options.rate = parsed;
    }
    return options;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    switch (arg) {
      case "--host":
        options.host = args[i + 1] ?? options.host;
        i += 1;
        break;
      case "--scenario":
        options.scenario = args[i + 1] ?? options.scenario;
        i += 1;
        break;
      case "--rate": {
        const parsed = Number(args[i + 1]);
        if (Number.isFinite(parsed) && parsed > 0) options.rate = parsed;
        i += 1;
        break;
      }
      case "--seed": {
        const parsed = Number(args[i + 1]);
        if (Number.isFinite(parsed)) options.seed = parsed;
        i += 1;
        break;
      }
      case "--speed": {
        const parsed = Number(args[i + 1]);
        if (Number.isFinite(parsed) && parsed >= 0.25 && parsed <= 4) options.speed = parsed;
        i += 1;
        break;
      }
      case "--help":
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith("--")) console.warn(`Unknown option: ${arg}`);
        break;
    }
  }
  return options;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  registerScenario("basic-cruise", "Basic Cruise", () => createBasicCruiseScenario(options.seed));
  registerScenario("harbor-traffic", "Harbor Traffic", () => createHarborTrafficScenario(options.seed));
  registerScenario("coastal-run", "Coastal Run", () => createCoastalRunScenario(options.seed));
  registerScenario("anchored-stale", "Anchored Stale", () => createAnchoredStaleScenario(options.seed));
  registerScenario("busy-shipping-lane", "Busy Shipping Lane", () => createBusyShippingLaneScenario(options.seed));
  registerScenario("combined-failures", "Combined Failures", () => createCombinedFailuresScenario(options.seed));
  registerScenario("anchor-drift", "Anchor Drift", () => createAnchorDriftScenario(options.seed));
  registerScenario("wind-gps-demo", "Wind GPS Demo", () => createWindGpsDemoScenario(options.seed));

  const { getScenarioFactory } = await import("./registry.js");
  const factory = getScenarioFactory(options.scenario);
  if (!factory) {
    console.error(`Unsupported scenario: ${options.scenario}`);
    console.error(`Available: ${(await import("./registry.js")).listScenarios().map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  const scenario = factory() as Scenario<unknown>;
  const token = process.env.SIGNALK_TOKEN;
  const publisher = new WsPublisher(options.host, token);
  const engine = new SimulatorEngine(scenario, publisher, options.rate, options.speed);

  console.log(`[simulator] scenario=${scenario.name} rate=${options.rate}Hz speed=${options.speed}x seed=${options.seed} host=${options.host}`);
  await engine.start();
};

main().catch((error) => {
  console.error("Simulator failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
