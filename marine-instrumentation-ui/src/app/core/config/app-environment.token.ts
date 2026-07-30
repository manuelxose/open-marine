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
  // Forecast endpoint exposed by the local chart engine.
  weatherApiUrl: string;
}

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

// Raspberry Pi running Signal K + GPS/IMU/AIS sensors, see docs/RASPBERRY_CONNECTION.md
const RASPBERRY_LAN_HOST = '192.168.1.43';
const AUTOPILOT_API_PORT = 3990;
const TEST_BENCH_API_PORT = 4100;
const CHART_ENGINE_API_PORT = 8088;

/** localStorage key for manual user override (query param or settings UI). */
const SIGNALK_HOST_OVERRIDE_KEY = 'omi.signalKHost';

/** localStorage key for a simulator/test-bench host that differs from Signal K. */
const TEST_BENCH_HOST_OVERRIDE_KEY = 'omi.testBenchHost';

/** localStorage key written by SignalKHostDetectorService after auto-detection. */
const AUTO_DETECTED_KEY = 'omi.autoDetectedHost';

/**
 * Build an {@link AppEnvironment} for a specific Signal K host.
 *
 * Callers that obtain a host via auto-detection can use this factory to
 * produce correct HTTP / WebSocket URLs without duplicating the port and path
 * constants.
 */
export function buildEnvironment(signalKHost: string, testBenchHost = resolveTestBenchHost(signalKHost)): AppEnvironment {
  const benchHost = testBenchHost;
  const chartEngineHost = resolveChartEngineHost(signalKHost);
  const { httpProtocol, wsProtocol } = resolveProtocols();

  return {
    signalKBaseUrl: `${httpProtocol}://${signalKHost}:3000/signalk/v1/api`,
    signalKWsUrl: `${wsProtocol}://${signalKHost}:3000/signalk/v1/stream?subscribe=all`,
    autopilotApiUrl: `${httpProtocol}://${signalKHost}:${AUTOPILOT_API_PORT}`,
    testBenchApiUrl: `${httpProtocol}://${benchHost}:${TEST_BENCH_API_PORT}`,
    // In local development the chart engine runs beside the UI, while Signal K
    // may still be auto-detected on the Raspberry. In deployed builds both
    // resolve to the hostname serving the UI.
    chartEngineApiUrl: `${httpProtocol}://${chartEngineHost}:${CHART_ENGINE_API_PORT}`,
    weatherApiUrl: `${httpProtocol}://${chartEngineHost}:${CHART_ENGINE_API_PORT}/weather/forecast`,
  };
}

function resolveChartEngineHost(signalKHost: string): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return signalKHost;
}

export function resolveSignalKHost(): string {
  const override = resolveSignalKHostOverride();
  if (override) return override;

  // Reuse the host auto-detected during a previous boot (if any).
  const autoDetected = resolveAutoDetectedHost();
  if (autoDetected) return autoDetected;

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname || RASPBERRY_LAN_HOST;
  }

  return RASPBERRY_LAN_HOST;
}

export function resolveTestBenchHost(signalKHost = resolveSignalKHost()): string {
  const override = resolveTestBenchHostOverride();
  if (override) return override;

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname || signalKHost;
  }

  return signalKHost;
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

function resolveAutoDetectedHost(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTO_DETECTED_KEY);
  } catch {
    return null;
  }
}

function resolveTestBenchHostOverride(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const queryOverride = params.get('testBenchHost') ?? params.get('simulationHost');
    if (queryOverride) {
      const normalized = queryOverride.trim();
      if (normalized === 'auto') {
        window.localStorage.removeItem(TEST_BENCH_HOST_OVERRIDE_KEY);
        return null;
      }
      window.localStorage.setItem(TEST_BENCH_HOST_OVERRIDE_KEY, normalized);
      return normalized;
    }

    return window.localStorage.getItem(TEST_BENCH_HOST_OVERRIDE_KEY);
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

/**
 * Default environment used at bootstrap.
 *
 * The Signal K host is resolved via {@link resolveSignalKHost} which checks
 * (in order): query-param override → localStorage override → previously
 * auto-detected host → browser hostname → hardcoded fallback.
 *
 * When the {@link SignalKHostDetectorService} runs a fresh detection during
 * the splash screen it may discover a different host — the WebSocket client
 * will reconnect accordingly.
 */
export const environment: AppEnvironment = (() => {
  const signalKHost = resolveSignalKHost();
  return buildEnvironment(signalKHost);
})();
