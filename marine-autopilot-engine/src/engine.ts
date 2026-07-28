import {
  PATHS,
  degToRad,
  radToDeg,
  knotsToMetersPerSecond,
  type AutopilotMode,
  type AutopilotStatus,
  type AutopilotWindHazard,
  type SimulationBenchResetRequest,
} from "@omi/marine-data-contract";
import type { EngineConfig } from "./config.js";
import type { Logger } from "./app/logger.js";
import type { AutopilotTuning, MotorController, SensorSnapshot, SensorSource } from "./types.js";
import { StateMachine, type EngageResult } from "./app/state-machine.js";
import type { PidConfig } from "./control/pid-controller.js";
import { HeadingController } from "./control/heading-controller.js";
import { WindController, type WindHazard } from "./control/wind-controller.js";
import { TrackController, applySailingLimit } from "./control/track-controller.js";
import { shortestAngleDiff } from "./control/angle-utils.js";
import { evaluateFaults } from "./safety/fault-manager.js";
import { clampRudder } from "./safety/limits.js";
import { Watchdog } from "./safety/watchdog.js";
import { Relay } from "./actuators/relay.js";
import { Alarm } from "./actuators/alarm.js";
import { SignalKPublisher, type SkValue } from "./signalk/sk-publisher.js";
import { SignalKCourseClient, RouteAdvanceLatch } from "./signalk/sk-course.js";
import type { SimWorld } from "./sim/sim-world.js";
import type { AutopilotCommands } from "./app/command-api.js";

const OFF_COURSE_DEG = 10;

/**
 * Map the engine's descriptive states to the Signal K-conventional autopilot
 * state strings the UI consumes (heading→auto, track→route).
 */
const publishedState = (state: AutopilotStatus["state"]): string => {
  switch (state) {
    case "heading":
      return "auto";
    case "track":
      return "route";
    default:
      return state;
  }
};

/**
 * The autopilot brain. Runs a fixed-rate loop: read a sensor snapshot → apply
 * the mandatory safety rules → run the active controller → command the motor →
 * publish status to Signal K. Boots in STANDBY with the motor disabled and only
 * enables the drive while engaged and fault-free.
 */
export class Engine implements AutopilotCommands {
  private readonly sm = new StateMachine();
  private readonly heading: HeadingController;
  private readonly wind: WindController;
  private readonly track: TrackController;
  private readonly relay: Relay;
  private readonly alarm: Alarm;
  private readonly publisher: SignalKPublisher;
  private readonly course: SignalKCourseClient;
  private readonly arrivalLatch = new RouteAdvanceLatch();
  private readonly watchdog: Watchdog;
  private readonly log: Logger;

  private loopTimer: ReturnType<typeof setInterval> | null = null;
  private lastTickMs = Date.now();
  private tickCount = 0;
  private lastSnapshot: SensorSnapshot | null = null;
  private motorEnabled = false;
  private wasEngaged = false;
  private commandedRudderDeg = 0;

  /** Live, runtime-tunable parameters (seeded from config, mutable via the API). */
  private tuning: AutopilotTuning;
  /** Software E-stop (UI button), OR'd with the hardware line into the snapshot. */
  private apiEstop = false;
  /** Dock-side jog test: drives the helm directly while STANDBY (bypasses control). */
  private driveTestUntilMs = 0;
  private driveTestCmd = { rudderDeg: 0, drive: 0 };

  /** WIND-mode hazard, held for a few seconds after detection so the helmsman sees it. */
  private windHazard: AutopilotWindHazard = "none";
  private windHazardUntilMs = 0;
  private static readonly WIND_HAZARD_HOLD_MS = 5000;

  /** TRACK sailing-limit active: the route bearing is inside the no-go zone. */
  private noGo = false;

  /** Live-mode leg counter: incremented each time the latch fires. */
  private liveLeg = 0;

