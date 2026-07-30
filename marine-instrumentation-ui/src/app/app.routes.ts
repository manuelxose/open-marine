// Routes configuration
import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  // Root redirect → chart (default home per DOC_3)
  {
    path: '',
    redirectTo: 'chart',
    pathMatch: 'full',
  },

  // Onboarding flow — always accessible, no guard
  {
    path: 'onboarding',
    loadChildren: () => import('./features/onboarding/onboarding.routes'),
  },

  // Main application routes — guarded by onboarding
  {
    path: 'chart',
    loadComponent: () => import('./features/chart/chart.page').then(m => m.ChartPage),
    title: 'Chart',
    canActivate: [onboardingGuard],
  },
  {
    path: 'charts',
    redirectTo: ({ queryParams }) => inject(Router).createUrlTree(['/chart'], {
      queryParams: { ...queryParams, manager: 'maps' },
    }),
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage),
    title: 'Dashboard',
    canActivate: [onboardingGuard],
  },
  {
    path: 'instruments',
    loadComponent: () => import('./features/instruments/instruments.page').then(m => m.InstrumentsPage),
    title: 'Instruments',
    canActivate: [onboardingGuard],
  },
  {
    path: 'vessels',
    loadComponent: () => import('./features/vessels/vessels.page').then(m => m.VesselsPage),
    title: 'Vessels',
    canActivate: [onboardingGuard],
  },
  {
    path: 'alarms',
    loadComponent: () => import('./features/alarms/alarms.page').then(m => m.AlarmsPage),
    title: 'Alarms',
    canActivate: [onboardingGuard],
  },
  {
    path: 'resources',
    loadComponent: () => import('./features/resources/resources.page').then(m => m.ResourcesPage),
    title: 'Resources',
    canActivate: [onboardingGuard],
  },
  {
    path: 'autopilot',
    loadComponent: () => import('./features/autopilot/autopilot.page').then(m => m.AutopilotPage),
    title: 'Autopilot',
    canActivate: [onboardingGuard],
  },
  {
    path: 'performance',
    loadComponent: () => import('./features/performance/performance.page').then(m => m.PerformancePage),
    title: 'Performance',
    canActivate: [onboardingGuard],
  },
  {
    path: 'diagnostics',
    loadComponent: () => import('./features/diagnostics/diagnostics.page').then(m => m.DiagnosticsPage),
    title: 'Banco de pruebas',
    canActivate: [onboardingGuard],
  },
  {
    path: 'system-diagnostics',
    loadComponent: () => import('./features/system-diagnostics/system-diagnostics.page').then(m => m.SystemDiagnosticsPage),
    title: 'System Diagnostics',
    canActivate: [onboardingGuard],
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    title: 'Settings',
    canActivate: [onboardingGuard],
  },
  {
    path: 'widgets',
    redirectTo: 'instruments',
    pathMatch: 'full',
  },

  // Dev-only routes (no guard)
  {
    path: 'styleguide',
    loadComponent: () => import('./features/styleguide/styleguide.page').then(m => m.StyleguidePage),
    title: 'Styleguide',
  },

  // Legend — standalone access from sidebar
  {
    path: 'legend',
    loadComponent: () =>
      import('./features/chart-legend/chart-legend-standalone.page').then(
        m => m.ChartLegendStandalonePage,
      ),
    title: 'Chart Legend | OMI',
    canActivate: [onboardingGuard],
  },
];
