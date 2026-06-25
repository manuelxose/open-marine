import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const scriptDir = dirname(fileURLToPath(import.meta.url));

if (platform() === "win32") {
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(scriptDir, "start-wind.ps1")],
    { stdio: "inherit" },
  );
} else {
  execFileSync("bash", [join(scriptDir, "start-wind.sh")], { stdio: "inherit" });
}
