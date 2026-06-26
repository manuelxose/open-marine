import { resolve } from "node:path";
import { SimulationDatabase } from "./database.js";
import { RunManager } from "./run-manager.js";
import { SimulationApiServer } from "./server.js";
import { IsolatedRuntime } from "./isolated-runtime.js";
import { SCENARIO_PRESETS } from "./scenario-presets.js";

const numberEnv = (key: string, fallback: number): number => {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const port = numberEnv("BENCH_API_PORT", 4100);
const repoRoot = resolve(process.env["BENCH_REPO_ROOT"] ?? "..");
const runtime = new IsolatedRuntime(
  numberEnv("BENCH_SIGNALK_PORT", 3100),
  numberEnv("BENCH_AUTOPILOT_PORT", 3991),
  repoRoot,
);
await runtime.start();
const database = SimulationDatabase.open(
  resolve(process.env["BENCH_DB_PATH"] ?? "./data/test-bench.sqlite"),
  numberEnv("BENCH_RETENTION_DAYS", 90),
  numberEnv("BENCH_RETENTION_MAX_BYTES", 1_073_741_824),
);

// Seed preset scenarios if not already present
for (const preset of SCENARIO_PRESETS) {
  const existing = database.getScenario(preset.id);
  if (!existing) {
    database.saveScenario(preset);
    console.log(`[marine-test-bench] seeded preset: ${preset.id}`);
  }
}

const manager = new RunManager(database);
const server = new SimulationApiServer(port, manager, database);

await server.start();
console.log(`[marine-test-bench] API v2 listening on http://0.0.0.0:${port}`);
console.log("[marine-test-bench] isolated ports reserved: Signal K 3100, autopilot 3991");

const shutdown = (signal: string): void => {
  console.log(`[marine-test-bench] ${signal}; forcing safe state`);
  manager.shutdown();
  void Promise.all([server.stop(), runtime.stop()]).finally(() => {
    database.close();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
