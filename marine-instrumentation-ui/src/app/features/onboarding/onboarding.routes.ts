import { Routes } from '@angular/router';

export default [
  {
    path: 'welcome',
    loadComponent: () =>
      import('./pages/welcome/onboarding-welcome.page').then(
        (m) => m.OnboardingWelcomePage,
      ),
    title: 'Welcome — OMI',
  },
  {
    path: 'connection',
    loadComponent: () =>
      import('./pages/connection/onboarding-connection.page').then(
        (m) => m.OnboardingConnectionPage,
      ),
    title: 'Connect — OMI',
  },
  {
    path: 'vessel',
    loadComponent: () =>
      import('./pages/vessel/onboarding-vessel.page').then(
        (m) => m.OnboardingVesselPage,
      ),
    title: 'Vessel Setup — OMI',
  },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' as const },
] satisfies Routes;
