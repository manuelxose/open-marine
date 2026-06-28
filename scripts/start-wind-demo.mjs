import { execFileSync, spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const isPidRunning = (pidName) => {
  const pidPath = join(projectRoot, pidName);
  if (!existsSync(pidPath)) return false;
  const pid = Number(readFileSync(pidPath, "utf8"));
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const endpointAvailable = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
};
const startDetached = (name, cwd, args, logName, pidName) => {
  const logPath = join(projectRoot, logName);
  const logFd = openSync(logPath, "a");
  const windows = process.platform === "win32";
  const command = windows ? "cmd.exe" : "npm";
  const commandArgs = windows
    ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
    : args;
  const child = spawn(command, commandArgs, {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  closeSync(logFd);
  writeFileSync(join(projectRoot, pidName), String(child.pid), "utf8");
  console.log(`[wind-demo] ${name} pid=${child.pid} log=${logPath}`);
};

execFileSync(
  "docker",
  ["compose", "up", "-d"],
  { cwd: join(projectRoot, "signalk-runtime"), stdio: "inherit", windowsHide: true },
);

if (isPidRunning(".omi-wind-demo-simulator.pid")) {
  console.log("[wind-demo] simulator already running");
} else {
  startDetached(
    "simulator",
    projectRoot,
    ["run", "start:simulator", "--", "--scenario", "wind-gps-demo", "--rate", "2"],
    ".omi-wind-demo-simulator.log",
    ".omi-wind-demo-simulator.pid",
  );
}

if (await endpointAvailable("http://localhost:4200/")) {
  console.log("[wind-demo] UI already running on port 4200");
} else {
  startDetached(
    "ui",
    join(projectRoot, "marine-instrumentation-ui"),
    ["run", "start:lan"],
    ".omi-wind-demo-ui.log",
    ".omi-wind-demo-ui.pid",
  );
}

console.log("[wind-demo] Signal K: http://localhost:3000/signalk");
console.log("[wind-demo] UI: http://localhost:4200/");