  constructor(
    private readonly config: EngineConfig,
    private readonly sensors: SensorSource,
    private readonly motor: MotorController,
    log: Logger,
    private readonly benchWorld?: SimWorld,
  ) {
    this.log = log.child("engine");
    this.heading = new HeadingController(config.pid);
    this.wind = new WindController(config.pid);
    this.track = new TrackController(config.pid);
    this.relay = new Relay(this.log.child("relay"));
    this.alarm = new Alarm(this.log.child("alarm"));
    this.publisher = new SignalKPublisher(config.signalKHttpUrl, this.log.child("publish"));
    this.course = new SignalKCourseClient(config.signalKHttpUrl, this.log.child("course"));
    this.watchdog = new Watchdog(config.watchdogTimeoutMs, () => this.onWatchdogTimeout());
    this.tuning = {
      kp: config.pid.kp,
      ki: config.pid.ki,
      kd: config.pid.kd,
      deadbandDeg: config.pid.deadband,
      rudderLimitDeg: config.rudderLimitDeg,
      pwmMin: config.pwmMin,
      pwmMax: config.pwmMax,
      currentLimitA: config.currentLimitA,
      voltageCutoff: config.voltageCutoff,
    };
  }

  private pidFromTuning(): PidConfig {
    const limit = this.tuning.rudderLimitDeg;
    return {
      kp: this.tuning.kp,
      ki: this.tuning.ki,
      kd: this.tuning.kd,
      deadband: this.tuning.deadbandDeg,
      integralLimit: this.config.pid.integralLimit,
      outputMin: -limit,
      outputMax: limit,
    };
  }

  async start(): Promise<void> {
    await this.motor.init();
    await this.motor.disable(); // never live at boot
    await this.sensors.start();
    this.watchdog.start();

    const intervalMs = Math.max(20, Math.floor(1000 / this.config.loopHz));
    this.lastTickMs = Date.now();
    this.loopTimer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.log.info(`engine started in STANDBY @ ${this.config.loopHz} Hz`);
  }

  async stop(): Promise<void> {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.watchdog.stop();
    await this.motor.disable();
    await this.motor.shutdown();
    await this.sensors.stop();
  }

  // --- Main loop ---

  private async tick(): Promise<void> {
    const now = Date.now();
    const dt = Math.min(1, (now - this.lastTickMs) / 1000);
    this.lastTickMs = now;
    this.watchdog.kick();

    const raw = this.sensors.read(now);
    const feedback = this.motor.getFeedback();
    const snapshot = this.mergeFeedback(raw, feedback);
    this.lastSnapshot = snapshot;

    // Microcontroller-reported fault is a hard stop.
    if (feedback.fault && this.sm.getState() !== "fault") {
      this.log.error(`drive fault from microcontroller: ${feedback.fault}`);
      this.sm.raiseFault("drive-blocked");
      this.alarm.raise("fault");
    }

    this.applySafety(snapshot);

    // Dock-side jog test bypasses normal control while STANDBY and fault-free.
    if (now < this.driveTestUntilMs && this.sm.getState() === "standby") {
      this.enableDrive();
      this.motor.command(this.driveTestCmd);
    } else {
      if (this.driveTestUntilMs > 0) {
        this.driveTestUntilMs = 0;
        this.disableDrive();
      }
      this.runControl(snapshot, dt);
    }

    this.maybeAdvanceRoute(snapshot);

    this.motor.heartbeat(now);

    this.tickCount += 1;
    const publishEvery = Math.max(1, Math.floor(this.config.loopHz / 5));
    if (this.tickCount % publishEvery === 0) {
      await this.publishState(snapshot);
    }
  }

  /**
   * Live route sequencing: when engaged in TRACK against a real Signal K course,
   * request the next route point on arrival. The bench advances its own route, so
   * this only runs with real sensors (no benchWorld).
   */
  private maybeAdvanceRoute(snapshot: SensorSnapshot): void {
    if (this.benchWorld || this.sm.getState() !== "track") {
      this.arrivalLatch.reset();
      this.liveLeg = 0;
      return;
    }
    if (this.arrivalLatch.shouldAdvance(snapshot.distanceToWaypointMeters, this.config.arrivalRadiusM)) {
      this.liveLeg += 1;
      this.log.info(`waypoint reached (leg ${this.liveLeg}) — advancing route`);
      void this.course.advanceToNextPoint();
    }
  }

