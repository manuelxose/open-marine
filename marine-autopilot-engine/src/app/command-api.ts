import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AutopilotMode, AutopilotStatus, SimulationBenchResetRequest } from "@omi/marine-data-contract";
import type { Logger } from "./logger.js";
import type { EngageResult } from "./state-machine.js";
import type { AutopilotTuning } from "../types.js";

/** Commands the HTTP API drives on the engine. */
export interface AutopilotCommands {
  setMode(mode: AutopilotMode): void;
  engage(): EngageResult;
  disengage(): void;
  /** Absolute target for the active mode, in radians (Signal K convention). */
  setTargetRad(rad: number): void;
  /** Relative nudge (dodge), in radians. */
  dodgeRad(rad: number): void;
  clearFault(): void;
  getStatus(): AutopilotStatus;
  getTuning(): AutopilotTuning;
  setTuning(partial: Partial<AutopilotTuning>): AutopilotTuning;
  emergencyStop(): void;
  driveTest(side: "port" | "stbd", seconds: number): EngageResult;
  resetSimulation(request: SimulationBenchResetRequest): EngageResult;
}

const ACTIONS = [
  "mode",
  "engage",
  "disengage",
  "target",
  "dodge",
  "clearFault",
  "tuning",
  "estop",
  "drive-test",
] as const;
type Action = (typeof ACTIONS)[number];

const isMode = (value: unknown): value is AutopilotMode =>
  value === "compass" || value === "wind" || value === "gps";

/**
 * HTTP control API. Replicates the Signal K v2 autopilot routes the UI already
 * calls (`/vessels/self/autopilots/_default/{mode,engage,disengage,target}`)
 * plus `dodge`, `clearFault` and a status/health endpoint, so the UI only needs
 * to repoint its base URL. CORS-open for the LAN dev server.
 */
export class CommandApi {
  private server: Server | null = null;

