import { ApplicationConfig, provideZoneChangeDetection, isDevMode, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import {
  APP_ENVIRONMENT,
  buildEnvironment,
  resolveSignalKHost,
} from './core/config/app-environment.token';
import { EnvironmentStateService } from './core/services/environment-state.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: APP_ENVIRONMENT,
      useFactory: () => {
        const host = resolveSignalKHost();
        const env = buildEnvironment(host);
        // Seed EnvironmentStateService so HTTP services have a valid URL
        // from the start, even before host auto-detection completes.
        const envState = inject(EnvironmentStateService);
        envState.updateEnv(env);
        return env;
      },
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