  /** Fill rudder/current from motor telemetry when no sensor provides them, and OR the software E-stop. */
  private mergeFeedback(
    snapshot: SensorSnapshot,
    feedback: { rudderAngleDeg: number | undefined; motorCurrentA: number | undefined },
  ): SensorSnapshot {
    return {
      ...snapshot,
      rudderAngleDeg: snapshot.rudderAngleDeg ?? feedback.rudderAngleDeg,
      motorCurrentA: snapshot.motorCurrentA ?? feedback.motorCurrentA,
      emergencyStop: snapshot.emergencyStop || this.apiEstop,
    };
  }

  private applySafety(snapshot: SensorSnapshot): void {
    const evaluation = evaluateFaults(snapshot, this.sm.getState(), {
      rudderLimitDeg: this.tuning.rudderLimitDeg,
      currentLimitA: this.tuning.currentLimitA,
      voltageCutoff: this.tuning.voltageCutoff,
    });

    if (evaluation.action === "fault") {
      if (this.sm.getState() !== "fault") {
        this.log.warn(`FAULT: ${evaluation.reason}`);
        this.sm.raiseFault(evaluation.reason);
        this.alarm.raise("fault");
      }
    } else if (evaluation.action === "demote" && evaluation.demoteTo) {
      this.log.warn(`demote → ${evaluation.demoteTo} (${evaluation.reason})`);
      this.sm.demote(evaluation.demoteTo);
    }
  }

  private runControl(snapshot: SensorSnapshot, dt: number): void {
    const state = this.sm.getState();
    const engaged = state === "heading" || state === "wind" || state === "track";

    if (!engaged) {
      if (this.wasEngaged) {
        this.disableDrive();
      }
      this.wasEngaged = false;
      this.commandedRudderDeg = 0;
      this.alarm.clear("off-course");
      this.setNoGo(false);
      return;
    }

    if (!this.wasEngaged) {
      this.enableDrive();
      this.heading.reset();
      this.wind.reset();
      this.track.reset();
      this.wasEngaged = true;
    }

    if (state !== "wind") {
      this.clearWindHazard();
    }
    if (state !== "track") {
      this.setNoGo(false);
    }

    const { rudder, error } = this.computeRudder(state, snapshot, dt);
    this.commandedRudderDeg = clampRudder(rudder, this.tuning.rudderLimitDeg);
    const normalizedDrive = this.commandedRudderDeg / this.tuning.rudderLimitDeg;
    const driveMagnitude = Math.abs(normalizedDrive) < 1e-6
      ? 0
      : Math.min(
          this.tuning.pwmMax,
          Math.max(this.tuning.pwmMin, Math.abs(normalizedDrive)),
        );
    this.motor.command({
      rudderDeg: this.commandedRudderDeg,
      drive: Math.sign(normalizedDrive) * driveMagnitude,
    });

    if (error !== undefined && Math.abs(error) > OFF_COURSE_DEG) {
      this.alarm.raise("off-course");
    } else {
      this.alarm.clear("off-course");
    }
  }

