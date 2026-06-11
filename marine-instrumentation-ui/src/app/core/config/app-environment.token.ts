import { InjectionToken } from '@angular/core';

export interface AppEnvironment {
  signalKBaseUrl: string; // e.g. 'http://localhost:3000/signalk/v1'
  signalKWsUrl: string; // e.g. 'ws://localhost:3000/signalk/v1/stream'
}

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

function resolveSignalKHost(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  return 'localhost';
}

function resolveProtocols(): { httpProtocol: 'http' | 'https'; wsProtocol: 'ws' | 'wss' } {
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    return { httpProtocol: 'https', wsProtocol: 'wss' };
  }

  return { httpProtocol: 'http', wsProtocol: 'ws' };
}

const signalKHost = resolveSignalKHost();
const { httpProtocol, wsProtocol } = resolveProtocols();

export const environment: AppEnvironment = {
  signalKBaseUrl: `${httpProtocol}://${signalKHost}:3000/signalk/v1/api`,
  signalKWsUrl: `${wsProtocol}://${signalKHost}:3000/signalk/v1/stream?subscribe=all`,
};
