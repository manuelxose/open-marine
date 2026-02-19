export type AisForwardMode = "udp" | "tcp";

export interface AisConfig {
  rtlAisPath: string;
  deviceIndex: number;
  ppm: number;
  gain: number;
  edgeTuning: boolean;
  forwardMode: AisForwardMode;
  signalKHost: string;
  signalKPort: number;
  logNmea: boolean;
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = parseNumber(value, fallback);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const parseForwardMode = (value: string | undefined): AisForwardMode => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "tcp" || normalized === "udp") return normalized;
  return "udp";
};

export const loadAisConfig = (env: NodeJS.ProcessEnv = process.env): AisConfig => {
  return {
    rtlAisPath: env.AIS_RTL_AIS_PATH?.trim() || "rtl_ais.exe",
    deviceIndex: parseInteger(env.AIS_DEVICE_INDEX, 1),
    ppm: parseInteger(env.AIS_PPM, -8),
    gain: parseNumber(env.AIS_GAIN, 49),
    edgeTuning: parseBoolean(env.AIS_EDGE_TUNING, false),
    forwardMode: parseForwardMode(env.AIS_FORWARD_MODE),
    signalKHost: env.AIS_SIGNAL_K_HOST?.trim() || "127.0.0.1",
    signalKPort: parseInteger(env.AIS_SIGNAL_K_PORT, 10110),
    logNmea: parseBoolean(env.AIS_LOG_NMEA, false),
  };
};
