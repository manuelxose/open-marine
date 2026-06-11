export interface TourStep {
  id: string;
  route?: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: number;
  beforeShow?: () => Promise<void>;
}

export const TOUR_STEPS: TourStep[] = [
  // --- SIDEBAR ---
  {
    id: 'sidebar',
    targetSelector: '.settings-sidebar, nav[aria-label]',
    title: 'tour.sidebar.title',
    description: 'tour.sidebar.desc',
    position: 'right',
  },

  // --- DASHBOARD ---
  {
    id: 'dashboard-overview',
    route: '/dashboard',
    targetSelector: 'main, .dashboard-content, app-dashboard-page',
    title: 'tour.dashboard.title',
    description: 'tour.dashboard.desc',
    position: 'center',
  },

  // --- CHART ---
  {
    id: 'chart-overview',
    route: '/chart',
    targetSelector: 'main, .chart-page, app-chart-page',
    title: 'tour.chart.title',
    description: 'tour.chart.desc',
    position: 'center',
  },

  // --- INSTRUMENTS ---
  {
    id: 'instruments-page',
    route: '/instruments',
    targetSelector: 'main, app-instruments-page',
    title: 'tour.instruments.title',
    description: 'tour.instruments.desc',
    position: 'center',
  },

  // --- ALARMS ---
  {
    id: 'alarms-page',
    route: '/alarms',
    targetSelector: 'main, app-alarms-page',
    title: 'tour.alarms.title',
    description: 'tour.alarms.desc',
    position: 'center',
  },

  // --- TOP BAR ---
  {
    id: 'topbar-connection',
    targetSelector: 'app-top-bar, .top-bar',
    title: 'tour.topbar.title',
    description: 'tour.topbar.desc',
    position: 'bottom',
  },

  // --- SETTINGS ---
  {
    id: 'settings-page',
    route: '/settings',
    targetSelector: 'main, app-settings-page',
    title: 'tour.settings.title',
    description: 'tour.settings.desc',
    position: 'center',
  },

  // --- FINAL ---
  {
    id: 'tour-complete',
    targetSelector: 'body',
    title: 'tour.complete.title',
    description: 'tour.complete.desc',
    position: 'center',
  },
];
