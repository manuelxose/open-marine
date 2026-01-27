import type { HistoryPoint } from '../../../state/datapoints/datapoint.models';

export type StatusTone = 'neutral' | 'ok' | 'warn' | 'alert';

export interface DashboardMetricVm {
  label: string;
  value: string;
  unit: string;
  series?: HistoryPoint[];
}

export interface CriticalStripItemVm extends DashboardMetricVm {
  tone: StatusTone;
}

export interface CriticalStripVm {
  items: CriticalStripItemVm[];
}

export interface NavigationPanelVm {
  title: string;
  fixLabel: string;
  position: {
    lat: string;
    lon: string;
  };
  metrics: DashboardMetricVm[];
}

export interface WindPanelVm {
  title: string;
  metrics: DashboardMetricVm[];
  primarySeries?: HistoryPoint[];
}

export interface DepthPanelVm {
  title: string;
  metrics: DashboardMetricVm[];
  series?: HistoryPoint[];
}

export interface PowerPanelVm {
  title: string;
  metrics: DashboardMetricVm[];
  series?: HistoryPoint[];
}

export interface SystemPanelVm {
  title: string;
  status: string;
  lines: string[];
}
