import { SimulatorEngine } from "./engine/simulatorEngine.js";
import { createAnchoredStaleScenario } from "./scenarios/anchoredStale.js";
import { createBasicCruiseScenario } from "./scenarios/basicCruise.js";
import { createCoastalRunScenario } from "./scenarios/coastalRun.js";
import { createHarborTrafficScenario } from "./scenarios/harborTraffic.js";
import { createBusyShippingLaneScenario } from "./scenarios/busyShippingLane.js";
import { createCombinedFailuresScenario } from "./scenarios/combinedFailures.js";
import { createAnchorDriftScenario } from "./scenarios/anchorDrift.js";
import { WsPublisher } from "./publishers/wsPublisher.js";
import type { Scenario } from "./scenarios/scenario.js";

interface CliOptions {
  host: string;
  scenario: string;
  rate: number;
}

const defaultOptions: CliOptions = {
  host: "http://localhost:3000",
  scenario: "basic-cruise",
  rate: 1,
};

const printHelp = (): void => {
  console.log(`
Marine Data Simulator

Options:
  --host <url>       Signal K base URL (default: ${defaultOptions.host})
  --scenario <name>  Scenario name (default: ${defaultOptions.scenario})
  --rate <hz>        Update rate in Hz (default: ${defaultOptions.rate})
  --help             Show this help

Scenarios:
  basic-cruise
  harbor-traffic
  coastal-run
  anchored-stale
  busy-shipping-lane
  combined-failures
  anchor-drift
`);
};

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = { ...defaultOptions };

  // Handle positional arguments (fallback)
  // If first arg doesn't start with --, assume: host scenario rate
  if (args.length > 0 && !args[0].startsWith("--")) {
    if (args[0]) options.host = args[0];
    if (args[1]) options.scenario = args[1];
    if (args[2]) {
      const parsed = Number(args[2]);
      if (Number.isFinite(parsed) && parsed > 0) options.rate = parsed;
    }
    return options;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    switch (arg) {
      case "--host":
        options.host = args[i + 1] ?? options.host;
        i += 1;
        break;
      case "--scenario":
        options.scenario = args[i + 1] ?? options.scenario;
        i += 1;
        break;
      case "--rate":
        {
          const parsed = Number(args[i + 1]);
          if (Number.isFinite(parsed) && parsed > 0) {
            options.rate = parsed;
          }
        }
        i += 1;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith("--")) {
          console.warn(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  const scenarios: Record<string, () => Scenario<any>> = {
    "basic-cruise": createBasicCruiseScenario,
    "harbor-traffic": createHarborTrafficScenario,
    "coastal-run": createCoastalRunScenario,
    "anchored-stale": createAnchoredStaleScenario,
    "busy-shipping-lane": createBusyShippingLaneScenario,
    "combined-failures": createCombinedFailuresScenario,
    "anchor-drift": createAnchorDriftScenario,
  };

  const scenarioFactory = scenarios[options.scenario];
  if (!scenarioFactory) {
    console.error(`Unsupported scenario: ${options.scenario}`);
    console.error(`Available: ${Object.keys(scenarios).join(", ")}`);
    process.exit(1);
  }

  const scenario = scenarioFactory();
  const token = process.env.SIGNALK_TOKEN;
  const publisher = new WsPublisher(options.host, token);
  const engine = new SimulatorEngine(scenario, publisher, options.rate);

  console.log(`[simulator] scenario=${scenario.name} rate=${options.rate}Hz host=${options.host}`);
  await engine.start();
};

main().catch((error) => {
  console.error("Simulator failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
