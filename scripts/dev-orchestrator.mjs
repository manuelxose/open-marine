import { spawn } from "node:child_process";
import { createServer } from "node:http";

const BENCH_PORT = 4100;

// Health check server to know when simulation platform is ready
const healthServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "dev-orchestrator" }));
    return;
  }
  res.writeHead(404).end();
});

healthServer.listen(0, "127.0.0.1", () => {
  // Start simulation platform bench API
  const simulation = spawn("npm", ["run", "start:simulation-bench"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });

  // Start UI with proxy to simulation platform
  const ui = spawn("npm", ["run", "start:ui:local"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // Tell UI to use relative URLs for simulation API (will be proxied)
      OMI_TEST_BENCH_URL: `http://localhost:${BENCH_PORT}`,
    },
  });

  const cleanup = (signal) => {
    console.log(`\n[dev] ${signal} received, shutting down...`);
    simulation.kill(signal === "SIGINT" ? "SIGTERM" : signal);
    ui.kill(signal === "SIGINT" ? "SIGTERM" : signal);
    healthServer.close();
  };

  process.on("SIGINT", () => cleanup("SIGINT"));
  process.on("SIGTERM", () => cleanup("SIGTERM"));

  simulation.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`[dev] simulation platform exited with code ${code}`);
    }
  });

  ui.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`[dev] UI exited with code ${code}`);
    }
    simulation.kill("SIGTERM");
    healthServer.close();
  });
});
