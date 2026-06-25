import {
  PATHS,
  degToRad,
  radToDeg,
  knotsToMetersPerSecond,
  type AutopilotMode,
  type AutopilotStatus,
} from "@omi/marine-data-contract";
import type { EngineConfig } from "./config.js";
import type { Logger } from "./app/logger.js";
import type { MotorController, SensorSnapshot, SensorSource } from "./types.js";
import { StateMachine, type EngageResult } from "./app/state-machine.js";
import { HeadingController } from "./control/heading-controller.js";
import { WindController } from "./control/wind-controller.js";
import { TrackController } from "./control/track-controller.js";
import { shortestAngleDiff } from "./control/angle-utils.js";
import { evaluateFaults } from "./safety/fault-manager.js";
import { clampRudder } from "./safety/limits.js";
import { Watchdog } from "./safety/watchdog.js";
import { Relay } from "./actuators/relay.js";
import { Alarm } from "./actuators/alarm.js";
import { SignalKPublisher, type SkValue } from "./signalk/sk-publisher.js";
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
  private readonly watchdog: Watchdog;
  private readonly log: Logger;

  private loopTimer: ReturnType<typeof setInterval> | null = null;
  private lastTickMs = Date.now();
  private tickCount = 0;
  private lastSnapshot: SensorSnapshot | null = null;
  private motorEnabled = false;
  private wasEngaged = false;
  private commandedRudderDeg = 0;

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
    this.watchdog = new Watchdog(config.watchdogTimeoutMs, () => this.onWatchdogTimeout());
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

    const snapshot = this.sensors.read(now);
    this.lastSnapshot = snapshot;

    this.applySafety(snapshot);
    this.runControl(snapshot, dt);

    this.motor.heartbeat(now);

    this.tickCount += 1;
    const publishEvery = Math.max(1, Math.floor(this.config.loopHz / 5));
    if (this.tickCount % publishEvery === 0) {
      await this.publishState(snapshot);
    }
  }

  private applySafety(snapshot: SensorSnapshot): void {
    const evaluation = evaluateFaults(snapshot, this.sm.getState(), {
      rudderLimitDeg: this.config.rudderLimitDeg,
      currentLimitA: this.config.currentLimitA,
      voltageCutoff: this.config.voltageCutoff,
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
      return;
    }

    if (!this.wasEngaged) {
      this.enableDrive();
      this.heading.reset();
      this.wind.reset();
      this.track.reset();
      this.wasEngaged = true;
    }

    const { rudder, error } = this.computeRudder(state, snapshot, dt);
    this.commandedRudderDeg = clampRudder(rudder, this.config.rudderLimitDeg);
    this.motor.command(this.commandedRudderDeg);

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
      this.wind.evaluateHazards(awa, snapshot.awsKt ?? 0);
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
      this.sm.updateTrackHeading(demanded);
      return {
        rudder: this.track.computeRudder(inputs, dt),
        error: shortestAngleDiff(demanded, heading),
      };
    }

    return this.holdHeading(snapshot, dt);
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
    this.sm.clearFault();
    this.alarm.clear("fault");
  }

  getStatus(): AutopilotStatus {
    return this.sm.getStatus();
  }
}
