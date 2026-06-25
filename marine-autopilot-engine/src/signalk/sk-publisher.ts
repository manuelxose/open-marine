import type { Logger } from "../app/logger.js";

export interface SkValue {
  path: string;
  value: unknown;
}

interface DeltaMessage {
  context: string;
  updates: Array<{
    timestamp: string;
    source: { label: string; src: string; type: string };
    values: SkValue[];
  }>;
}

/**
 * Publishes autopilot status (and, on the bench, simulated boat state) to
 * Signal K via HTTP deltas. Mirrors marine-sensor-gateway's publisher so the
 * UI's DatapointStore consumes engine output with no special-casing.
 */
export class SignalKPublisher {
  private readonly baseUrl: string;
  private socket: WebSocket | null = null;
  private socketReady: Promise<WebSocket> | null = null;
  private websocketOnly = false;
  private readonly source = {
    src: "omi-autopilot",
    type: "autopilot",
    label: "OMI Autopilot",
  };

  constructor(
    baseUrl: string,
    private readonly log: Logger,
  ) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  async publish(values: SkValue[], context = "vessels.self"): Promise<void> {
    if (values.length === 0) {
      return;
    }
    const message: DeltaMessage = {
      context,
      updates: [{ timestamp: new Date().toISOString(), source: this.source, values }],
    };

    const url = new URL("signalk/v1/api/", this.baseUrl);
    try {
      if (!this.websocketOnly) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
        if (response.ok) {
          return;
        }
        if (response.status !== 404 && response.status !== 405) {
          this.log.warn(`publish failed (${response.status})`);
          return;
        }
        this.websocketOnly = true;
        this.log.info(`HTTP delta unavailable (${response.status}); using Signal K WebSocket`);
      }

      const socket = await this.getSocket();
      socket.send(JSON.stringify(message));
    } catch (error) {
      this.socket?.close();
      this.socket = null;
      this.socketReady = null;
      this.log.warn("publish error", error instanceof Error ? error.message : String(error));
    }
  }

  private getSocket(): Promise<WebSocket> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(this.socket);
    }
    if (this.socketReady) {
      return this.socketReady;
    }

    this.socketReady = new Promise<WebSocket>((resolve, reject) => {
      const url = new URL(this.baseUrl);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/signalk/v1/stream";
      url.search = "subscribe=none";
      const socket = new WebSocket(url);

      socket.addEventListener("open", () => {
        this.socket = socket;
        this.socketReady = null;
        resolve(socket);
      }, { once: true });
      socket.addEventListener("error", () => {
        this.socketReady = null;
        reject(new Error("Signal K WebSocket connection failed"));
      }, { once: true });
      socket.addEventListener("close", () => {
        if (this.socket === socket) {
          this.socket = null;
        }
      });
    });

    return this.socketReady;
  }
}