  constructor(
    private readonly port: number,
    private readonly commands: AutopilotCommands,
    private readonly log: Logger,
  ) {}

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handle(req, res));
      this.server.listen(this.port, () => {
        this.log.info(`command API listening on :${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.server = null;
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    const url = req.url ?? "";

    // GET /tuning → current calibration; any other GET → status/health.
    if (req.method === "GET") {
      if (this.matchAction(url) === "tuning") {
        this.sendJson(res, 200, { ok: true, tuning: this.commands.getTuning() });
        return;
      }
      this.sendJson(res, 200, { ok: true, autopilot: this.commands.getStatus() });
      return;
    }

    if (req.method === "POST" && this.matchSimReset(url)) {
      this.readBody(req)
        .then((body) => this.dispatchSimReset(body, res))
        .catch(() => this.sendJson(res, 400, { error: "bad request" }));
      return;
    }

    const action = this.matchAction(url);
    if (!action) {
      this.sendJson(res, 404, { error: "unknown route" });
      return;
    }

    this.readBody(req)
      .then((body) => this.dispatch(action, body, res))
      .catch(() => this.sendJson(res, 400, { error: "bad request" }));
  }

  private matchAction(url: string): Action | null {
    const path = url.split("?")[0] ?? "";
    for (const action of ACTIONS) {
      if (path.endsWith(`/autopilots/_default/${action}`)) {
        return action;
      }
    }
    return null;
  }

  private matchSimReset(url: string): boolean {
    return (url.split("?")[0] ?? "") === "/sim/reset";
  }

  private dispatchSimReset(body: Record<string, unknown>, res: ServerResponse): void {
    const request = parseSimulationReset(body);
    if (!request) {
      this.sendJson(res, 400, { error: "invalid simulation reset request" });
      return;
    }
    const result = this.commands.resetSimulation(request);
    if (!result.ok) {
      this.sendJson(res, 409, { error: result.reason ?? "simulation reset unavailable" });
      return;
    }
    this.sendOk(res);
  }

  private dispatch(action: Action, body: Record<string, unknown>, res: ServerResponse): void {
    switch (action) {
      case "mode": {
        if (!isMode(body.value)) {
          this.sendJson(res, 400, { error: "invalid mode" });
          return;
        }
        this.commands.setMode(body.value);
        this.sendOk(res);
        return;
      }
      case "engage": {
        const result = this.commands.engage();
        if (!result.ok) {
          this.sendJson(res, 409, { error: result.reason ?? "cannot engage" });
          return;
        }
        this.sendOk(res);
        return;
      }
      case "disengage": {
        this.commands.disengage();
        this.sendOk(res);
        return;
      }
      case "target": {
        const value = body.value;
        if (typeof value !== "number" || !Number.isFinite(value)) {
          this.sendJson(res, 400, { error: "invalid target" });
          return;
        }
        this.commands.setTargetRad(value);
        this.sendOk(res);
        return;
      }
      case "dodge": {
        const value = body.value;
        if (typeof value !== "number" || !Number.isFinite(value)) {
          this.sendJson(res, 400, { error: "invalid dodge" });
          return;
        }
        this.commands.dodgeRad(value);
        this.sendOk(res);
        return;
      }
      case "clearFault": {
        this.commands.clearFault();
        this.sendOk(res);
        return;
      }
      case "tuning": {
        const tuning = this.commands.setTuning(body as Partial<AutopilotTuning>);
        this.sendJson(res, 200, { ok: true, tuning });
        return;
      }
      case "estop": {
        this.commands.emergencyStop();
        this.sendOk(res);
        return;
      }
      case "drive-test": {
        const side = body.side === "stbd" ? "stbd" : body.side === "port" ? "port" : null;
        const seconds = typeof body.seconds === "number" ? body.seconds : 2;
        if (!side) {
          this.sendJson(res, 400, { error: "side must be 'port' or 'stbd'" });
          return;
        }
        const result = this.commands.driveTest(side, seconds);
        if (!result.ok) {
          this.sendJson(res, 409, { error: result.reason ?? "cannot run drive test" });
          return;
        }
        this.sendOk(res);
        return;
      }
    }
  }

  private sendOk(res: ServerResponse): void {
    this.sendJson(res, 200, { ok: true, autopilot: this.commands.getStatus() });
  }

  private sendJson(res: ServerResponse, status: number, payload: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  }

  private readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("error", reject);
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        if (raw === "") {
          resolve({});
          return;
        }
        try {
          const parsed = JSON.parse(raw) as unknown;
          resolve(typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {});
        } catch {
          reject(new Error("invalid JSON"));
        }
      });
    });
  }
}

const parseSimulationReset = (body: Record<string, unknown>): SimulationBenchResetRequest | null => {
  const origin = record(body.origin);
  const latitude = num(origin?.latitude);
  const longitude = num(origin?.longitude);
  if (latitude === undefined || longitude === undefined) return null;

  const request: SimulationBenchResetRequest = {
    origin: { latitude, longitude },
    cruiseSpeedKt: num(body.cruiseSpeedKt) ?? 5,
    trueWindDirDeg: num(body.trueWindDirDeg) ?? 45,
    trueWindSpeedKt: num(body.trueWindSpeedKt) ?? 12,
  };

  const currentSetDeg = num(body.currentSetDeg);
  const currentDriftKt = num(body.currentDriftKt);
  if (currentSetDeg !== undefined) request.currentSetDeg = currentSetDeg;
  if (currentDriftKt !== undefined) request.currentDriftKt = currentDriftKt;

  const routeLegs = Array.isArray(body.routeLegs)
    ? body.routeLegs.map(parseLeg).filter((leg): leg is { bearingDeg: number; distanceNm: number } => Boolean(leg))
    : [];
  if (routeLegs.length > 0) request.routeLegs = routeLegs;

  const waypoint = parseLeg(body.waypoint);
  if (waypoint) request.waypoint = waypoint;
  return request;
};

const parseLeg = (value: unknown): { bearingDeg: number; distanceNm: number } | null => {
  const item = record(value);
  const bearingDeg = num(item?.bearingDeg);
  const distanceNm = num(item?.distanceNm);
  if (bearingDeg === undefined || distanceNm === undefined || distanceNm <= 0) return null;
  return { bearingDeg, distanceNm };
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
