import type { PidConfig } from "./control/pid-controller.js";

export type MotorBackendKind = "sim" | "serial" | "gpio" | "can";

export interface EngineConfig {
  /** Motor driver backend. `sim` runs the bench boat model; `serial` talks to the microcontroller. */
  motorBackend: MotorBackendKind;
  /** Serial device for the `serial` backend (UART to the microcontroller). */
  serialPort: string;
  serialBaud: number;
  /** Signal K WebSocket stream URL (sensor input). */
  signalKWsUrl: string;
  /** Signal K HTTP base URL (delta publishing). */
  signalKHttpUrl: string;
  /** Port for the autopilot command API the UI talks to. */
  apiPort: number;
  /** Main control loop rate. */
  loopHz: number;
  /** Watchdog timeout: if a tick is missed for longer than this, the motor is cut. */
  watchdogTimeoutMs: number;

  pid: PidConfig;

  /** Hard rudder limit, degrees. */
  rudderLimitDeg: number;
  /** Minimum drive (0..1) to overcome static friction; below this the motor idles. */
  pwmMin: number;
  /** Maximum drive (0..1) to avoid aggressive helm movements. */
  pwmMax: number;
  /** Motor overcurrent cutoff, amps. */
  currentLimitA: number;
  /** Battery low-voltage cutoff, volts. */
  voltageCutoff: number;

  /** Bench-only: fixed true wind used by the boat model when backend = sim. */
  simTrueWindDirDeg: number;
  simTrueWindSpeedKt: number;
  /** Bench-only: starting position and cruising speed. */
  simStartLat: number;
  simStartLon: number;
  simCruiseSpeedKt: number;
}

const num = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const str = (key: string, fallback: string): string => {
  const raw = process.env[key];
  return raw === undefined || raw.trim() === "" ? fallback : raw;
};

const backend = (key: string, fallback: MotorBackendKind): MotorBackendKind => {
  const raw = process.env[key];
  if (raw === "sim" || raw === "serial" || raw === "gpio" || raw === "can") {
    return raw;
  }
  return fallback;
};

/** Build the engine configuration from environment variables (see config/omi.env). */
export const getConfig = (): EngineConfig => ({
  motorBackend: backend("AP_MOTOR_BACKEND", "sim"),
  serialPort: str("AP_SERIAL_PORT", "/dev/ttyAMA0"),
  serialBaud: num("AP_SERIAL_BAUD", 115200),
  signalKWsUrl: str("AP_SK_WS_URL", "ws://127.0.0.1:3000/signalk/v1/stream"),
  signalKHttpUrl: str("AP_SK_HTTP_URL", "http://127.0.0.1:3000"),
  apiPort: num("AP_API_PORT", 3990),
  loopHz: num("AP_LOOP_HZ", 10),
  watchdogTimeoutMs: num("AP_WATCHDOG_TIMEOUT_MS", 1000),
  pid: {
    kp: num("AP_PID_KP", 1.2),
    ki: num("AP_PID_KI", 0.05),
    kd: num("AP_PID_KD", 8),
    deadband: num("AP_DEADBAND_DEG", 1),
    integralLimit: num("AP_PID_INTEGRAL_LIMIT", 15),
    outputMin: -num("AP_RUDDER_LIMIT_DEG", 35),
    outputMax: num("AP_RUDDER_LIMIT_DEG", 35),
  },
  rudderLimitDeg: num("AP_RUDDER_LIMIT_DEG", 35),
  pwmMin: num("AP_PWM_MIN", 0.15),
  pwmMax: num("AP_PWM_MAX", 1),
  currentLimitA: num("AP_CURRENT_LIMIT_A", 10),
  voltageCutoff: num("AP_VOLTAGE_CUTOFF", 11.5),
  simTrueWindDirDeg: num("AP_SIM_TWD_DEG", 45),
  simTrueWindSpeedKt: num("AP_SIM_TWS_KT", 12),
  simStartLat: num("AP_SIM_START_LAT", 43.46),
  simStartLon: num("AP_SIM_START_LON", -3.8),
  simCruiseSpeedKt: num("AP_SIM_CRUISE_KT", 5),
});
