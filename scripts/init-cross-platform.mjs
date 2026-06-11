import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  if (platform() === "win32") {
    console.log("[OMI] Detectado Windows -> ejecutando init.ps1");
    execFileSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(__dirname, "init.ps1")],
      { stdio: "inherit" }
    );
  } else {
    console.log("[OMI] Detectado Linux/macOS -> ejecutando init.sh");
    execFileSync("bash", [join(__dirname, "init.sh")], { stdio: "inherit" });
  }
} catch (error) {
  const exitCode =
    typeof error?.status === "number" && Number.isInteger(error.status)
      ? error.status
      : 1;
  console.error(`[OMI] Inicializacion fallida (codigo ${exitCode}). Revisa los mensajes anteriores.`);
  process.exit(exitCode);
}
