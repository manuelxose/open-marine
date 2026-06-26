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

  // TRACK route (bench): legs from `trackStart` → `waypoint`, auto-advancing
  // through `route` once within `arrivalRadiusM`.
  private waypoint: { lat: number; lon: number } | null = null;
  private trackStart: { lat: number; lon: number } | null = null;
  private routeOrigin: { lat: number; lon: number } | null = null;
  private route: { lat: number; lon: number }[] = [];
  private routeIndex = 0;
  private arrivalRadiusM = 30;
  private routeComplete = false;

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

  // --- TRACK waypoint (bench) ---

  /** Activate a straight one-leg track from the current position to a destination. */
  activateWaypoint(destLat: number, destLon: number): void {
    this.activateRoute([{ lat: destLat, lon: destLon }]);
  }

  /** Activate a waypoint defined as a bearing + distance (nm) from the current position. */
  activateWaypointByBearing(bearingDeg: number, distanceNm: number): void {
    this.activateRouteByLegs([{ bearingDeg, distanceNm }]);
  }

  /** Activate a multi-waypoint route; the boat auto-advances through it. */
  activateRoute(points: { lat: number; lon: number }[], arrivalRadiusM = 30): void {
    this.route = points.slice();
    this.routeIndex = 0;
    this.arrivalRadiusM = arrivalRadiusM;
    this.routeComplete = points.length === 0;
    this.routeOrigin = { lat: this.state.lat, lon: this.state.lon };
    this.trackStart = { ...this.routeOrigin };
    this.waypoint = points[0] ?? null;
  }

  /** Activate a route from sequential relative legs (each a bearing + distance in nm). */
  activateRouteByLegs(legs: { bearingDeg: number; distanceNm: number }[], arrivalRadiusM = 30): void {
    const points: { lat: number; lon: number }[] = [];
    let lat = this.state.lat;
    let lon = this.state.lon;
    for (const leg of legs) {
      const distM = leg.distanceNm * 1852;
      const brg = leg.bearingDeg * DEG;
      lat += (distM * Math.cos(brg)) / METERS_PER_DEG_LAT;
      lon += (distM * Math.sin(brg)) / (METERS_PER_DEG_LAT * Math.cos(lat * DEG));
      points.push({ lat, lon });
    }
    this.activateRoute(points, arrivalRadiusM);
  }

  hasWaypoint(): boolean {
    return this.waypoint !== null;
  }

  getDistanceToWaypointM(): number | undefined {
    if (!this.waypoint) {
      return undefined;
    }
    return this.distanceM(this.state.lat, this.state.lon, this.waypoint.lat, this.waypoint.lon);
  }

  /** 1-based index of the active leg (0 when no route). */
  getRouteLeg(): number {
    return this.waypoint ? this.routeIndex + 1 : 0;
  }

  getRouteLength(): number {
    return this.route.length;
  }

  isRouteComplete(): boolean {
    return this.routeComplete;
  }

  /** All route waypoints (absolute lat/lon). Empty when no route is active. */
  getRoutePoints(): ReadonlyArray<{ lat: number; lon: number }> {
    return this.route;
  }

  /** The position where the route was activated (stable, does not change on leg advance). */
  getRouteOrigin(): Readonly<{ lat: number; lon: number }> | null {
    return this.routeOrigin;
  }

  /** Bearing from the current position to the active waypoint, degrees true. */
  getBearingToWaypointDeg(): number | undefined {
    if (!this.waypoint) {
      return undefined;
    }
    return this.bearingDeg(this.state.lat, this.state.lon, this.waypoint.lat, this.waypoint.lon);
  }

  /** Signed cross-track error in metres (positive = starboard of the track). */
  getXteMeters(): number | undefined {
    if (!this.waypoint || !this.trackStart) {
      return undefined;
    }
    const brgStartToDest = this.bearingDeg(
      this.trackStart.lat,
      this.trackStart.lon,
      this.waypoint.lat,
      this.waypoint.lon,
    );
    const brgStartToBoat = this.bearingDeg(
      this.trackStart.lat,
      this.trackStart.lon,
      this.state.lat,
      this.state.lon,
    );
    const distStartToBoatM = this.distanceM(
      this.trackStart.lat,
      this.trackStart.lon,
      this.state.lat,
      this.state.lon,
    );
    const angle = wrapTo180(brgStartToBoat - brgStartToDest) * DEG;
    return distStartToBoatM * Math.sin(angle);
  }

  private bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const meanLat = ((lat1 + lat2) / 2) * DEG;
    const dEast = (lon2 - lon1) * Math.cos(meanLat);
    const dNorth = lat2 - lat1;
    return wrapTo360((Math.atan2(dEast, dNorth) / DEG + 360) % 360);
  }

  private distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const meanLat = ((lat1 + lat2) / 2) * DEG;
    const dNorthM = (lat2 - lat1) * METERS_PER_DEG_LAT;
    const dEastM = (lon2 - lon1) * METERS_PER_DEG_LAT * Math.cos(meanLat);
    return Math.hypot(dNorthM, dEastM);
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

    this.advanceRouteIfArrived();
    this.recomputeWind();
  }

  /** Auto-advance to the next route leg once within the arrival radius. */
  private advanceRouteIfArrived(): void {
    if (!this.waypoint) {
      return;
    }
    const dist = this.distanceM(this.state.lat, this.state.lon, this.waypoint.lat, this.waypoint.lon);
    if (dist > this.arrivalRadiusM) {
      return;
    }
    // The reached waypoint becomes the start of the next leg.
    this.trackStart = { ...this.waypoint };
    this.routeIndex += 1;
    if (this.routeIndex < this.route.length) {
      this.waypoint = this.route[this.routeIndex] ?? null;
    } else {
      this.waypoint = null;
      this.routeComplete = true;
    }
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
