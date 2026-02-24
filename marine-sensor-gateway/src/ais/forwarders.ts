import dgram from "node:dgram";
import net from "node:net";
import { Backoff } from "./backoff.js";
import type { Logger } from "./logger.js";

export interface NmeaForwarder {
  start(): void;
  stop(): void;
  send(sentence: string): void;
}

export class UdpForwarder implements NmeaForwarder {
  private socket: dgram.Socket | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (this.socket) return;
    this.socket = dgram.createSocket("udp4");
    this.socket.on("error", (error) => {
      this.logger.warn(`[ais] udp socket error: ${error.message}`);
    });
  }

  stop(): void {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
  }

  send(sentence: string): void {
    if (!this.socket) return;
    const payload = Buffer.from(`${sentence}\r\n`, "utf8");
    this.socket.send(payload, this.port, this.host, (error) => {
      if (error) {
        this.logger.warn(`[ais] udp send error: ${error.message}`);
      }
    });
  }
}

export class TcpForwarder implements NmeaForwarder {
  private socket: net.Socket | null = null;
  private connecting = false;
  private stopped = true;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly backoff = new Backoff(1000, 15000);
  private readonly queue: string[] = [];

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly logger: Logger,
  ) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearReconnect();
    this.queue.length = 0;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connecting = false;
    this.backoff.reset();
  }

  send(sentence: string): void {
    const payload = `${sentence}\r\n`;
    if (this.socket?.writable) {
      this.socket.write(payload, "utf8");
      return;
    }
    this.enqueue(payload);
  }

  private connect(): void {
    if (this.stopped || this.connecting || this.socket) return;
    this.connecting = true;

    const socket = new net.Socket();
    this.socket = socket;
    socket.setNoDelay(true);

    socket.on("connect", () => {
      this.connecting = false;
      this.backoff.reset();
      this.logger.info(`[ais] tcp connected to ${this.host}:${this.port}`);
      this.flush();
    });

    socket.on("error", (error) => {
      this.logger.warn(`[ais] tcp error: ${error.message}`);
    });

    socket.on("close", () => {
      this.socket = null;
      this.connecting = false;
      if (!this.stopped) {
        this.scheduleReconnect();
      }
    });

    socket.connect(this.port, this.host);
  }

  private flush(): void {
    while (this.socket?.writable && this.queue.length > 0) {
      const payload = this.queue.shift();
      if (payload) {
        this.socket.write(payload, "utf8");
      }
    }
  }

  private enqueue(payload: string): void {
    if (this.queue.length >= 500) {
      this.queue.shift();
    }
    this.queue.push(payload);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.backoff.nextDelay();
    this.logger.warn(`[ais] tcp reconnect in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
