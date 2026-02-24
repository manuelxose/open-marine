import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (platform() === "win32") {
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(__dirname, "start-gps.ps1")],
    { stdio: "inherit" }
  );
} else {
  execFileSync("bash", [join(__dirname, "start-gps.sh")], { stdio: "inherit" });
}
