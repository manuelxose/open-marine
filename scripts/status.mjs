import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const timeoutMs = 5000;

function logCheck(ok, name) {
  console.log(`  ${ok ? "[OK]" : "[FAIL]"} ${name}`);
}

async function checkHttp(name, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const ok = response.ok;
    logCheck(ok, name);
    return ok;
  } catch {
    logCheck(false, name);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function checkUdpPort() {
  const isWindows = platform() === "win32";
  const cmd = isWindows
    ? { command: "netstat", args: ["-an", "-p", "udp"] }
    : { command: "ss", args: ["-uln"] };

  try {
    const result = spawnSync(cmd.command, cmd.args, {
      encoding: "utf8",
      timeout: timeoutMs
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    const ok = output.includes("10110");
    logCheck(ok, "Puerto UDP 10110 visible");
    return ok;
  } catch {
    logCheck(false, "Puerto UDP 10110 visible");
    return false;
  }
}

async function checkAisTargets() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("http://localhost:3000/signalk/v1/api/vessels", {
      signal: controller.signal
    });
    if (!response.ok) {
      console.log("  [WARN] No se pudo consultar AIS targets");
      return;
    }

    const vessels = await response.json();
    const keys = Object.keys(vessels || {});
    const aisCount = keys.filter(
      (id) => id !== "self" && id !== "urn:mrn:imo:mmsi:self"
    ).length;
    console.log(`  [INFO] AIS Targets: ${aisCount} buques detectados`);
  } catch {
    console.log("  [WARN] No se pudo consultar AIS targets");
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log("\nOMI System Status\n");

  await checkHttp("Signal K (Docker)", "http://localhost:3000/signalk");
  await checkHttp("Signal K API", "http://localhost:3000/signalk/v1/api/");
  checkUdpPort();
  await checkAisTargets();

  console.log("");
}

await main();
