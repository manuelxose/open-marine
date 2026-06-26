import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { SimulationDatabase } from "./database.js";
import { RunManager } from "./run-manager.js";
import type { SimulationScenarioDocument } from "@omi/marine-data-contract";

interface JsonBody {
  [key: string]: unknown;
}

export class SimulationApiServer {
  private server: Server | null = null;

  constructor(
    private readonly port: number,
    private readonly manager: RunManager,
    private readonly database: SimulationDatabase,
  ) {}

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => void this.handle(req, res));
      this.server.listen(this.port, "0.0.0.0", () => resolve());
    });
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.server = null;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        this.json(res, 200, { ok: true, service: "marine-test-bench" });
        return;
      }

      // Scenarios
      if (req.method === "GET" && url.pathname === "/api/v2/scenarios") {
        this.json(res, 200, this.database.listScenarios());
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v2/scenarios") {
        const body = await this.body(req);
        const scenario = this.parseScenario(body);
        this.database.saveScenario(scenario);
        this.json(res, 201, scenario);
        return;
      }
      const scenarioMatch = url.pathname.match(/^\/api\/v2\/scenarios\/([^/]+)(?:\/export)?$/);
      if (scenarioMatch) {
        const scenarioId = decodeURIComponent(scenarioMatch[1] ?? "");
        if (req.method === "GET" && !scenarioMatch[2]) {
          const scenario = this.database.getScenario(scenarioId);
          this.json(res, scenario ? 200 : 404, scenario ?? { error: "scenario-not-found" });
          return;
        }
        if (req.method === "PUT") {
          const body = await this.body(req);
          const existing = this.database.getScenario(scenarioId);
          if (!existing) throw new Error("scenario-not-found");
          if (existing.isPreset) throw new Error("preset-readonly");
          const updated = this.parseScenario({ ...existing, ...body, id: scenarioId, updatedAt: new Date().toISOString() });
          this.database.saveScenario(updated);
          this.json(res, 200, updated);
          return;
        }
        if (req.method === "DELETE") {
          this.database.deleteScenario(scenarioId);
          this.json(res, 204, null);
          return;
        }
        if (req.method === "GET" && scenarioMatch[2] === "export") {
          const scenario = this.database.getScenario(scenarioId);
          if (!scenario) throw new Error("scenario-not-found");
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="omi-scenario-${scenarioId}.json"` });
          res.end(JSON.stringify(scenario, null, 2));
          return;
        }
      }
      if (req.method === "POST" && url.pathname === "/api/v2/scenarios/import") {
        const body = await this.body(req);
        const scenario = this.parseScenario(body);
        this.database.saveScenario({ ...scenario, id: randomUUID(), isPreset: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        this.json(res, 201, scenario);
        return;
      }

      // Arm
      if (req.method === "POST" && url.pathname === "/api/v2/arm") {
        this.json(res, 201, this.manager.arm());
        return;
      }

      // Runs
      if (req.method === "GET" && url.pathname === "/api/v2/runs") {
        this.json(res, 200, this.manager.listRuns());
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v2/runs") {
        const body = await this.body(req);
        const scenarioId = typeof body["scenarioId"] === "string" ? body["scenarioId"] : "";
        const token = typeof body["armToken"] === "string" ? body["armToken"] : "";
        const parameters = this.parameters(body["parameters"]);
        const mode = body["mode"] === "closed-loop" ? "closed-loop" : "data";
        const speed = typeof body["speed"] === "number" ? body["speed"] : 1;
        const seed = typeof body["seed"] === "number" ? body["seed"] : 42;
        this.json(res, 201, this.manager.start(scenarioId, token, parameters, mode, speed, seed));
        return;
      }
      const runMatch = url.pathname.match(/^\/api\/v2\/runs\/([^/]+)(?:\/(injections|lease|abort|events|report|samples))?$/);
      if (!runMatch) {
        this.json(res, 404, { error: "not-found" });
        return;
      }
      const runId = decodeURIComponent(runMatch[1] ?? "");
      const action = runMatch[2];
      if (req.method === "GET" && !action) {
        const run = this.manager.getRun(runId);
        this.json(res, run ? 200 : 404, run ?? { error: "run-not-found" });
        return;
      }
      if (req.method === "POST" && action === "injections") {
        const body = await this.body(req);
        const injection = this.parseInjection(body);
        this.json(res, 200, this.manager.inject(runId, injection));
        return;
      }
      if (req.method === "POST" && action === "lease") {
        this.json(res, 200, this.manager.lease(runId));
        return;
      }
      if (req.method === "POST" && action === "abort") {
        this.json(res, 200, this.manager.abort(runId));
        return;
      }
      if (req.method === "GET" && action === "events") {
        this.sse(req, res, runId, Number(url.searchParams.get("after") ?? 0));
        return;
      }
      if (req.method === "GET" && action === "report") {
        const requested = url.searchParams.get("format");
        const format = requested === "csv" || requested === "html" ? requested : "json";
        const report = this.manager.report(runId, format);
        res.writeHead(200, {
          "Content-Type": `${report.contentType}; charset=utf-8`,
          "Content-Disposition": `attachment; filename="omi-sim-${runId}.${format}"`,
        });
        res.end(report.body);
        return;
      }
      if (req.method === "GET" && action === "samples") {
        const channels = url.searchParams.get("channels")?.split(",") ?? undefined;
        const fromSimulatedMs = url.searchParams.has("from") ? Number(url.searchParams.get("from")) : undefined;
        const toSimulatedMs = url.searchParams.has("to") ? Number(url.searchParams.get("to")) : undefined;
        const maxPoints = url.searchParams.has("maxPoints") ? Number(url.searchParams.get("maxPoints")) : undefined;
        this.json(res, 200, this.database.getSamples(runId, { channels, fromSimulatedMs, toSimulatedMs, maxPoints }));
        return;
      }
      this.json(res, 405, { error: "method-not-allowed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal-error";
      const status = message === "run-not-found" ? 404
        : message === "scenario-not-found" ? 404
        : message === "run-busy" ? 409
        : message === "invalid-arm-token" ? 401
        : message === "preset-readonly" ? 403
        : 400;
      this.json(res, status, { error: message });
    }
  }

  private sse(req: IncomingMessage, res: ServerResponse, runId: string, after: number): void {
    if (!this.manager.getRun(runId)) {
      this.json(res, 404, { error: "run-not-found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    for (const event of this.manager.getEvents(runId, Number.isFinite(after) ? after : 0)) {
      this.writeEvent(res, event);
    }
    const unsubscribe = this.manager.subscribe(runId, (event) => this.writeEvent(res, event));
    const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  }

  private writeEvent(res: ServerResponse, event: unknown): void {
    res.write(`event: sim-event\ndata: ${JSON.stringify(event)}\n\n`);
  }

  private parameters(value: unknown): Record<string, number | boolean | string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: Record<string, number | boolean | string> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "number" || typeof item === "boolean" || typeof item === "string") {
        result[key] = item;
      }
    }
    return result;
  }

  private parseScenario(body: unknown): SimulationScenarioDocument {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid-scenario");
    const b = body as Record<string, unknown>;
    const id = typeof b["id"] === "string" ? b["id"] : randomUUID();
    const version = typeof b["version"] === "string" ? b["version"] : "1.0.0";
    const name = typeof b["name"] === "string" ? b["name"] : "Untitled";
    const description = typeof b["description"] === "string" ? b["description"] : "";
    const category = typeof b["category"] === "string" ? b["category"] : "system";
    const mode = b["mode"] === "closed-loop" ? "closed-loop" : "data";
    const defaultDurationMs = typeof b["defaultDurationMs"] === "number" ? b["defaultDurationMs"] : 300_000;
    const defaultSpeed = typeof b["defaultSpeed"] === "number" ? b["defaultSpeed"] : 1;
    const parameters = Array.isArray(b["parameters"]) ? b["parameters"] : [];
    const channels = Array.isArray(b["channels"]) ? b["channels"] : [];
    const timeline = Array.isArray(b["timeline"]) ? b["timeline"] : [];
    const tags = Array.isArray(b["tags"]) ? b["tags"] : [];
    const isPreset = b["isPreset"] === true;
    const now = new Date().toISOString();
    return {
      id,
      version,
      name,
      description,
      category: category as SimulationScenarioDocument["category"],
      mode,
      defaultDurationMs,
      defaultSpeed,
      parameters: parameters as SimulationScenarioDocument["parameters"],
      channels: channels as SimulationScenarioDocument["channels"],
      timeline: timeline as SimulationScenarioDocument["timeline"],
      tags: tags as string[],
      isPreset,
      createdAt: typeof b["createdAt"] === "string" ? b["createdAt"] : now,
      updatedAt: now,
    };
  }

  private parseInjection(body: unknown): { channelId: string; value: number | boolean | string; label?: string | undefined } {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid-injection");
    const b = body as Record<string, unknown>;
    const channelId = typeof b["channelId"] === "string" ? b["channelId"] : "";
    const value = typeof b["value"] === "number" || typeof b["value"] === "boolean" || typeof b["value"] === "string" ? b["value"] : 0;
    return { channelId, value, label: typeof b["label"] === "string" ? b["label"] : undefined };
  }

  private body(req: IncomingMessage): Promise<JsonBody> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("error", reject);
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        if (!raw) {
          resolve({});
          return;
        }
        try {
          const parsed = JSON.parse(raw) as unknown;
          resolve(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonBody : {});
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  }

  private cors(res: ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

const randomUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