  private computeRudder(
    state: string,
    snapshot: SensorSnapshot,
    dt: number,
  ): { rudder: number; error: number | undefined } {
    if (state === "wind") {
      const target = this.sm.getTargetWindAngleDeg();
      const awa = snapshot.awaDeg;
      if (target === undefined || awa === undefined) {
        return { rudder: 0, error: undefined };
      }
      const hazards = this.wind.evaluateHazards(awa, snapshot.awsKt ?? 0);
      this.applyWindHazards(hazards);
      // The control law naturally counter-steers back to the set wind angle, so
      // an accidental tack/gybe is opposed automatically; here we only surface
      // the alarm + hazard state for the helmsman.
      return { rudder: this.wind.computeRudder(target, awa, dt), error: shortestAngleDiff(target, awa) };
    }

    if (state === "track") {
      const heading = snapshot.headingTrueDeg;
      const brg = snapshot.bearingToWaypointDeg;
      const xte = snapshot.xteMeters;
      if (heading === undefined || brg === undefined || xte === undefined) {
        // Insufficient route data: hold heading toward last target instead.
        return this.holdHeading(snapshot, dt);
      }
      const inputs = { xteMeters: xte, bearingToWaypointDeg: brg, headingDeg: heading };
      const demanded = this.track.demandedHeading(inputs);

      // Sailing-limit guard: never steer a route bearing that points inside the
      // no-go zone; clamp to the closest sailable heading and alarm.
      let steered = demanded;
      let limited = false;
      if (snapshot.windValid && snapshot.awaDeg !== undefined) {
        const limit = applySailingLimit(demanded, heading, snapshot.awaDeg, this.config.tackAngleDeg);
        steered = limit.headingDeg;
        limited = limit.limited;
      }
      this.setNoGo(limited);

      this.sm.updateTrackHeading(steered);
      return {
        rudder: this.track.computeRudderToHeading(steered, heading, dt),
        error: shortestAngleDiff(steered, heading),
      };
    }

    return this.holdHeading(snapshot, dt);
  }

  /** Map detector output to a held hazard state + alarm (gybe > tack > gust). */
  private applyWindHazards(h: WindHazard): void {
    const now = Date.now();
    let detected: AutopilotWindHazard = "none";
    if (h.accidentalGybe) {
      detected = "accidental-gybe";
    } else if (h.accidentalTack) {
      detected = "accidental-tack";
    } else if (h.gust) {
      detected = "gust";
    }

    if (detected !== "none") {
      this.windHazard = detected;
      this.windHazardUntilMs = now + Engine.WIND_HAZARD_HOLD_MS;
      this.alarm.raise(detected === "gust" ? "gust" : detected === "accidental-gybe" ? "gybe" : "tack");
      this.log.warn(`wind hazard: ${detected}`);
    } else if (this.windHazard !== "none" && now > this.windHazardUntilMs) {
      this.clearWindHazard();
    }
  }

  private clearWindHazard(): void {
    if (this.windHazard === "none") {
      return;
    }
    this.windHazard = "none";
    this.windHazardUntilMs = 0;
    this.alarm.clear("gust");
    this.alarm.clear("tack");
    this.alarm.clear("gybe");
  }

  private setNoGo(active: boolean): void {
    if (this.noGo === active) {
      return;
    }
    this.noGo = active;
    if (active) {
      this.alarm.raise("no-go");
    } else {
      this.alarm.clear("no-go");
    }
  }

  private holdHeading(snapshot: SensorSnapshot, dt: number): { rudder: number; error: number | undefined } {
    const target = this.sm.getTargetHeadingDeg();
    const heading = snapshot.headingTrueDeg;
    if (target === undefined || heading === undefined) {
      return { rudder: 0, error: undefined };
    }
    return {
      rudder: this.heading.computeRudder(target, heading, dt),
      error: shortestAngleDiff(target, heading),
    };
  }

  private enableDrive(): void {
    if (this.motorEnabled) {
      return;
    }
    this.motorEnabled = true;
    this.relay.close();
    this.motor.enable().catch((err) => this.log.error("motor enable failed", err));
  }

  private disableDrive(): void {
    if (!this.motorEnabled) {
      return;
    }
    this.motorEnabled = false;
    this.motor.disable().catch((err) => this.log.error("motor disable failed", err));
    this.relay.open();
  }

  private onWatchdogTimeout(): void {
    this.log.error("watchdog timeout — cutting motor");
    this.sm.raiseFault("watchdog-timeout");
    this.alarm.raise("fault");
    this.disableDrive();
  }

  // --- Publishing ---

