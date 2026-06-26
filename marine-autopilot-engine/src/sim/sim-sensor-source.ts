import type { SensorSnapshot, SensorSource } from "../types.js";
import type { SimWorld } from "./sim-world.js";

/**
 * Sensor source backed by the {@link SimWorld}. Used on the bench so the engine
 * reads the simulated boat's heading/wind/position instead of real Signal K
 * sensors, closing the loop without hardware.
 */
export class SimSensorSource implements SensorSource {
  constructor(private readonly world: SimWorld) {}

  async start(): Promise<void> {
    this.world.start();
  }

  async stop(): Promise<void> {
    this.world.stop();
  }

  read(nowMs: number): SensorSnapshot {
    const s = this.world.getState();
    return {
      nowMs,
      headingTrueDeg: s.headingDeg,
      headingValid: true,
      awaDeg: s.awaDeg,
      awsKt: s.awsKt,
      windValid: true,
      cogDeg: s.cogDeg,
      sogKt: s.sogKt,
      positionValid: true,
      xteMeters: this.world.getXteMeters(),
      bearingToWaypointDeg: this.world.getBearingToWaypointDeg(),
      distanceToWaypointMeters: this.world.getDistanceToWaypointM(),
      rudderAngleDeg: s.rudderAngleDeg,
      rudderValid: true,
      motorCurrentA: s.motorCurrentA,
      batteryVoltage: this.world.getBatteryVoltage(),
      emergencyStop: this.world.isEmergencyStop(),
    };
  }
}
