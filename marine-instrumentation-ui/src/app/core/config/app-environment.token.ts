import { InjectionToken } from '@angular/core';

export interface AppEnvironment {
  signalKBaseUrl: string; // e.g. 'http://localhost:3000/signalk/v1'
  signalKWsUrl: string; // e.g. 'ws://localhost:3000/signalk/v1/stream'
  // marine-autopilot-engine command API base, e.g. 'http://192.168.1.43:3990'.
  // Engine serves the Signal K v2 autopilot routes (mode/engage/disengage/target).
  autopilotApiUrl: string;
  // Isolated marine-simulation-platform orchestrator. Never points at production ports.
  testBenchApiUrl: string;
  // Local/LAN nautical chart engine for legal local chart sources.
  chartEngineApiUrl: string;
}

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

// Raspberry Pi running Signal K + GPS/IMU/AIS sensors, see docs/RASPBERRY_CONNECTION.md
const RASPBERRY_LAN_HOST = '192.168.1.43';
const SIGNALK_HOST_OVERRIDE_KEY = 'omi.signalKHost';

function resolveSignalKHost(): string {
  const override = resolveSignalKHostOverride();
  if (override) return override;

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return RASPBERRY_LAN_HOST;
    }
    return hostname;
  }

  return RASPBERRY_LAN_HOST;
}

function resolveSignalKHostOverride(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const queryOverride = params.get('signalKHost') ?? params.get('signalkHost');
    if (queryOverride) {
      const normalized = queryOverride.trim();
      if (normalized === 'auto') {
        window.localStorage.removeItem(SIGNALK_HOST_OVERRIDE_KEY);
        return null;
      }
      window.localStorage.setItem(SIGNALK_HOST_OVERRIDE_KEY, normalized);
      return normalized;
    }

    return window.localStorage.getItem(SIGNALK_HOST_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

function resolveProtocols(): { httpProtocol: 'http' | 'https'; wsProtocol: 'ws' | 'wss' } {
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    return { httpProtocol: 'https', wsProtocol: 'wss' };
  }

  return { httpProtocol: 'http', wsProtocol: 'ws' };
}

const signalKHost = resolveSignalKHost();
const testBenchHost =
  typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : RASPBERRY_LAN_HOST;
const { httpProtocol, wsProtocol } = resolveProtocols();

const AUTOPILOT_API_PORT = 3990;
const TEST_BENCH_API_PORT = 4100;
const CHART_ENGINE_API_PORT = 8088;

export const environment: AppEnvironment = {
  signalKBaseUrl: `${httpProtocol}://${signalKHost}:3000/signalk/v1/api`,
  signalKWsUrl: `${wsProtocol}://${signalKHost}:3000/signalk/v1/stream?subscribe=all`,
  autopilotApiUrl: `${httpProtocol}://${signalKHost}:${AUTOPILOT_API_PORT}`,
  testBenchApiUrl: `${httpProtocol}://${testBenchHost}:${TEST_BENCH_API_PORT}`,
  chartEngineApiUrl: `${httpProtocol}://${testBenchHost}:${CHART_ENGINE_API_PORT}`,
};
