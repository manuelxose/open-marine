import type { Publisher, SimulationDataPoint } from "../core/types.js";
import { normalizeContext } from "./utils.js";

interface DeltaMessage {
  context: string;
  updates: Array<{
    timestamp: string;
    source: { label: string; src: string; type?: string };
    values: Array<{ path: string; value: unknown }>;
  }>;
}

export class WsPublisher implements Publisher {
  readonly name = "signalk-websocket";
  private socket: globalThis.WebSocket | null = null;

  constructor(private readonly baseUrl: string, private readonly token?: string) {}

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.toWebSocketUrl());
      this.socket = socket;
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Signal K WebSocket connection failed")), { once: true });
      socket.addEventListener("close", () => {
        if (this.socket === socket) this.socket = null;
      }, { once: true });
    });
  }

  async disconnect(): Promise<void> {
    this.socket?.close();
    this.socket = null;
  }

  async publish(points: SimulationDataPoint[]): Promise<void> {
    if (points.length === 0) return;
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("Signal K WebSocket not connected");
    for (const message of buildDeltaMessages(points)) socket.send(JSON.stringify(message));
  }

  private toWebSocketUrl(): string {
    const url = new URL(this.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/signalk/v1/stream";
    url.search = "";
    url.searchParams.set("subscribe", "none");
    if (this.token) url.searchParams.set("token", this.token);
    return url.toString();
  }
}

export const buildDeltaMessages = (points: SimulationDataPoint[]): DeltaMessage[] => {
  const byContext = new Map<string, SimulationDataPoint[]>();
  for (const point of points) {
    const context = normalizeContext(point.context);
    const list = byContext.get(context) ?? [];
    list.push(point);
    byContext.set(context, list);
  }

  return Array.from(byContext.entries()).map(([context, contextPoints]) => {
    const first = contextPoints[0];
    if (!first) throw new Error("cannot build Signal K delta without points");
    const label = first.source?.label ?? "omi-simulation-platform";
    const source = first.source?.type ? { label, src: label, type: first.source.type } : { label, src: label };
    return {
      context,
      updates: [{
        timestamp: first.timestamp,
        source,
        values: contextPoints.map((point) => ({ path: point.path, value: point.value })),
      }],
    };
  });
};
