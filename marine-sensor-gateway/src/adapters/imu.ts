import type { Attitude, Timestamp, Vector3 } from "@omi/marine-data-contract";
import type { SensorAdapter, Unsubscribe } from "./base.js";

export type ImuModel = "icm20948" | "mpu9250" | "mpu9255" | "bno055";

export interface ImuConfig {
  model: ImuModel;
  i2cBus: number;
  i2cAddress: number;
  rateHz: number;
  signalkUrl: string;
  fusionEnabled: boolean;
}

export interface ImuRawReading {
  accelerometer: Vector3;
  gyroscope: Vector3;
  magnetometer: Vector3;
  timestamp: Timestamp;
}

export interface ImuOrientation {
  headingMagnetic: number;
  roll: Attitude["roll"];
  pitch: Attitude["pitch"];
}

export interface ImuDataPacket {
  raw: ImuRawReading;
  orientation?: ImuOrientation;
}

export interface ImuAdapter extends SensorAdapter {
  type: "imu";
  config: ImuConfig;
  onReading(listener: (reading: ImuDataPacket) => void): Unsubscribe;
}
