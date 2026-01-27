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
    const [firstPoint] = points;
    if (!firstPoint) {
      return;
    }

    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Signal K WebSocket not connected");
    }

    const timestamp = firstPoint.timestamp;
    const source = buildDeltaSource(firstPoint.source);
    const values: DeltaValue[] = points.map((point) => ({
      path: point.path,
      value: point.value,
    }));

    const message: DeltaMessage = {
      context: "vessels.self",
      updates: [
        {
          timestamp,
          source,
          values,
        },
      ],
    };

    socket.send(JSON.stringify(message));
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
