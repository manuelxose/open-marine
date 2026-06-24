import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

async function clearDevelopmentServiceWorker(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !['localhost', '127.0.0.1'].includes(window.location.hostname)
  ) {
    return;
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('ngsw:'))
        .map((name) => caches.delete(name)),
    );
  }
}

clearDevelopmentServiceWorker()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error(err));
