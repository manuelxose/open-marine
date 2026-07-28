import { openSync, closeSync, writeSync, createReadStream, type ReadStream } from "node:fs";
import type { Logger } from "../../app/logger.js";
import type { DriveCommand, MotorController, MotorFeedback } from "../../types.js";

export interface SerialBackendConfig {
  /** Serial device path, e.g. /dev/ttyAMA0. Configure baud with `stty` first. */
  port: string;
  baud: number;
  /** Pico profile required before enable. Production is the fail-safe default. */
  requiredProfile?: "production" | "hil-motor";
}

export interface ParsedTelemetry {
  rudderAngleDeg?: number;
  motorCurrentA?: number;
  fault?: string;
  profile?: string;
  safetyReady?: boolean;
  enabled?: boolean;
}

export const isPicoPreflightReady = (
  telemetry: ParsedTelemetry,
  requiredProfile: "production" | "hil-motor",
): boolean => telemetry.profile === requiredProfile && telemetry.safetyReady === true;

/**
 * Parse one telemetry line from the microcontroller. Pure function (unit-tested):
 *   `T,<rudderDeg>,<currentA>`  → rudder + current echo
 *   `F,<reason>`                → microcontroller-side fault
 * Returns null for unrecognised / malformed frames.
 */
export const parseTelemetryLine = (line: string): ParsedTelemetry | null => {
  const parts = line.trim().split(",");
  const kind = parts[0];
  if (kind === "T") {
    const rudder = parts[1]?.trim() ? Number(parts[1]) : Number.NaN;
    const current = parts[2]?.trim() ? Number(parts[2]) : Number.NaN;
    const out: ParsedTelemetry = {};
    if (Number.isFinite(rudder)) out.rudderAngleDeg = rudder;
    if (Number.isFinite(current)) out.motorCurrentA = current;
    return Object.keys(out).length > 0 ? out : null;
  }
  if (kind === "F") {
    const reason = parts[1]?.trim();
    return { fault: reason && reason.length > 0 ? reason : "micro-fault" };
  }
  if (kind === "R" && parts[1] === "pico2") {
    const values = new Map(
      parts.slice(2).map((part) => {
        const separator = part.indexOf("=");
        return separator < 0
          ? [part, ""] as const
          : [part.slice(0, separator), part.slice(separator + 1)] as const;
      }),
    );
    const profile = values.get("profile");
    const ready = values.get("ready");
    const enabled = values.get("enabled");
    const statusFault = values.get("fault");
    return {
      ...(profile ? { profile } : {}),
      ...(ready === "0" || ready === "1" ? { safetyReady: ready === "1" } : {}),
      ...(enabled === "0" || enabled === "1" ? { enabled: enabled === "1" } : {}),
      ...(statusFault ? { fault: statusFault } : {}),
    };
  }
  return null;
};

/**
 * UART backend to the auxiliary microcontroller (the recommended real path).
 * The Raspberry sends a drive command + enable and a periodic heartbeat; the
 * microcontroller does the real-time PWM/direction/enable and cuts the motor if
 * the heartbeat stops (hardware failsafe). Telemetry (rudder/current echo and
 * micro faults) is parsed back. Protocol: docs/MOTOR_PROTOCOL.md.
 */
export class SerialMotor implements MotorController {
  private fd: number | null = null;
  private reader: ReadStream | null = null;
  private enabled = false;
  private last: DriveCommand = { rudderDeg: 0, drive: 0 };
  private feedback: ParsedTelemetry = {};
  private rxBuffer = "";

  constructor(
    private readonly config: SerialBackendConfig,
    private readonly log: Logger,
  ) {}

  async init(): Promise<void> {
    try {
      this.fd = openSync(this.config.port, "r+");
      this.log.info(`serial motor backend on ${this.config.port} @ ${this.config.baud}`);
      this.startReader();
    } catch (error) {
      this.fd = null;
      this.log.error(
        `failed to open serial port ${this.config.port}; motor will stay disabled`,
        error,
      );
    }
    // Boot disabled - motor is never live by default.
    this.writeFrame("C,0,0,0");
    this.writeFrame("P");
  }

