import type { Timestamp } from "@omi/marine-data-contract";
import type { SensorAdapter, Unsubscribe } from "./base.js";

export type Nmea2000Interface = "socketcan" | "pcan" | "usbcan" | "native";

export interface Nmea2000Config {
  interface: Nmea2000Interface;
  channel: string;
  bitrate: number;
}

export interface Nmea2000Frame {
  pgn: number;
  source: number;
  destination?: number;
  priority: number;
  data: Uint8Array;
  timestamp: Timestamp;
}

export interface Nmea2000Adapter extends SensorAdapter {
  type: "nmea2000";
  config: Nmea2000Config;
  onFrame(listener: (frame: Nmea2000Frame) => void): Unsubscribe;
}
