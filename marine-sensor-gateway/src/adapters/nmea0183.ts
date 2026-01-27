import type { Timestamp } from "@omi/marine-data-contract";
import type { SensorAdapter, Unsubscribe } from "./base.js";

export type Nmea0183Parity = "none" | "even" | "odd";

export interface Nmea0183PortConfig {
  port: string;
  baudRate: number;
  dataBits?: 7 | 8;
  parity?: Nmea0183Parity;
  stopBits?: 1 | 2;
}

export interface Nmea0183Sentence {
  raw: string;
  talkerId: string;
  sentenceId: string;
  fields: string[];
  checksum?: string;
  timestamp: Timestamp;
}

export interface Nmea0183Adapter extends SensorAdapter {
  type: "nmea0183";
  config: Nmea0183PortConfig;
  onSentence(listener: (sentence: Nmea0183Sentence) => void): Unsubscribe;
}