  private async publishState(snapshot: SensorSnapshot): Promise<void> {
    const status = this.sm.getStatus();
    const feedback = this.motor.getFeedback();
    const rudderActualDeg = snapshot.rudderAngleDeg ?? feedback.rudderAngleDeg;
    const motorCurrentA = snapshot.motorCurrentA ?? feedback.motorCurrentA;

    const values: SkValue[] = [
      { path: PATHS.steering.autopilot.state, value: publishedState(status.state) },
      { path: PATHS.steering.autopilot.mode, value: status.mode },
      { path: PATHS.steering.autopilot.engaged, value: status.engaged },
      { path: PATHS.steering.autopilot.fault, value: status.fault },
      { path: PATHS.steering.autopilot.target.rudderAngle, value: degToRad(this.commandedRudderDeg) },
      { path: PATHS.steering.autopilot.drive.enabled, value: feedback.enabled },
      { path: PATHS.steering.autopilot.windHazard, value: this.windHazard },
      { path: PATHS.steering.autopilot.noGo, value: this.noGo },
    ];

    if (status.targetHeadingTrue !== undefined) {
      values.push({
        path: PATHS.steering.autopilot.target.headingTrue,
        value: degToRad(status.targetHeadingTrue),
      });
    }
    if (status.targetWindAngleApparent !== undefined) {
      values.push({
        path: PATHS.steering.autopilot.target.windAngleApparent,
        value: degToRad(status.targetWindAngleApparent),
      });
    }
    if (rudderActualDeg !== undefined) {
      values.push({ path: PATHS.steering.rudderAngle, value: degToRad(rudderActualDeg) });
    }
    if (motorCurrentA !== undefined) {
      values.push({ path: PATHS.steering.autopilot.drive.motorCurrent, value: motorCurrentA });
    }

    // On the bench, publish the simulated boat state so the UI/map move.
    if (this.benchWorld) {
      const b = this.benchWorld.getState();
      values.push(
        { path: PATHS.navigation.headingTrue, value: degToRad(b.headingDeg) },
        { path: PATHS.navigation.courseOverGroundTrue, value: degToRad(b.cogDeg) },
        { path: PATHS.navigation.speedOverGround, value: knotsToMetersPerSecond(b.sogKt) },
        { path: PATHS.environment.wind.angleApparent, value: degToRad(b.awaDeg) },
        { path: PATHS.environment.wind.speedApparent, value: knotsToMetersPerSecond(b.awsKt) },
        { path: PATHS.electrical.batteries.house.voltage, value: this.benchWorld.getBatteryVoltage() },
        { path: PATHS.navigation.position, value: { latitude: b.lat, longitude: b.lon } },
      );
      // Publish the bench route's active-leg XTE/bearing/distance so TRACK has a
      // course to follow without a real Signal K Course API.
      const brg = this.benchWorld.getBearingToWaypointDeg();
      const xte = this.benchWorld.getXteMeters();
      const dist = this.benchWorld.getDistanceToWaypointM();
      if (brg !== undefined) {
        values.push({ path: PATHS.navigation.courseGreatCircle.nextPoint.bearingTrue, value: degToRad(brg) });
      }
      if (xte !== undefined) {
        values.push({ path: PATHS.navigation.courseGreatCircle.crossTrackError, value: xte });
      }
      if (dist !== undefined) {
        values.push({ path: PATHS.navigation.courseGreatCircle.nextPoint.distance, value: dist });
      }
      // Bench route geometry + progress — UI renders these as a route overlay on the map.
      const routePoints = this.benchWorld.getRoutePoints();
      const origin = this.benchWorld.getRouteOrigin();
      if (routePoints.length > 0 && origin) {
        const waypoints = [origin, ...routePoints].map((p) => ({
          latitude: p.lat,
          longitude: p.lon,
        }));
        values.push(
          { path: PATHS.steering.autopilot.route.waypoints, value: waypoints },
          { path: PATHS.steering.autopilot.route.activeLeg, value: this.benchWorld.getRouteLeg() },
          { path: PATHS.steering.autopilot.route.length, value: this.benchWorld.getRouteLength() },
          { path: PATHS.steering.autopilot.route.complete, value: this.benchWorld.isRouteComplete() },
        );
      }
    }

    // Live-mode route leg counter (bench publishes its own above).
    if (!this.benchWorld && this.sm.getState() === "track" && this.liveLeg > 0) {
      values.push({ path: PATHS.steering.autopilot.route.activeLeg, value: this.liveLeg });
    }

    await this.publisher.publish(values);
  }

