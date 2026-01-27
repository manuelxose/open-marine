import { SimulatorEngine } from "./engine/simulatorEngine.js";
import { createBasicCruiseScenario } from "./scenarios/basicCruise.js";
import { WsPublisher } from "./publishers/wsPublisher.js";

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
`);
};

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = { ...defaultOptions };

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

  if (options.scenario !== "basic-cruise") {
    console.error(`Unsupported scenario: ${options.scenario}`);
    process.exit(1);
  }

  const scenario = createBasicCruiseScenario();
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
