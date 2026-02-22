import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Attitude, DataPoint, Vector3 } from "@omi/marine-data-contract";
import { PATHS } from "@omi/marine-data-contract";
import type {
  ImuDataPacket,
  ImuOrientation,
  ImuRawReading,
} from "../adapters/imu.js";
import type { GpsFix } from "../adapters/gps.js";
import { SignalKHttpPublisher } from "../publishers/signalkPublisher.js";

interface CapturedFetchCall {
  url: string;
  init?: RequestInit;
}

interface DeltaValue {
  path: string;
  value: unknown;
}

interface DeltaMessage {
  context: string;
  updates: Array<{
    timestamp: string;
    source: { label: string; src: string; type: string };
    values: DeltaValue[];
  }>;
}

const approxEqual = (actual: number, expected: number, epsilon = 1e-9): void => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be close to ${expected} (epsilon ${epsilon})`,
  );
};

const toUrl = (input: Parameters<typeof fetch>[0]): string => {
  if (input instanceof URL) {
    return input.toString();
  }
  if (input instanceof Request) {
    return input.url;
  }
  return String(input);
};

const parseDeltaBody = (body: BodyInit | null | undefined): DeltaMessage => {
  if (typeof body !== "string") {
    throw new Error("Expected request body to be a JSON string");
  }
  return JSON.parse(body) as DeltaMessage;
};

test("IMU packet types accept expected shape", () => {
  const raw: ImuRawReading = {
    accelerometer: { x: 0.12, y: -0.03, z: 9.79 },
    gyroscope: { x: 0.01, y: -0.02, z: 0.005 },
    magnetometer: { x: 22.1, y: -14.4, z: 41.0 },
    timestamp: "2026-02-22T12:00:00.000Z",
  };

  const orientation: ImuOrientation = {
    headingMagnetic: 1.57,
    roll: 0.04,
    pitch: -0.03,
  };

  const packet: ImuDataPacket = {
    raw,
    orientation,
  };

  assert.equal(packet.raw.timestamp, "2026-02-22T12:00:00.000Z");
  assert.equal(packet.orientation?.headingMagnetic, 1.57);
});

test("IMU unit conversions remain consistent with contract conventions", () => {
  const gToMetersPerSecondSquared = (g: number): number => g * 9.80665;
  const degreesPerSecondToRadiansPerSecond = (degPerSec: number): number =>
    (degPerSec * Math.PI) / 180;

  approxEqual(gToMetersPerSecondSquared(1), 9.80665);
  approxEqual(gToMetersPerSecondSquared(-0.5), -4.903325);

  approxEqual(degreesPerSecondToRadiansPerSecond(180), Math.PI);
  approxEqual(degreesPerSecondToRadiansPerSecond(90), Math.PI / 2);
});

test("IMU Signal K paths map to the shared contract", () => {
  assert.equal(PATHS.navigation.headingMagnetic, "navigation.headingMagnetic");
  assert.equal(PATHS.navigation.attitude, "navigation.attitude");
  assert.equal(PATHS.sensors.imu.accelerometer, "sensors.imu.accelerometer");
  assert.equal(PATHS.sensors.imu.gyroscope, "sensors.imu.gyroscope");
  assert.equal(PATHS.sensors.imu.magnetometer, "sensors.imu.magnetometer");
});

test("GPS fix types accept expected shape", () => {
  const fix: GpsFix = {
    timestamp: "2026-02-22T12:00:00.000Z",
    latitude: 40.4168,
    longitude: -3.7038,
    altitude: 667.2,
    speedOverGround: 1.2,
    courseOverGround: 0.85,
    magneticVariation: -0.03,
    fixType: "3d",
    satellitesUsed: 10,
    satellitesInView: 15,
    hdop: 0.9,
  };

  assert.equal(fix.fixType, "3d");
  assert.equal(fix.satellitesUsed, 10);
  assert.equal(fix.latitude, 40.4168);
});

test("GPS unit conversions remain consistent with contract conventions", () => {
  const knotsToMetersPerSecond = (knots: number): number => knots * 0.514444;
  const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const applyMagVariationSign = (degrees: number, direction: "E" | "W"): number =>
    direction === "W" ? -Math.abs(degreesToRadians(degrees)) : Math.abs(degreesToRadians(degrees));

  approxEqual(knotsToMetersPerSecond(1), 0.514444);
  approxEqual(knotsToMetersPerSecond(12.5), 6.43055);

  approxEqual(degreesToRadians(180), Math.PI);
  approxEqual(degreesToRadians(54.7), 0.9546951008408984, 1e-12);

  approxEqual(applyMagVariationSign(2.03, "E"), degreesToRadians(2.03), 1e-12);
  approxEqual(applyMagVariationSign(2.03, "W"), -degreesToRadians(2.03), 1e-12);
});

test("GPS Signal K paths map to the shared contract", () => {
  assert.equal(PATHS.navigation.position, "navigation.position");
  assert.equal(PATHS.navigation.speedOverGround, "navigation.speedOverGround");
  assert.equal(
    PATHS.navigation.courseOverGroundTrue,
    "navigation.courseOverGroundTrue",
  );
  assert.equal(PATHS.navigation.magneticVariation, "navigation.magneticVariation");
  assert.equal(PATHS.navigation.datetime, "navigation.datetime");
  assert.equal(PATHS.sensors.gps.fix, "sensors.gps.fix");
  assert.equal(
    PATHS.sensors.gps.satellitesInView,
    "sensors.gps.satellitesInView",
  );
  assert.equal(
    PATHS.sensors.gps.horizontalDilution,
    "sensors.gps.horizontalDilution",
  );
});

test("SignalKHttpPublisher builds grouped delta messages for IMU points", async () => {
  const calls: CapturedFetchCall[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const call: CapturedFetchCall = {
      url: toUrl(input),
      ...(init ? { init } : {}),
    };
    calls.push(call);
    return new Response("", { status: 200 });
  }) as typeof fetch;

  try {
    const publisher = new SignalKHttpPublisher({
      baseUrl: "http://localhost:3000",
      source: "icm20948",
      sourceType: "I2C",
      sourceLabel: "MacArthur HAT ICM-20948",
    });

    await publisher.connect();

    const timestamp = "2026-02-22T12:00:00.000Z";
    const points: Array<DataPoint<number | Attitude | Vector3>> = [
      {
        path: PATHS.navigation.headingMagnetic,
        value: 1.2,
        timestamp,
      },
      {
        context: "self",
        path: PATHS.navigation.attitude,
        value: { roll: 0.1, pitch: -0.2, yaw: 1.2 },
        timestamp,
      },
      {
        context: "vessels.urn:mrn:imo:mmsi:123456789",
        path: PATHS.sensors.imu.accelerometer,
        value: { x: 0.0, y: 0.1, z: 9.8 },
        timestamp,
      },
    ];

    await publisher.publish(points);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 3);

  const [connectCall, selfDeltaCall, vesselDeltaCall] = calls;
  assert.ok(connectCall);
  assert.ok(selfDeltaCall);
  assert.ok(vesselDeltaCall);

  assert.equal(connectCall.url, "http://localhost:3000/signalk/v1/api/");
  assert.equal(connectCall.init, undefined);

  assert.equal(selfDeltaCall.url, "http://localhost:3000/signalk/v1/api/");
  assert.equal(selfDeltaCall.init?.method, "POST");
  const selfDelta = parseDeltaBody(selfDeltaCall.init?.body);
  assert.equal(selfDelta.context, "vessels.self");
  assert.equal(selfDelta.updates.length, 1);
  assert.equal(selfDelta.updates[0]?.source.label, "MacArthur HAT ICM-20948");
  assert.equal(selfDelta.updates[0]?.source.src, "icm20948");
  assert.equal(selfDelta.updates[0]?.source.type, "I2C");

  const selfPaths = (selfDelta.updates[0]?.values ?? []).map((value) => value.path);
  assert.ok(selfPaths.includes(PATHS.navigation.headingMagnetic));
  assert.ok(selfPaths.includes(PATHS.navigation.attitude));

  assert.equal(vesselDeltaCall.url, "http://localhost:3000/signalk/v1/api/");
  assert.equal(vesselDeltaCall.init?.method, "POST");
  const vesselDelta = parseDeltaBody(vesselDeltaCall.init?.body);
  assert.equal(vesselDelta.context, "vessels.urn:mrn:imo:mmsi:123456789");
  assert.equal(vesselDelta.updates.length, 1);
  const vesselPaths = (vesselDelta.updates[0]?.values ?? []).map((value) => value.path);
  assert.deepEqual(vesselPaths, [PATHS.sensors.imu.accelerometer]);
});
