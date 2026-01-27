import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  PATHS,
  QualityFlag,
  type Position,
  type SignalKPath,
  type SourceRef,
} from "@omi/marine-data-contract";
import { environment } from "../../environments/environment";
import { DataStoreService } from "./data-store.service";
import { TELEMETRY_PATHS, type TelemetryPoint, type TelemetryValue } from "./telemetry";

type ConnectionStatus = "connecting" | "open" | "closed" | "error";

interface SignalKDeltaValue {
  path: string;
  value: unknown;
}

interface SignalKDeltaUpdate {
  timestamp?: string;
  source?: SourceRef;
  values?: SignalKDeltaValue[];
}

interface SignalKDeltaMessage {
  updates?: SignalKDeltaUpdate[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isPosition = (value: unknown): value is Position => {
  if (!isRecord(value)) {
    return false;
  }
  const lat = value["latitude"];
  const lon = value["longitude"];
  return isNumber(lat) && isNumber(lon);
};

@Injectable({
  providedIn: "root",
})
export class SignalKClientService {
  private socket?: WebSocket;
  private readonly knownPaths = new Set<string>(TELEMETRY_PATHS);
  readonly connection$ = new BehaviorSubject<ConnectionStatus>("closed");

  constructor(private readonly store: DataStoreService) {}

  async start(paths: SignalKPath[]): Promise<void> {
    this.connection$.next("connecting");
    await this.fetchInitial(paths);
    this.openSocket(paths);
  }

  private async fetchInitial(paths: SignalKPath[]): Promise<void> {
    await Promise.all(paths.map((path) => this.fetchPath(path)));
  }

  private async fetchPath(path: SignalKPath): Promise<void> {
    try {
      const url = new URL(`signalk/v1/api/vessels/self/${path}`, this.baseUrl());
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();
      const rawValue = isRecord(data) && "value" in data ? data["value"] : data;
      const value = this.coerceValue(path, rawValue);

      if (!value) {
        return;
      }

      const point: TelemetryPoint = {
        path,
        value,
        timestamp: new Date().toISOString(),
        source: { label: "signalk" },
        quality: QualityFlag.Good,
      };

      this.store.setPoint(point);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[signalk] REST fetch ERROR: ${message}`);
      this.connection$.next("error");
    }
  }

  private openSocket(paths: SignalKPath[]): void {
    const wsUrl = this.toWebSocketUrl(this.baseUrl());
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.connection$.next("open");
      console.log("[signalk] connection OK");
      this.subscribe(paths);
    };

    this.socket.onclose = () => {
      this.connection$.next("closed");
      console.warn("[signalk] connection closed");
    };

    this.socket.onerror = () => {
      this.connection$.next("error");
      console.error("[signalk] connection ERROR");
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private subscribe(paths: SignalKPath[]): void {
    if (!this.socket) {
      return;
    }

    const message = {
      context: "vessels.self",
      subscribe: paths.map((path) => ({
        path,
        period: 1000,
      })),
    };

    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(raw: string | Blob): void {
    if (typeof raw !== "string") {
      return;
    }

    let message: SignalKDeltaMessage | null = null;

    try {
      message = JSON.parse(raw) as SignalKDeltaMessage;
    } catch {
      return;
    }

    if (!message || !Array.isArray(message.updates)) {
      return;
    }

    message.updates.forEach((update) => {
      const timestamp = update.timestamp ?? new Date().toISOString();
      if (!Array.isArray(update.values)) {
        return;
      }

      update.values.forEach((value) => {
        if (!this.knownPaths.has(value.path)) {
          return;
        }

        const path = value.path as SignalKPath;
        const coerced = this.coerceValue(path, value.value);
        if (!coerced) {
          return;
        }

        const point: TelemetryPoint = {
          path,
          value: coerced,
          timestamp,
          source: update.source,
          quality: QualityFlag.Good,
        };

        this.store.setPoint(point);
      });
    });
  }

  private coerceValue(path: SignalKPath, value: unknown): TelemetryValue | null {
    if (path === PATHS.navigation.position) {
      return isPosition(value) ? value : null;
    }

    return isNumber(value) ? value : null;
  }

  private toWebSocketUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/signalk/v1/stream";
    url.search = "";
    return url.toString();
  }

  private baseUrl(): string {
    return environment.baseUrl.endsWith("/") ? environment.baseUrl : `${environment.baseUrl}/`;
  }
}
