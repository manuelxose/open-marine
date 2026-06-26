import { PATHS, radToDeg, metersPerSecondToKnots } from "@omi/marine-data-contract";
import type { SensorSnapshot, SensorSource } from "../types.js";
import type { Logger } from "../app/logger.js";
import { SignalKSubscriber } from "./sk-subscriber.js";
import { SENSOR_TIMEOUTS, readBool, readNumber } from "../sensors/sensor-base.js";

/** Custom path the IO board / microcontroller publishes for the e-stop line. */
const EMERGENCY_STOP_PATH = "steering.autopilot.emergencyStop";

const SUBSCRIBED_PATHS: string[] = [
  PATHS.navigation.headingTrue,
  PATHS.navigation.headingMagnetic,
  PATHS.navigation.magneticVariation,
  PATHS.environment.wind.angleApparent,
  PATHS.environment.wind.speedApparent,
  PATHS.navigation.courseOverGroundTrue,
  PATHS.navigation.speedOverGround,
  PATHS.navigation.courseGreatCircle.crossTrackError,
  PATHS.navigation.courseGreatCircle.nextPoint.bearingTrue,
  PATHS.navigation.courseGreatCircle.nextPoint.distance,
  PATHS.steering.rudderAngle,
  PATHS.steering.autopilot.drive.motorCurrent,
  PATHS.electrical.batteries.house.voltage,
  EMERGENCY_STOP_PATH,
];

/**
 * Builds a {@link SensorSnapshot} from live Signal K data, converting SI units
 * (radians, m/s) to the engine's internal degrees/knots and applying per-sensor
 * staleness budgets so lost feeds surface as invalid.
 */
export class SignalKSensorSource implements SensorSource {
  private readonly sub: SignalKSubscriber;

  constructor(wsUrl: string, log: Logger) {
    this.sub = new SignalKSubscriber(wsUrl, SUBSCRIBED_PATHS, log.child("sk-sub"));
  }

  async start(): Promise<void> {
    await this.sub.start();
  }

  async stop(): Promise<void> {
    await this.sub.stop();
  }

  read(nowMs: number): SensorSnapshot {
    const headingTrueRad = readNumber(this.sub.get(PATHS.navigation.headingTrue));
    const headingMagneticRad = readNumber(this.sub.get(PATHS.navigation.headingMagnetic));
    const magneticVariationRad =
      readNumber(this.sub.get(PATHS.navigation.magneticVariation)) ?? 0;
    const awaRad = readNumber(this.sub.get(PATHS.environment.wind.angleApparent));
    const awsMs = readNumber(this.sub.get(PATHS.environment.wind.speedApparent));
    const cogRad = readNumber(this.sub.get(PATHS.navigation.courseOverGroundTrue));
    const sogMs = readNumber(this.sub.get(PATHS.navigation.speedOverGround));
    const xte = readNumber(this.sub.get(PATHS.navigation.courseGreatCircle.crossTrackError));
    const brgRad = readNumber(
      this.sub.get(PATHS.navigation.courseGreatCircle.nextPoint.bearingTrue),
    );
    const wpDistance = readNumber(
      this.sub.get(PATHS.navigation.courseGreatCircle.nextPoint.distance),
    );
    const rudderRad = readNumber(this.sub.get(PATHS.steering.rudderAngle));
    const currentA = readNumber(this.sub.get(PATHS.steering.autopilot.drive.motorCurrent));
    const voltage = readNumber(this.sub.get(PATHS.electrical.batteries.house.voltage));

    const fresh = (path: string, budget: number): boolean =>
      this.sub.isFresh(path, nowMs, budget);
    const trueHeadingFresh =
      headingTrueRad !== undefined
      && fresh(PATHS.navigation.headingTrue, SENSOR_TIMEOUTS.heading);
    const magneticHeadingFresh =
      headingMagneticRad !== undefined
      && fresh(PATHS.navigation.headingMagnetic, SENSOR_TIMEOUTS.heading);
    const headingRad = trueHeadingFresh
      ? headingTrueRad
      : magneticHeadingFresh
        ? headingMagneticRad + magneticVariationRad
        : undefined;

    return {
      nowMs,
      headingTrueDeg: headingRad === undefined ? undefined : radToDeg(headingRad),
      headingValid: headingRad !== undefined,
      awaDeg: awaRad === undefined ? undefined : radToDeg(awaRad),
      awsKt: awsMs === undefined ? undefined : metersPerSecondToKnots(awsMs),
      windValid:
        awaRad !== undefined && fresh(PATHS.environment.wind.angleApparent, SENSOR_TIMEOUTS.wind),
      cogDeg: cogRad === undefined ? undefined : radToDeg(cogRad),
      sogKt: sogMs === undefined ? undefined : metersPerSecondToKnots(sogMs),
      positionValid:
        sogMs !== undefined && fresh(PATHS.navigation.speedOverGround, SENSOR_TIMEOUTS.position),
      xteMeters: xte,
      bearingToWaypointDeg: brgRad === undefined ? undefined : radToDeg(brgRad),
      distanceToWaypointMeters: wpDistance,
      rudderAngleDeg: rudderRad === undefined ? undefined : radToDeg(rudderRad),
      rudderValid:
        rudderRad !== undefined && fresh(PATHS.steering.rudderAngle, SENSOR_TIMEOUTS.rudder),
      motorCurrentA: currentA,
      batteryVoltage: voltage,
      emergencyStop: readBool(this.sub.get(EMERGENCY_STOP_PATH)),
    };
  }
}
