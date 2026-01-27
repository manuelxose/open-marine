// Routes configuration
import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage),
    title: 'Dashboard'
  },
  { 
    path: 'chart', 
    loadComponent: () => import('./features/chart/chart.page').then(m => m.ChartPage),
    title: 'Chart'
  },
  { 
    path: 'instruments', 
    loadComponent: () => import('./pages/instruments/instruments.page').then(m => m.InstrumentsPage),
    title: 'Instruments'
  },
  { 
    path: 'alarms', 
    loadComponent: () => import('./pages/alarms/alarms.page').then(m => m.AlarmsPage),
    title: 'Alarms'
  },
  { 
    path: 'diagnostics', 
    loadComponent: () => import('./pages/diagnostics/diagnostics.page').then(m => m.DiagnosticsPage),
    title: 'Diagnostics'
  },
  { 
    path: 'settings', 
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    title: 'Settings'
  },
];
