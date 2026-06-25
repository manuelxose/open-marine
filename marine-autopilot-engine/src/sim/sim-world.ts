import { wrapTo180, wrapTo360, clamp } from "../control/angle-utils.js";

const KT_TO_MS = 0.514444;
const METERS_PER_DEG_LAT = 111_320;
const DEG = Math.PI / 180;

export interface SimWorldConfig {
  startLat: number;
  startLon: number;
  cruiseSpeedKt: number;
  trueWindDirDeg: number;
  trueWindSpeedKt: number;
  /** Max rudder slew rate, deg/s. */
  rudderSlewDegPerSec: number;
  /** Turn-rate gain: deg/s of yaw per deg of rudder at cruise speed. */
  turnGain: number;
  /** Physics step rate. */
  stepHz: number;
}

const DEFAULTS: Omit<SimWorldConfig, "startLat" | "startLon"> = {
  cruiseSpeedKt: 5,
  trueWindDirDeg: 45,
  trueWindSpeedKt: 12,
  rudderSlewDegPerSec: 30,
  turnGain: 0.12,
  stepHz: 20,
};

export interface BoatState {
  headingDeg: number;
  lat: number;
  lon: number;
  sogKt: number;
  cogDeg: number;
  rudderAngleDeg: number;
  awaDeg: number;
  awsKt: number;
  motorCurrentA: number;
}

/**
 * Closed-loop bench: a minimal sailboat dynamics model the autopilot can steer.
 * The motor backend writes a rudder demand; the model slews the rudder, turns
 * the boat (yaw ∝ rudder·speed), advances the position and derives apparent
 * wind from a fixed true wind. Runs on its own timer so the boat evolves in
 * real time independent of the control-loop rate.
 *
 * Fault injectors (battery voltage, e-stop, current bias) let bench scenarios
 * exercise the safety layer.
 */
export class SimWorld {
  private readonly cfg: SimWorldConfig;
  private state: BoatState;

  private rudderDemandDeg = 0;
  private driveEnabled = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastStepMs = Date.now();

  // Fault injection (bench scenarios)
  private batteryVoltage = 13.2;
  private emergencyStop = false;
  private currentBiasA = 0;

  constructor(config: Partial<SimWorldConfig> & { startLat: number; startLon: number }) {
    this.cfg = { ...DEFAULTS, ...config };
    this.state = {
      headingDeg: 0,
      lat: this.cfg.startLat,
      lon: this.cfg.startLon,
      sogKt: this.cfg.cruiseSpeedKt,
      cogDeg: 0,
      rudderAngleDeg: 0,
      awaDeg: 0,
      awsKt: 0,
      motorCurrentA: 0,
    };
    this.recomputeWind();
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.lastStepMs = Date.now();
    const intervalMs = Math.max(20, Math.floor(1000 / this.cfg.stepHz));
    this.timer = setInterval(() => this.step(), intervalMs);
    if (typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setRudderDemand(deg: number): void {
    this.rudderDemandDeg = deg;
  }

  setDriveEnabled(enabled: boolean): void {
    this.driveEnabled = enabled;
  }

  getState(): Readonly<BoatState> {
    return this.state;
  }

  // --- Fault injection (bench) ---
  setBatteryVoltage(v: number): void {
    this.batteryVoltage = v;
  }
  getBatteryVoltage(): number {
    return this.batteryVoltage;
  }
  setEmergencyStop(active: boolean): void {
    this.emergencyStop = active;
  }
  isEmergencyStop(): boolean {
    return this.emergencyStop;
  }
  setCurrentBias(a: number): void {
    this.currentBiasA = a;
  }

  /** Advance physics. Public so tests can step deterministically. */
  step(dtSecondsOverride?: number): void {
    const now = Date.now();
    const dt = dtSecondsOverride ?? Math.min(0.5, (now - this.lastStepMs) / 1000);
    this.lastStepMs = now;
    if (dt <= 0) {
      return;
    }

    const s = this.state;

    // Rudder slews toward the demand only when the drive is engaged.
    const demand = this.driveEnabled ? this.rudderDemandDeg : 0;
    const maxSlew = this.cfg.rudderSlewDegPerSec * dt;
    const rudderDelta = clamp(demand - s.rudderAngleDeg, -maxSlew, maxSlew);
    const rudderRate = Math.abs(rudderDelta) / dt;
    s.rudderAngleDeg += rudderDelta;

    // Yaw from rudder, scaled by speed (no steerage way at rest).
    const speedFactor = s.sogKt / Math.max(0.1, this.cfg.cruiseSpeedKt);
    const turnRateDegPerSec = this.cfg.turnGain * s.rudderAngleDeg * speedFactor;
    s.headingDeg = wrapTo360(s.headingDeg + turnRateDegPerSec * dt);
    s.cogDeg = s.headingDeg; // bench ignores leeway/current

    // Position integration (equirectangular, adequate for short bench runs).
    const speedMs = s.sogKt * KT_TO_MS;
    const hdgRad = s.headingDeg * DEG;
    const dNorthM = speedMs * dt * Math.cos(hdgRad);
    const dEastM = speedMs * dt * Math.sin(hdgRad);
    s.lat += dNorthM / METERS_PER_DEG_LAT;
    s.lon += dEastM / (METERS_PER_DEG_LAT * Math.cos(s.lat * DEG));

    // Motor current: idle when off, otherwise base + slew + load terms.
    s.motorCurrentA = this.driveEnabled
      ? 0.6 + 0.15 * rudderRate + 0.02 * Math.abs(s.rudderAngleDeg) + this.currentBiasA
      : 0;

    this.recomputeWind();
  }

  private recomputeWind(): void {
    const s = this.state;
    const twd = this.cfg.trueWindDirDeg * DEG;
    const tws = this.cfg.trueWindSpeedKt;
    const hdg = s.headingDeg * DEG;

    // Wind blows FROM twd → its velocity vector points toward twd+180.
    const twx = -tws * Math.sin(twd);
    const twy = -tws * Math.cos(twd);
    // Boat velocity vector (toward heading).
    const bvx = s.sogKt * Math.sin(hdg);
    const bvy = s.sogKt * Math.cos(hdg);
    // Apparent wind velocity relative to the boat.
    const awx = twx - bvx;
    const awy = twy - bvy;

    s.awsKt = Math.hypot(awx, awy);
    // Direction the apparent wind comes FROM, earth frame.
    const awFromDeg = (Math.atan2(-awx, -awy) / DEG + 360) % 360;
    s.awaDeg = wrapTo180(awFromDeg - s.headingDeg);
  }
}
