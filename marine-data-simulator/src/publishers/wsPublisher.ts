import type { ScenarioPoint } from "../scenarios/scenario.js";
import type { Publisher } from "./publisher.js";

interface DeltaValue {
  path: string;
  value: ScenarioPoint["value"];
}

interface DeltaUpdate {
  timestamp: string;
  source: { label: string; src: string; type?: string };
  values: DeltaValue[];
}

interface DeltaMessage {
  context: string;
  updates: DeltaUpdate[];
}

const DEFAULT_SOURCE_LABEL = "mock";

const buildDeltaSource = (
  source?: ScenarioPoint["source"],
): { label: string; src: string; type?: string } => {
  const label = source?.label ?? DEFAULT_SOURCE_LABEL;
  const src = source?.label ?? DEFAULT_SOURCE_LABEL;
  return {
    label,
    src,
    ...(source?.type ? { type: source.type } : {}),
  };
};

export class WsPublisher implements Publisher {
  private socket: WebSocket | null = null;
  private openPromise: Promise<void> | null = null;

  constructor(private readonly baseUrl: string, private readonly token?: string) {}

  async connect(): Promise<void> {
    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise = new Promise((resolve, reject) => {
      const wsUrl = this.toWebSocketUrl(this.baseUrl, this.token);
      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      const handleOpen = (): void => {
        cleanup();
        resolve();
      };

      const handleError = (): void => {
        cleanup();
        reject(new Error("Signal K WebSocket connection failed"));
      };

      const handleClose = (): void => {
        this.socket = null;
        this.openPromise = null;
      };

      const cleanup = (): void => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("error", handleError);
        socket.removeEventListener("close", handleClose);
      };

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("error", handleError);
      socket.addEventListener("close", handleClose);
    });

    return this.openPromise;
  }

  async publish(points: ScenarioPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Signal K WebSocket not connected");
    }

    // Group points by context
    const pointsByContext = new Map<string, ScenarioPoint[]>();
    for (const point of points) {
      const ctx = normalizeContext(point.context);
      let list = pointsByContext.get(ctx);
      if (!list) {
        list = [];
        pointsByContext.set(ctx, list);
      }
      list.push(point);
    }

    for (const [context, contextPoints] of pointsByContext) {
      const [p] = contextPoints;
      if (!p) continue;

      const timestamp = p.timestamp;
      const source = buildDeltaSource(p.source);
      const values: DeltaValue[] = contextPoints.map((point) => ({
        path: point.path,
        value: point.value,
      }));

      const message: DeltaMessage = {
        context,
        updates: [
          {
            timestamp,
            source,
            values,
          },
        ],
      };

      if (context.includes("200000000")) {
        console.log(`[wsPublisher] Sending Intruder update: ${values.length} values`);
      }

      socket.send(JSON.stringify(message));
    }
  }

  private toWebSocketUrl(baseUrl: string, token?: string): string {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/signalk/v1/stream";
    url.search = "";
    url.searchParams.set("subscribe", "none");
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  }
}

const normalizeContext = (context?: string): string => {
  if (!context || context === "self") {
    return "vessels.self";
  }
  return context;
};
