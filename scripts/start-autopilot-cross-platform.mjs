import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const engineDir = join(repoRoot, "marine-autopilot-engine");

// Load AP_* (and any) keys from config/omi.env without overriding the real env.
const envFile = join(repoRoot, "config", "omi.env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Use the compiled build if present, otherwise run from source via tsx.
const built = existsSync(join(engineDir, "dist", "cli.js"));
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const args = built ? ["start"] : ["run", "dev"];

console.log(
  `[autopilot] starting engine (${built ? "dist" : "tsx"}, backend=${process.env.AP_MOTOR_BACKEND ?? "sim"})`,
);

const child = spawn(npmCmd, ["--prefix", engineDir, ...args], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