  // --- AutopilotCommands (driven by the HTTP API) ---

  setMode(mode: AutopilotMode): void {
    this.sm.setMode(mode);
  }

  engage(): EngageResult {
    if (!this.lastSnapshot) {
      return { ok: false, reason: "no sensor data yet" };
    }
    const result = this.sm.engage(this.lastSnapshot);
    if (result.ok) {
      this.log.info(`engaged: ${this.sm.getState()}`);
    }
    return result;
  }

  disengage(): void {
    this.sm.disengage();
  }

  setTargetRad(rad: number): void {
    const deg = radToDeg(rad);
    if (this.sm.getEffectiveMode() === "wind") {
      this.sm.setTargetWindAngleDeg(deg);
    } else {
      this.sm.setTargetHeadingDeg(deg);
    }
  }

  dodgeRad(rad: number): void {
    this.sm.dodge(radToDeg(rad));
  }

  clearFault(): void {
    this.apiEstop = false;
    this.sm.clearFault();
    this.alarm.clear("fault");
  }

  getStatus(): AutopilotStatus {
    return this.sm.getStatus();
  }

  getTuning(): AutopilotTuning {
    return { ...this.tuning };
  }

  /** Apply runtime calibration. Accepts a partial; unknown/invalid fields are ignored. */
  setTuning(partial: Partial<AutopilotTuning>): AutopilotTuning {
    const next = { ...this.tuning };
    for (const key of Object.keys(next) as (keyof AutopilotTuning)[]) {
      const value = partial[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        next[key] = value;
      }
    }
    // Keep limits sane.
    next.rudderLimitDeg = Math.max(1, Math.min(90, next.rudderLimitDeg));
    next.pwmMin = Math.max(0, Math.min(1, next.pwmMin));
    next.pwmMax = Math.max(next.pwmMin, Math.min(1, next.pwmMax));
    this.tuning = next;

    const pid = this.pidFromTuning();
    this.heading.setConfig(pid);
    this.wind.setConfig(pid);
    this.track.setConfig(pid);
    this.log.info("tuning updated", this.tuning);
    return { ...this.tuning };
  }

  /** Software emergency stop: latched motor cut until the fault is cleared. */
  emergencyStop(): void {
    this.apiEstop = true;
    this.log.error("software E-stop asserted");
  }

  /**
   * Dock-side jog test: briefly drive the helm to one side. Allowed only in
   * STANDBY; the safety layer still runs, so it aborts on any fault.
   */
  driveTest(side: "port" | "stbd", seconds: number): EngageResult {
    if (this.sm.getState() !== "standby") {
      return { ok: false, reason: "drive test only allowed in STANDBY" };
    }
    const dir = side === "stbd" ? 1 : -1;
    const dur = Math.max(0.2, Math.min(10, seconds));
    this.driveTestCmd = {
      rudderDeg: dir * this.tuning.rudderLimitDeg * 0.5,
      drive: dir * Math.max(this.tuning.pwmMin, 0.3),
    };
    this.driveTestUntilMs = Date.now() + dur * 1000;
    this.log.info(`drive test ${side} for ${dur}s`);
    return { ok: true };
  }

  resetSimulation(request: SimulationBenchResetRequest): EngageResult {
    if (this.config.motorBackend !== "sim" || !this.benchWorld) {
      return { ok: false, reason: "simulation reset requires AP_MOTOR_BACKEND=sim" };
    }
    this.sm.disengage();
    this.disableDrive();
    this.commandedRudderDeg = 0;
    this.apiEstop = false;
    this.clearWindHazard();
    this.setNoGo(false);
    this.benchWorld.reset({
      origin: request.origin,
      cruiseSpeedKt: request.cruiseSpeedKt,
      trueWindDirDeg: request.trueWindDirDeg,
      trueWindSpeedKt: request.trueWindSpeedKt,
      currentSetDeg: request.currentSetDeg,
      currentDriftKt: request.currentDriftKt,
      routeLegs: request.routeLegs,
      waypoint: request.waypoint,
    });
    this.log.info("simulation world reset", request);
    return { ok: true };
  }
}
