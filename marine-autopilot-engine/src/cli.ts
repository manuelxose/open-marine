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
  log.info(`starting autopilot engine (backend=${config.motorBackend})`);

  let sensors: SensorSource;
  let motor: MotorController;
  let benchWorld: SimWorld | undefined;

  if (config.motorBackend === "sim") {
    // Bench mode: shared simulated world drives both the motor feedback and the
    // sensor snapshot, closing the loop without hardware.
    benchWorld = new SimWorld({
      startLat: config.simStartLat,
      startLon: config.simStartLon,
      cruiseSpeedKt: config.simCruiseSpeedKt,
      trueWindDirDeg: config.simTrueWindDirDeg,
      trueWindSpeedKt: config.simTrueWindSpeedKt,
    });
    motor = new SimMotor(benchWorld, log.child("sim-motor"));
    sensors = new SimSensorSource(benchWorld);
  } else {
    sensors = new SignalKSensorSource(config.signalKWsUrl, log);
    if (config.motorBackend === "serial") {
      motor = new SerialMotor({ port: config.serialPort, baud: config.serialBaud }, log.child("serial"));
    } else if (config.motorBackend === "gpio") {
      motor = new GpioMotor(log.child("gpio"));
    } else {
      motor = new CanMotor(log.child("can"));
    }
  }

  const engine = new Engine(config, sensors, motor, log, benchWorld);
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

main().catch((error) => {
  log.error("fatal startup error", error);
  process.exit(1);
});
