import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import type { AisConfig } from "./config.js";
import { Backoff } from "./backoff.js";
import { createDefaultLogger, type Logger } from "./logger.js";
import { TcpForwarder, UdpForwarder, type NmeaForwarder } from "./forwarders.js";

export interface AisGatewayStatus {
  running: boolean;
  lastStart?: string;
  lastNmeaAt?: string;
  errorsCount: number;
  restarts: number;
  lastError?: string;
  pid?: number;
}

const nmeaPattern = /^[!$][^*]*\*[0-9A-Fa-f]{2}$/;
type AisChildProcess = ChildProcessByStdio<null, Readable, Readable>;

export class AisGateway {
  private readonly logger: Logger;
  private readonly forwarder: NmeaForwarder;
  private readonly restartBackoff = new Backoff(1000, 15000);
  private readonly status: AisGatewayStatus = {
    running: false,
    errorsCount: 0,
    restarts: 0,
  };
  private process: AisChildProcess | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private stopping = false;
  private hasNmeaSinceStart = false;

  constructor(private readonly config: AisConfig, logger?: Logger) {
    this.logger = logger ?? createDefaultLogger();
    this.forwarder =
      config.forwardMode === "tcp"
        ? new TcpForwarder(config.signalKHost, config.signalKPort, this.logger)
        : new UdpForwarder(config.signalKHost, config.signalKPort, this.logger);
  }

  start(): void {
    if (this.process) return;
    this.stopping = false;
    this.forwarder.start();
    this.spawnProcess();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.clearRestart();
    this.forwarder.stop();
    await this.stopProcess();
  }

  getStatus(): AisGatewayStatus {
    return { ...this.status };
  }

  private spawnProcess(): void {
    const args = this.buildArgs();
    this.hasNmeaSinceStart = false;

    this.logger.info(`[ais] starting rtl_ais: ${this.config.rtlAisPath} ${args.join(" ")}`);

    const child = spawn(this.config.rtlAisPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    this.process = child;
    this.status.running = true;
    this.status.lastStart = new Date().toISOString();
    if (typeof child.pid === "number") {
      this.status.pid = child.pid;
    } else {
      delete this.status.pid;
    }

    child.on("error", (error) => {
      this.status.errorsCount += 1;
      this.status.lastError = error.message;
      this.status.running = false;
      delete this.status.pid;
      this.process = null;
      this.logger.error(`[ais] rtl_ais spawn error: ${error.message}`);
      if (!this.stopping) {
        this.scheduleRestart("spawn error");
      }
    });

    child.on("exit", (code, signal) => {
      this.status.running = false;
      delete this.status.pid;
      this.process = null;

      if (this.stopping) {
        this.logger.info("[ais] rtl_ais stopped.");
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
      if (code !== 0 || signal) {
        this.status.errorsCount += 1;
        this.status.lastError = reason;
      }

      this.logger.warn(`[ais] rtl_ais exited (${reason}).`);
      this.scheduleRestart(reason);
    });

    if (child.stdout) {
      this.attachLineReader(child.stdout, "stdout");
    }

    if (child.stderr) {
      this.attachLineReader(child.stderr, "stderr");
    }

    if (!this.config.logNmea) {
      this.logger.info("[ais] AIS_LOG_NMEA=false: raw NMEA will not be logged.");
    }
  }

  private buildArgs(): string[] {
    const args: string[] = [
      "-d",
      this.config.deviceIndex.toString(),
      "-p",
      this.config.ppm.toString(),
      "-g",
      this.config.gain.toString(),
      "-n",
    ];

    if (this.config.edgeTuning) {
      args.push("-E");
    }

    return args;
  }

  private attachLineReader(stream: NodeJS.ReadableStream, source: "stdout" | "stderr"): void {
    let buffer = "";

    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      let index = buffer.indexOf("\n");
      while (index !== -1) {
        const raw = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        this.handleLine(raw.replace(/\r$/, ""), source);
        index = buffer.indexOf("\n");
      }
    };

    const onEnd = (): void => {
      const remaining = buffer.trim();
      if (remaining.length > 0) {
        this.handleLine(remaining, source);
      }
      buffer = "";
    };

    stream.on("data", onData);
    stream.on("end", onEnd);
  }

  private handleLine(line: string, source: "stdout" | "stderr"): void {
    if (!line) return;

    if (nmeaPattern.test(line)) {
      this.status.lastNmeaAt = new Date().toISOString();
      if (!this.hasNmeaSinceStart) {
        this.hasNmeaSinceStart = true;
        this.restartBackoff.reset();
      }

      if (this.config.logNmea) {
        this.logger.debug(`[ais] nmea (${source}): ${line}`);
      }

      this.forwarder.send(line);
      return;
    }

    this.logger.info(`[ais] rtl_ais ${source}: ${line}`);
  }

  private scheduleRestart(reason: string): void {
    if (this.restartTimer || this.stopping) return;
    this.status.restarts += 1;
    const delay = this.restartBackoff.nextDelay();
    this.logger.warn(`[ais] restart scheduled in ${delay}ms (${reason}).`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.spawnProcess();
    }, delay);
  }

  private clearRestart(): void {
    if (!this.restartTimer) return;
    clearTimeout(this.restartTimer);
    this.restartTimer = null;
  }

  private stopProcess(): Promise<void> {
    const child = this.process;
    if (!child) return Promise.resolve();

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (): void => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      const timeout = setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
        finish();
      }, 3000);

      child.once("exit", () => {
        clearTimeout(timeout);
        finish();
      });

      child.kill("SIGINT");
    });
  }
}
