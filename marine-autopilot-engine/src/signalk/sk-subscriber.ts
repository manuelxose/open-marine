import type { Logger } from "../app/logger.js";

interface TimedValue {
  value: unknown;
  receivedMs: number;
}

interface DeltaMessage {
  context?: string;
  updates?: Array<{ values?: Array<{ path?: string; value?: unknown }> }>;
}

/**
 * Subscribes to the Signal K WebSocket stream for the self vessel and keeps the
 * latest value (with receive time) for each path. Reconnects automatically.
 * Uses the global WebSocket (Node 22+), as the rest of this codebase does.
 */
export class SignalKSubscriber {
  private socket: WebSocket | null = null;
  private readonly latest = new Map<string, TimedValue>();
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly wsUrl: string,
    private readonly paths: string[],
    private readonly log: Logger,
  ) {}

  async start(): Promise<void> {
    this.closed = false;
    this.connect();
  }

  async stop(): Promise<void> {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  /** Latest value for a path, or undefined if never received. */
  get<T>(path: string): T | undefined {
    return this.latest.get(path)?.value as T | undefined;
  }

  /** Whether a fresh value for `path` arrived within `maxAgeMs`. */
  isFresh(path: string, nowMs: number, maxAgeMs: number): boolean {
    const entry = this.latest.get(path);
    return entry !== undefined && nowMs - entry.receivedMs <= maxAgeMs;
  }

  private connect(): void {
    const url = this.buildUrl();
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      this.log.error("WebSocket construct failed", error);
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.log.info(`subscribed to Signal K stream (${this.paths.length} paths)`);
      socket.send(
        JSON.stringify({
          context: "vessels.self",
          subscribe: this.paths.map((path) => ({ path, period: 200 })),
        }),
      );
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      this.handleMessage(event.data);
    });

    socket.addEventListener("error", () => {
      this.log.warn("Signal K stream error");
    });

    socket.addEventListener("close", () => {
      this.socket = null;
      if (!this.closed) {
        this.scheduleReconnect();
      }
    });
  }

  private handleMessage(data: unknown): void {
    let text: string;
    if (typeof data === "string") {
      text = data;
    } else {
      return;
    }
    let msg: DeltaMessage;
    try {
      msg = JSON.parse(text) as DeltaMessage;
    } catch {
      return;
    }
    if (!msg.updates) {
      return;
    }
    const now = Date.now();
    for (const update of msg.updates) {
      for (const v of update.values ?? []) {
        if (typeof v.path === "string") {
          this.latest.set(v.path, { value: v.value, receivedMs: now });
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closed) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  private buildUrl(): string {
    const url = new URL(this.wsUrl);
    url.searchParams.set("subscribe", "none");
    return url.toString();
  }
}
