import { getConfig } from "./config.js";
import { Logger } from "./app/logger.js";
import { Engine } from "./engine.js";
import { CommandApi } from "./app/command-api.js";
import type { MotorController, SensorSource } from "./types.js";
import { SignalKSensorSource } from "./signalk/signalk-sensor-source.js";
import { SimWorld } from "./sim/sim-world.js";
import { SimMotor } from "./actuators/backends/sim-backend.js";
import { SimSensorSource } from "./sim/sim-sensor-source.js";
import { SerialMotor } from "./actuators/backends/serial-backend.js";
import { GpioMotor } from "./actuators/backends/gpio-backend.js";
import { CanMotor } from "./actuators/backends/can-backend.js";

const log = new Logger("autopilot", process.env.AP_LOG_LEVEL === "debug" ? "debug" : "info");

const main = async (): Promise<void> => {
  const config = getConfig();
  log.info(`starting autopilot engine (motor=${config.motorBackend}, sensors=${config.sensorBackend})`);

  let sensors: SensorSource;
  let motor: MotorController;
  const simWorld = config.motorBackend === "sim" || config.sensorBackend === "sim"
    ? new SimWorld({
        startLat: config.simStartLat,
        startLon: config.simStartLon,
        cruiseSpeedKt: config.simCruiseSpeedKt,
        trueWindDirDeg: config.simTrueWindDirDeg,
        trueWindSpeedKt: config.simTrueWindSpeedKt,
      })
    : undefined;

  // Optional bench TRACK target: a multi-leg route "brg:distNm,…" (preferred) or a
  // single waypoint at a fixed bearing/distance from the start.
  if (simWorld) {
    const legs = parseRouteLegs(config.simRoute);
    if (legs.length > 0) {
      simWorld.activateRouteByLegs(legs);
      log.info(`bench route: ${legs.length} legs`);
    } else if (config.simWaypointDistanceNm > 0) {
      simWorld.activateWaypointByBearing(config.simWaypointBearingDeg, config.simWaypointDistanceNm);
    }
  }

  if (config.motorBackend === "sim") {
    motor = new SimMotor(simWorld!, log.child("sim-motor"));
  } else if (config.motorBackend === "serial") {
    motor = new SerialMotor({ port: config.serialPort, baud: config.serialBaud }, log.child("serial"));
  } else if (config.motorBackend === "gpio") {
    motor = new GpioMotor(log.child("gpio"));
  } else {
    motor = new CanMotor(log.child("can"));
  }

  if (config.sensorBackend === "sim") {
    sensors = new SimSensorSource(simWorld!);
  } else {
    sensors = new SignalKSensorSource(config.signalKWsUrl, log);
  }

  // Only publish synthetic navigation when the configured sensor source itself
  // is simulated. A simulated motor with Signal K sensors is a safe live-data mode.
  const engine = new Engine(
    config,
    sensors,
    motor,
    log,
    config.sensorBackend === "sim" ? simWorld : undefined,
  );
  const api = new CommandApi(config.apiPort, engine, log.child("api"));

  await engine.start();
  await api.start();

  const shutdown = (signal: string): void => {
    log.info(`${signal} received — shutting down (motor OFF)`);
    void (async () => {
      await api.stop();
      await engine.stop();
      process.exit(0);
    })();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

/** Parse a bench route spec "brg:distNm,brg:distNm,…" into relative legs. */
const parseRouteLegs = (spec: string): { bearingDeg: number; distanceNm: number }[] => {
  if (!spec.trim()) {
    return [];
  }
  const legs: { bearingDeg: number; distanceNm: number }[] = [];
  for (const part of spec.split(",")) {
    const [b, d] = part.split(":");
    const bearingDeg = Number(b);
    const distanceNm = Number(d);
    if (Number.isFinite(bearingDeg) && Number.isFinite(distanceNm) && distanceNm > 0) {
      legs.push({ bearingDeg, distanceNm });
    }
  }
  return legs;
};

main().catch((error) => {
  log.error("fatal startup error", error);
  process.exit(1);
});
