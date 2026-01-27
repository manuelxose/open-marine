import type { Timestamp } from "@omi/marine-data-contract";

export type AdapterState = "disconnected" | "connecting" | "connected" | "error";

export interface AdapterStatus {
  state: AdapterState;
  lastChange: Timestamp;
  lastError?: string;
}

export type Unsubscribe = () => void;

export interface SensorAdapter {
  id: string;
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onStatus(listener: (status: AdapterStatus) => void): Unsubscribe;
}
