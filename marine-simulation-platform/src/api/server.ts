import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import type { SimulationInjectionRequest, SimulationScenarioDocument } from "@omi/marine-data-contract";
import type { RunManager } from "../runtime/run-manager.js";
import type { Publisher, SimulationStore } from "../core/types.js";
import { generateWindScenario, type WindScenarioOptions } from "../scenarios/wind-scenario-generator.js";

export interface SimulationApiServerOptions {
  port: number;
  host?: string;
  store: SimulationStore;
  runManager: RunManager;
  publisherFactory?: (() => Publisher | undefined) | undefined;
}

export class SimulationApiServer {
  private readonly server: Server;

  constructor(private readonly options: SimulationApiServerOptions) {
    this.server = createServer((request, response) => void this.route(request, response));
  }

  async start(): Promise<{ port: number }> {
    await new Promise<void>((resolve) => this.server.listen(this.options.port, this.options.host ?? "0.0.0.0", resolve));
    return { port: (this.server.address() as AddressInfo).port };
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private async route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    setCorsHeaders(response);
    if (request.method === "OPTIONS") return sendJson(response, 204, null);
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { ok: true, service: "marine-simulation-platform" });
      }

      if (request.method === "GET" && url.pathname === "/api/v2/scenarios") {
        return sendJson(response, 200, this.options.store.listScenarios());
      }
      if (request.method === "POST" && url.pathname === "/api/v2/scenarios") {
        const scenario = parseScenario(await readJson(request));
        this.options.store.saveScenario(scenario);
        return sendJson(response, 201, scenario);
      }
      if (request.method === "POST" && url.pathname === "/api/v2/scenarios/import") {
        const imported = parseScenario(await readJson(request));
        const scenario = {
          ...imported,
          id: randomUUID(),
          isPreset: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.options.store.saveScenario(scenario);
        return sendJson(response, 201, scenario);
      }
      if (request.method === "POST" && url.pathname === "/api/v2/scenarios/generate-wind") {
        return sendJson(response, 201, generateWindScenario(parseWindScenarioOptions(await readJson(request))));
      }

      const scenarioMatch = url.pathname.match(/^\/api\/v2\/scenarios\/([^/]+)(?:\/(export))?$/);
      if (scenarioMatch?.[1]) {
        const scenarioId = decodeURIComponent(scenarioMatch[1]);
        const action = scenarioMatch[2];
        if (request.method === "GET" && action === "export") {
          const scenario = this.options.store.getScenario(scenarioId);
          if (!scenario) throw new HttpError(404, "scenario-not-found");
          response.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="omi-scenario-${scenarioId}.json"`,
          });
          response.end(JSON.stringify(scenario, null, 2));
          return;
        }
        if (request.method === "GET" && !action) {
          const scenario = this.options.store.getScenario(scenarioId);
          return sendJson(response, scenario ? 200 : 404, scenario ?? { error: "scenario-not-found" });
        }
        if (request.method === "PUT" && !action) {
          const existing = this.options.store.getScenario(scenarioId);
          if (!existing) throw new HttpError(404, "scenario-not-found");
          if (existing.isPreset) throw new HttpError(403, "preset-readonly");
          const scenario = parseScenario({ ...existing, ...await readJson(request), id: scenarioId, isPreset: false });
          this.options.store.saveScenario(scenario);
          return sendJson(response, 200, scenario);
        }
        if (request.method === "DELETE" && !action) {
          this.options.store.deleteScenario(scenarioId);
          return sendJson(response, 204, null);
        }
      }

      if (request.method === "POST" && url.pathname === "/api/v2/arm") {
        return sendJson(response, 201, this.options.runManager.arm());
      }
      if (request.method === "GET" && url.pathname === "/api/v2/runs") {
        return sendJson(response, 200, this.options.runManager.listRuns());
      }
      if (request.method === "DELETE" && url.pathname === "/api/v2/runs") {
        return sendJson(response, 200, this.options.runManager.clearRunHistory());
      }
      if (request.method === "POST" && url.pathname === "/api/v2/runs") {
        const body = await readJson(request);
        const scenarioId = typeof body["scenarioId"] === "string" ? body["scenarioId"] : "";
        const token = typeof body["armToken"] === "string" ? body["armToken"] : "";
        const mode = body["mode"] === "closed-loop" ? "closed-loop" : "data";
        const runParameters = parameters(body["parameters"]);
        const speed = typeof body["speed"] === "number" ? body["speed"] : finiteNumber(runParameters["speed"], 1);
        const seed = typeof body["seed"] === "number" ? body["seed"] : finiteNumber(runParameters["seed"], 42);
        const run = await this.options.runManager.start(scenarioId, token, runParameters, mode, speed, seed, this.options.publisherFactory?.());
        return sendJson(response, 201, run);
      }

      const runMatch = url.pathname.match(/^\/api\/v2\/runs\/([^/]+)(?:\/(injections|lease|abort|events|report|samples))?$/);
      if (runMatch?.[1]) {
        const runId = decodeURIComponent(runMatch[1]);
        const action = runMatch[2];
        if (request.method === "GET" && !action) {
          const run = this.options.runManager.getRun(runId);
          return sendJson(response, run ? 200 : 404, run ?? { error: "run-not-found" });
        }
        if (request.method === "POST" && action === "injections") {
          return sendJson(response, 200, this.options.runManager.inject(runId, parseInjection(await readJson(request))));
        }
        if (request.method === "POST" && action === "lease") {
          return sendJson(response, 200, this.options.runManager.lease(runId));
        }
        if (request.method === "POST" && action === "abort") {
          return sendJson(response, 200, this.options.runManager.abort(runId));
        }
        if (request.method === "GET" && action === "events") {
          return this.streamEvents(request, response, runId, numberParam(url, "after"));
        }
        if (request.method === "GET" && action === "samples") {
          const sampleOptions: {
            channels?: string[];
            fromSimulatedMs?: number;
            toSimulatedMs?: number;
            maxPoints?: number;
            afterTick?: number;
          } = {};
          const channels = listParam(url, "channels");
          const fromSimulatedMs = numberParam(url, "from");
          const toSimulatedMs = numberParam(url, "to");
          const maxPoints = numberParam(url, "maxPoints");
          const afterTick = numberParam(url, "after");
          if (channels) sampleOptions.channels = channels;
          if (fromSimulatedMs !== undefined) sampleOptions.fromSimulatedMs = fromSimulatedMs;
          if (toSimulatedMs !== undefined) sampleOptions.toSimulatedMs = toSimulatedMs;
          if (maxPoints !== undefined) sampleOptions.maxPoints = maxPoints;
          if (afterTick !== undefined) sampleOptions.afterTick = afterTick;
          return sendJson(response, 200, this.options.store.getSamples(runId, sampleOptions));
        }
        if (request.method === "GET" && action === "report") {
          const requested = url.searchParams.get("format");
          const format = requested === "csv" || requested === "html" ? requested : "json";
          const report = this.options.runManager.report(runId, format);
          response.writeHead(200, {
            "Content-Type": `${report.contentType}; charset=utf-8`,
            "Content-Disposition": `attachment; filename="omi-sim-${runId}.${format}"`,
          });
          response.end(report.body);
          return;
        }
      }

      return sendJson(response, 404, { error: "not-found" });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : errorStatus(error);
      return sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private streamEvents(request: IncomingMessage, response: ServerResponse, runId: string, afterSequence = 0): void {
    if (!this.options.runManager.getRun(runId)) {
      sendJson(response, 404, { error: "run-not-found" });
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });
    response.write(": connected\n\n");
    for (const event of this.options.runManager.getEvents(runId, afterSequence)) writeSseEvent(response, event);
    const unsubscribe = this.options.runManager.subscribe(runId, (event) => writeSseEvent(response, event));
    const keepAlive = setInterval(() => response.write(": keepalive\n\n"), 15_000);
    request.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  }
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const writeSseEvent = (response: ServerResponse, event: unknown): void => {
  response.write(`event: sim-event\ndata: ${JSON.stringify(event)}\n\n`);
};

const setCorsHeaders = (response: ServerResponse): void => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
};

const sendJson = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(status === 204 ? "" : JSON.stringify(body));
};

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
};

const parseScenario = (body: Record<string, unknown>): SimulationScenarioDocument => {
  const now = new Date().toISOString();
  return {
    id: typeof body["id"] === "string" ? body["id"] : randomUUID(),
    version: typeof body["version"] === "string" ? body["version"] : "1.0.0",
    name: typeof body["name"] === "string" ? body["name"] : "Untitled",
    description: typeof body["description"] === "string" ? body["description"] : "",
    category: (typeof body["category"] === "string" ? body["category"] : "system") as SimulationScenarioDocument["category"],
    mode: body["mode"] === "closed-loop" ? "closed-loop" : "data",
    defaultDurationMs: typeof body["defaultDurationMs"] === "number" ? body["defaultDurationMs"] : 300_000,
    defaultSpeed: typeof body["defaultSpeed"] === "number" ? body["defaultSpeed"] : 1,
    parameters: Array.isArray(body["parameters"]) ? body["parameters"] as SimulationScenarioDocument["parameters"] : [],
    channels: Array.isArray(body["channels"]) ? body["channels"] as SimulationScenarioDocument["channels"] : [],
    timeline: Array.isArray(body["timeline"]) ? body["timeline"] as SimulationScenarioDocument["timeline"] : [],
    tags: Array.isArray(body["tags"]) ? body["tags"] as string[] : [],
    isPreset: body["isPreset"] === true,
    createdAt: typeof body["createdAt"] === "string" ? body["createdAt"] : now,
    updatedAt: now,
  };
};

const parseWindScenarioOptions = (body: Record<string, unknown>): WindScenarioOptions => ({
  ...(typeof body["name"] === "string" ? { name: body["name"] } : {}),
  ...(typeof body["description"] === "string" ? { description: body["description"] } : {}),
  baseWindSpeedKt: finiteNumber(body["baseWindSpeedKt"], 12),
  baseWindDirDeg: finiteNumber(body["baseWindDirDeg"], 45),
  gustProbability: Math.max(0, Math.min(1, finiteNumber(body["gustProbability"], 0.1))),
  gustMaxDeltaKt: Math.max(0, finiteNumber(body["gustMaxDeltaKt"], 5)),
  durationMs: Math.max(30_000, Math.min(3_600_000, finiteNumber(body["durationMs"], 300_000))),
  seed: Math.max(1, Math.min(9999, finiteNumber(body["seed"], 42))),
  mode: body["mode"] === "closed-loop" ? "closed-loop" : "data",
});

const parseInjection = (body: Record<string, unknown>): SimulationInjectionRequest => {
  const value = body["value"];
  return {
    channelId: typeof body["channelId"] === "string" ? body["channelId"] : "",
    value: typeof value === "number" || typeof value === "boolean" || typeof value === "string" ? value : 0,
    ...(typeof body["label"] === "string" ? { label: body["label"] } : {}),
  };
};

const parameters = (value: unknown): Record<string, number | boolean | string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number | boolean | string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" || typeof item === "boolean" || typeof item === "string") result[key] = item;
  }
  return result;
};

const numberParam = (url: URL, key: string): number | undefined => {
  if (!url.searchParams.has(key)) return undefined;
  const parsed = Number(url.searchParams.get(key));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const listParam = (url: URL, key: string): string[] | undefined => {
  const value = url.searchParams.get(key);
  if (!value) return undefined;
  const items = value.split(",").filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const finiteNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const errorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "run-not-found" || message === "scenario-not-found") return 404;
  if (message === "run-busy") return 409;
  if (message === "invalid-arm-token") return 401;
  if (message === "preset-readonly") return 403;
  return 400;
};