  async enable(): Promise<void> {
    const requiredProfile = this.config.requiredProfile ?? "production";
    if (!isPicoPreflightReady(this.feedback, requiredProfile)) {
      this.enabled = false;
      this.feedback = { ...this.feedback, fault: "pico-preflight-not-ready" };
      this.writeFrame("C,0,0,0");
      this.writeFrame("P");
      this.log.error(`Pico 2 ${requiredProfile} preflight not ready; motor remains disabled`);
      return;
    }
    this.enabled = true;
    this.sendCommand();
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.last = { rudderDeg: 0, drive: 0 };
    this.writeFrame("C,0,0,0");
  }

  command(cmd: DriveCommand): void {
    this.last = cmd;
    if (this.enabled) {
      this.sendCommand();
    }
  }

  heartbeat(): void {
    this.writeFrame("H");
  }

  getFeedback(): MotorFeedback {
    return {
      rudderAngleDeg: this.feedback.rudderAngleDeg,
      motorCurrentA: this.feedback.motorCurrentA,
      enabled: this.enabled,
      clutch: this.enabled,
      ...(this.feedback.fault ? { fault: this.feedback.fault } : {}),
    };
  }

  async shutdown(): Promise<void> {
    await this.disable();
    this.reader?.close();
    this.reader = null;
    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }
  }

  private sendCommand(): void {
    // Frame: C,<rudderDeg>,<drive -1..1>,<enable 0|1>
    this.writeFrame(`C,${this.last.rudderDeg.toFixed(1)},${this.last.drive.toFixed(3)},1`);
  }

  private writeFrame(payload: string): void {
    if (this.fd === null) {
      return;
    }
    try {
      writeSync(this.fd, `${payload}\n`);
    } catch (error) {
      this.log.error("serial write failed", error);
    }
  }

  private startReader(): void {
    if (this.fd === null) {
      return;
    }
    try {
      this.reader = createReadStream("", { fd: this.fd, autoClose: false, encoding: "utf8" });
      this.reader.on("data", (chunk: string | Buffer) => this.onData(String(chunk)));
      this.reader.on("error", (err) => this.log.warn("serial read error", err.message));
    } catch (error) {
      this.log.warn("serial reader unavailable", error);
    }
  }

  private onData(chunk: string): void {
    this.rxBuffer += chunk;
    let nl: number;
    while ((nl = this.rxBuffer.indexOf("\n")) >= 0) {
      const line = this.rxBuffer.slice(0, nl);
      this.rxBuffer = this.rxBuffer.slice(nl + 1);
      const parsed = parseTelemetryLine(line);
      if (!parsed) {
        continue;
      }
      const rudderAngleDeg = parsed.rudderAngleDeg ?? this.feedback.rudderAngleDeg;
      const motorCurrentA = parsed.motorCurrentA ?? this.feedback.motorCurrentA;
      this.feedback = {
        ...(rudderAngleDeg !== undefined ? { rudderAngleDeg } : {}),
        ...(motorCurrentA !== undefined ? { motorCurrentA } : {}),
        ...(parsed.profile !== undefined ? { profile: parsed.profile } : {}),
        ...(parsed.safetyReady !== undefined ? { safetyReady: parsed.safetyReady } : {}),
        ...(parsed.enabled !== undefined ? { enabled: parsed.enabled } : {}),
        ...(
          parsed.fault
            ? { fault: parsed.fault }
            : isPicoPreflightReady(
                parsed,
                this.config.requiredProfile ?? "production",
              )
              ? {}
              : this.feedback.fault
                ? { fault: this.feedback.fault }
                : {}
        ),
      };
    }
  }
}
