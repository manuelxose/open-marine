import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
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

const portAvailable = (port) =>
  new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });

const describePortOwner = (port) => {
  if (process.platform !== "win32") {
    try {
      return execFileSync(
        "sh",
        [
          "-c",
          `lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1 " pid=" $2}'`,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        },
      ).trim();
    } catch {
      return "";
    }
  }

  try {
    return execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `$c=Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p=Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if ($p) { "$($p.ProcessName) pid=$($p.Id)" } else { "pid=$($c.OwningProcess)" } }`,
      ],
      { encoding: "utf8", windowsHide: true },
    ).trim();
  } catch {
    return "";
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

execFileSync("docker", ["compose", "up", "-d"], {
  cwd: join(projectRoot, "signalk-runtime"),
  stdio: "inherit",
  windowsHide: true,
});

if (isPidRunning(".omi-wind-demo-simulator.pid")) {
  console.log("[wind-demo] simulator already running");
} else {
  startDetached(
    "simulator",
    projectRoot,
    ["run", "start:simulation-bench", "--", "--host", "http://localhost:3000"],
    ".omi-wind-demo-simulator.log",
    ".omi-wind-demo-simulator.pid",
  );
}

if (await endpointAvailable("http://localhost:4200/")) {
  console.log("[wind-demo] UI already available at http://localhost:4200/");
} else if (!(await portAvailable(4200))) {
  const owner = describePortOwner(4200);
  console.log(
    `[wind-demo] UI not started because port 4200 is already in use${owner ? ` by ${owner}` : ""}`,
  );
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
