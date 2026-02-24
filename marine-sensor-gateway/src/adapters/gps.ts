import type { GpsFixType, Timestamp } from "@omi/marine-data-contract";
import type { SensorAdapter, Unsubscribe } from "./base.js";

export type GpsChipset = "ublox" | "sirf" | "mtk" | "unknown";

export interface GpsConfig {
  port: string;
  baudRate: number;
  chipset: GpsChipset;
  signalkUrl: string;
  rateHz: number;
}

export interface GpsFix {
  timestamp: Timestamp;
  latitude: number;
  longitude: number;
  altitude?: number;
  speedOverGround: number;
  courseOverGround: number;
  magneticVariation?: number;
  fixType: GpsFixType;
  satellitesUsed: number;
  satellitesInView?: number;
  hdop?: number;
}

export interface GpsAdapter extends SensorAdapter {
  type: "gps";
  config: GpsConfig;
  onFix(listener: (fix: GpsFix) => void): Unsubscribe;
}
