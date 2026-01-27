import type { Timestamp } from "@omi/marine-data-contract";
import type { SensorAdapter, Unsubscribe } from "./base.js";

export type SerialParity = "none" | "even" | "odd";
export type SerialFraming = "line" | "binary";

export interface CustomSerialConfig {
  port: string;
  baudRate: number;
  dataBits?: 7 | 8;
  parity?: SerialParity;
  stopBits?: 1 | 2;
  framing?: SerialFraming;
  lineDelimiter?: string;
}

export interface CustomSerialFrame {
  payload: Uint8Array;
  text?: string;
  timestamp: Timestamp;
}

export interface CustomSerialAdapter extends SensorAdapter {
  type: "custom-serial";
  config: CustomSerialConfig;
  onFrame(listener: (frame: CustomSerialFrame) => void): Unsubscribe;
}
