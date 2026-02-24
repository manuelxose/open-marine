import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

try {
  if (platform() === "win32") {
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(__dirname, "migrate-to-raspberry.ps1"),
        ...args
      ],
      { stdio: "inherit" }
    );
  } else {
    execFileSync("bash", [join(__dirname, "migrate-to-raspberry.sh"), ...args], {
      stdio: "inherit"
    });
  }
} catch (error) {
  const exitCode =
    typeof error?.status === "number" && Number.isInteger(error.status)
      ? error.status
      : 1;
  console.error(`[OMI] Migracion a Raspberry fallida (codigo ${exitCode}).`);
  process.exit(exitCode);
}
