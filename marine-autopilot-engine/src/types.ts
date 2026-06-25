/**
 * Engine-internal data shapes. All angles here are in DEGREES and speeds in
 * KNOTS; conversion to Signal K SI units (radians, m/s) happens only at the
 * Signal K publisher/subscriber boundary.
 */

/**
 * A consistent snapshot of every input the control + safety layers need,
 * produced once per tick by a {@link SensorSource}. Fields are required but may
 * be `undefined` when a sensor has no value, with a paired `*Valid` flag that
 * also accounts for staleness.
 */
export interface SensorSnapshot {
  nowMs: number;

  headingTrueDeg: number | undefined;
  headingValid: boolean;

  /** Apparent wind angle, degrees (-180..180, positive = starboard). */
  awaDeg: number | undefined;
  /** Apparent wind speed, knots. */
  awsKt: number | undefined;
  windValid: boolean;

  cogDeg: number | undefined;
  sogKt: number | undefined;
  positionValid: boolean;
  /** Cross-track error in metres (positive = starboard of track). */
  xteMeters: number | undefined;
  bearingToWaypointDeg: number | undefined;

  rudderAngleDeg: number | undefined;
  rudderValid: boolean;

  motorCurrentA: number | undefined;
  batteryVoltage: number | undefined;

  /** Hardware emergency-stop asserted (motor must be off). */
  emergencyStop: boolean;
}

/** Produces a {@link SensorSnapshot} each tick (Signal K-backed or simulated). */
export interface SensorSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  read(nowMs: number): SensorSnapshot;
}

export interface MotorFeedback {
  rudderAngleDeg: number | undefined;
  motorCurrentA: number | undefined;
  enabled: boolean;
  clutch: boolean;
}

/**
 * Abstraction over the power stage. Implementations: `sim` (bench boat model),
 * `serial` (UART to microcontroller), `gpio`, `can`. The engine never drives
 * the motor directly — it only sets a desired rudder angle and pulses a
 * heartbeat; each backend maps that to PWM/direction/enable on its transport.
 */
export interface MotorController {
  init(): Promise<void>;
  /** Engage the drive (driver enable + clutch). */
  enable(): Promise<void>;
  /** Disable the drive: PWM 0, driver disable, clutch released, relay cut. */
  disable(): Promise<void>;
  /** Set the desired rudder angle in degrees (positive = starboard). */
  command(rudderDemandDeg: number): void;
  /** Liveness pulse; backends with a hardware failsafe cut power without it. */
  heartbeat(nowMs: number): void;
  getFeedback(): MotorFeedback;
  shutdown(): Promise<void>;
}
