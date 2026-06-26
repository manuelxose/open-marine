import { InjectionToken } from '@angular/core';

export interface AppEnvironment {
  signalKBaseUrl: string; // e.g. 'http://localhost:3000/signalk/v1'
  signalKWsUrl: string; // e.g. 'ws://localhost:3000/signalk/v1/stream'
  // marine-autopilot-engine command API base, e.g. 'http://192.168.1.43:3990'.
  // Engine serves the Signal K v2 autopilot routes (mode/engage/disengage/target).
  autopilotApiUrl: string;
  // Isolated marine-test-bench orchestrator. Never points at production ports.
  testBenchApiUrl: string;
}

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

// Raspberry Pi running Signal K + GPS/IMU/AIS sensors, see docs/RASPBERRY_CONNECTION.md
const RASPBERRY_LAN_HOST = '192.168.1.43';

function resolveSignalKHost(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return RASPBERRY_LAN_HOST;
    }
    return hostname;
  }

  return RASPBERRY_LAN_HOST;
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

export const environment: AppEnvironment = {
  signalKBaseUrl: `${httpProtocol}://${signalKHost}:3000/signalk/v1/api`,
  signalKWsUrl: `${wsProtocol}://${signalKHost}:3000/signalk/v1/stream?subscribe=all`,
  autopilotApiUrl: `${httpProtocol}://${signalKHost}:${AUTOPILOT_API_PORT}`,
  testBenchApiUrl: `${httpProtocol}://${testBenchHost}:${TEST_BENCH_API_PORT}`,
};
