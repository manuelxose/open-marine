import { resolve } from "node:path";
import { BenchRuntime } from "../runtime/bench-runtime.js";
import { SqliteStore } from "../persistence/sqlite-store.js";
import { SimulationApiServer } from "../api/server.js";
import { WsPublisher } from "../publishers/ws-publisher.js";
import { ClosedLoopClient } from "../runtime/closed-loop-client.js";
import { listPresetScenarios } from "../scenarios/presets.js";
import type { ExecutionConfig } from "../core/types.js";

const defaultConfig: ExecutionConfig = {
  mode: "live",
  scenarioId: "basic-cruise",
  parameters: {},
  seed: 42,
  speed: 1,
  rateHz: 1,
  signalKHost: "http://localhost:3000",
  autopilotApiUrl: "http://localhost:3990",
  apiPort: 4100,
};

const main = async (): Promise<void> => {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "list-scenarios") {
    for (const scenario of listPresetScenarios())
      console.log(`${scenario.id}\t${scenario.name}`);
    return;
  }
  if (command === "bench" || command === "closed-loop" || command === "live") {
    const mode = command === "closed-loop" ? "closed-loop" : "bench";
    const config = parseConfig(args, { ...defaultConfig, mode, apiPort: 4100 });
    const store = new SqliteStore(
      resolve(
        config.storePath ??
          process.env["BENCH_DB_PATH"] ??
          "./data/simulation-platform.sqlite",
      ),
      numberEnv("BENCH_RETENTION_DAYS", 90),
      numberEnv("BENCH_RETENTION_MAX_BYTES", 1_073_741_824),
    );
    const autopilotUrl =
      config.autopilotApiUrl ??
      process.env["SIMULATION_AUTOPILOT_URL"] ??
      defaultConfig.autopilotApiUrl!;
    const runtime = new BenchRuntime(store, new ClosedLoopClient(autopilotUrl));
    runtime.start();
    // live siempre publica a Signal K; bench/closed-loop respetan SIMULATION_PUBLISH_SIGNALK
    const publishSignalk =
      command === "live" || process.env["SIMULATION_PUBLISH_SIGNALK"] !== "0";
    const server = new SimulationApiServer({
      port: config.apiPort ?? 4100,
      store,
      runManager: runtime.runManager,
      publisherFactory: publishSignalk
        ? () =>
            new WsPublisher(
              config.signalKHost ?? defaultConfig.signalKHost!,
              config.signalKToken ?? process.env.SIGNALK_TOKEN,
            )
        : undefined,
    });
    const { port } = await server.start();
    console.log(
      `[sim] ${command} api=http://localhost:${port}${publishSignalk ? ` signalk=${config.signalKHost}` : " signalk=disabled"} autopilot=${autopilotUrl}`,
    );
    process.once("SIGINT", async () => {
      await server.stop();
      runtime.stop();
      process.exit(0);
    });
    return;
  }
  printHelp();
};

const parseConfig = (
  args: string[],
  base: ExecutionConfig,
): ExecutionConfig => {
  const config = { ...base };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const value = args[i + 1];
    if (!arg) continue;
    if (arg === "--scenario" && value) {
      config.scenarioId = value;
      i += 1;
    } else if (arg === "--host" && value) {
      config.signalKHost = value;
      i += 1;
    } else if (arg === "--autopilot" && value) {
      config.autopilotApiUrl = value;
      i += 1;
    } else if (arg === "--rate" && value) {
      config.rateHz = positiveNumber(value, config.rateHz);
      i += 1;
    } else if (arg === "--speed" && value) {
      config.speed = positiveNumber(value, config.speed);
      i += 1;
    } else if (arg === "--seed" && value) {
      config.seed = Number(value);
      i += 1;
    } else if (arg === "--port" && value) {
      config.apiPort = Number(value);
      i += 1;
    } else if (arg === "--db" && value) {
      config.storePath = value;
      i += 1;
    } else if (arg === "--duration-ms" && value) {
      config.durationMs = Number(value);
      i += 1;
    }
  }
  return config;
};

const positiveNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const printHelp = (): void => {
  console.log(`Marine Simulation Platform

Commands:
  bench --port <port> --db <sqlite-path> --autopilot <url>
  closed-loop --port <port> --db <sqlite-path> --autopilot <url>
  live --port <port>        (alias for bench, always publishes to Signal K)
  list-scenarios
`);
};

const numberEnv = (key: string, fallback: number): number => {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
