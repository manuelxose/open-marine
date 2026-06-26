import { existsSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { WebSocket, WebSocketServer } from "ws";
import type { SimulationScenarioDocument } from "@omi/marine-data-contract";

export interface RuntimeHooks {
  onLog: (message: string) => void;
  onFault: (reason: string) => void;
}

export interface BenchRuntime {
  start(): Promise<void>;
  startRun(scenario: SimulationScenarioDocument, hooks: RuntimeHooks): Promise<void>;
  stopRun(): Promise<void>;
  stop(): Promise<void>;
}

class IsolatedSignalKServer {
  private server: Server | null = null;
  private sockets = new Set<WebSocket>();
  private readonly wss = new WebSocketServer({ noServer: true });

  constructor(private readonly port: number) {
    this.wss.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.send(JSON.stringify({
        name: "OMI isolated Signal K",
        version: "1.0.0",
        self: "vessels.self",
        roles: ["master", "main"],
      }));
      socket.on("message", (payload) => this.broadcast(payload.toString(), socket));
      socket.on("close", () => this.sockets.delete(socket));
    });
  }

  start(): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const server = createServer((req, res) => void this.handle(req, res));
      this.server = server;
      server.on("upgrade", (req, socket, head) => {
        const path = (req.url ?? "").split("?")[0];
        if (path !== "/signalk/v1/stream") {
          socket.destroy();
          return;
        }
        this.wss.handleUpgrade(req, socket, head, (ws) => this.wss.emit("connection", ws, req));
      });
      server.once("error", reject);
      server.listen(this.port, "127.0.0.1", () => resolvePromise());
    });
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets) socket.close();
    this.sockets.clear();
    const server = this.server;
    if (!server) return;
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
    this.server = null;
    this.wss.close();
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "POST" && req.url?.startsWith("/signalk/v1/api")) {
      const raw = await this.readBody(req);
      this.broadcast(raw);
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/signalk/v1/api")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"name":"OMI isolated Signal K","self":"vessels.self"}');
      return;
    }
    res.writeHead(404).end();
  }

  private broadcast(payload: string, exclude?: WebSocket): void {
    for (const socket of this.sockets) {
      if (socket !== exclude && socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("error", reject);
      req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    });
  }
}

export class IsolatedRuntime implements BenchRuntime {
  private readonly signalK: IsolatedSignalKServer;
  private child: ChildProcess | null = null;
  private uartChild: ChildProcess | null = null;
  private hooks: RuntimeHooks | null = null;
  private intentionalStop = false;

  constructor(
    private readonly signalKPort: number,
    private readonly autopilotPort: number,
    private readonly repoRoot: string,
  ) {
    this.signalK = new IsolatedSignalKServer(signalKPort);
  }

  async start(): Promise<void> {
    await this.signalK.start();
  }

  async startRun(scenario: SimulationScenarioDocument, hooks: RuntimeHooks): Promise<void> {
    await this.stopRun();
    this.hooks = hooks;
    if (scenario.mode === "closed-loop") {
      this.startVirtualUart(hooks);
    }
    const engineDir = resolve(this.repoRoot, "marine-autopilot-engine");
    const cli = resolve(engineDir, "dist", "cli.js");
    if (!existsSync(cli)) {
      hooks.onLog("Autopilot dist/cli.js no existe; ejecución determinista activa sin proceso de integración.");
      return;
    }

    this.intentionalStop = false;
    const child = spawn(process.execPath, [cli], {
      cwd: engineDir,
      env: {
        ...process.env,
        AP_MOTOR_BACKEND: "sim",
        AP_SENSOR_BACKEND: "sim",
        AP_API_PORT: String(this.autopilotPort),
        AP_SK_HTTP_URL: `http://127.0.0.1:${this.signalKPort}`,
        AP_SK_WS_URL: `ws://127.0.0.1:${this.signalKPort}/signalk/v1/stream`,
        AP_SIM_CRUISE_KT: scenario.id === "safe-start" ? "0" : "5",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child = child;
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      for (const line of chunk.trim().split(/\r?\n/).filter(Boolean)) hooks.onLog(`[autopilot] ${line}`);
    });
    child.stderr?.on("data", (chunk: string) => {
      for (const line of chunk.trim().split(/\r?\n/).filter(Boolean)) hooks.onLog(`[autopilot:stderr] ${line}`);
    });
    child.on("exit", (code, signal) => {
      if (this.child === child) this.child = null;
      if (!this.intentionalStop) {
        hooks.onFault(`isolated-autopilot-exited:${code ?? signal ?? "unknown"}`);
      }
    });
    hooks.onLog(`Autopiloto real aislado iniciado en :${this.autopilotPort}`);
  }

  async stopRun(): Promise<void> {
    const child = this.child;
    if (!child) {
      this.stopVirtualUart();
      return;
    }
    this.intentionalStop = true;
    child.kill("SIGTERM");
    await new Promise<void>((resolvePromise) => {
      const timeout = setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolvePromise();
      }, 2000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolvePromise();
      });
    });
    if (this.child === child) this.child = null;
    this.hooks?.onLog("Proceso de autopiloto aislado detenido");
    this.stopVirtualUart();
    this.hooks = null;
  }

  async stop(): Promise<void> {
    await this.stopRun();
    await this.signalK.stop();
  }

  private startVirtualUart(hooks: RuntimeHooks): void {
    if (process.platform === "win32") {
      hooks.onLog("socat no disponible en Windows; UART virtual representada por el emulador determinista.");
      return;
    }
    const uart = spawn("socat", [
      "-d", "-d",
      "pty,raw,echo=0,link=/tmp/omi-bench-ap",
      "pty,raw,echo=0,link=/tmp/omi-bench-mcu",
    ], {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    this.uartChild = uart;
    uart.stderr?.setEncoding("utf8");
    uart.stderr?.on("data", (chunk: string) => {
      const message = chunk.trim();
      if (message) hooks.onLog(`[socat] ${message}`);
    });
    uart.once("spawn", () => hooks.onLog("UART virtual socat creada: /tmp/omi-bench-ap ↔ /tmp/omi-bench-mcu"));
    uart.once("error", (error) => {
      if (this.uartChild === uart) this.uartChild = null;
      hooks.onLog(`socat no disponible: ${error.message}; usando emulador UART determinista.`);
    });
  }

  private stopVirtualUart(): void {
    const uart = this.uartChild;
    this.uartChild = null;
    if (uart && uart.exitCode === null) uart.kill("SIGTERM");
  }
}
