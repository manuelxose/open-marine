import { InjectionToken } from '@angular/core';

export interface AppEnvironment {
  signalKBaseUrl: string; // e.g. 'http://localhost:3000/signalk/v1'
  signalKWsUrl: string; // e.g. 'ws://localhost:3000/signalk/v1/stream'
}

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

export const environment: AppEnvironment = {
  signalKBaseUrl: 'http://localhost:3000/signalk/v1/api',
  signalKWsUrl: 'ws://localhost:3000/signalk/v1/stream?subscribe=all', // Adjust port if needed, usually 3000 for SignalK server
};
