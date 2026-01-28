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
  isLoading: boolean;
  error?: string;
}

export interface NavigationPanelVm {
  title: string;
  fixLabel: string;
  statusTone: StatusTone;
  position: {
    lat: string;
    lon: string;
  };
  metrics: DashboardMetricVm[];
  isLoading: boolean;
  error?: string;
}

export interface WindPanelVm {
  title: string;
  metrics: DashboardMetricVm[];
  primarySeries?: HistoryPoint[];
  isLoading: boolean;
  error?: string;
}

export interface DepthPanelVm {
  title: string;
  metrics: DashboardMetricVm[];
  series?: HistoryPoint[];
  isLoading: boolean;
  error?: string;
}

export interface PowerPanelVm {
  title: string;
  metrics: DashboardMetricVm[];
  series?: HistoryPoint[];
  isLoading: boolean;
  error?: string;
}

export interface SystemPanelLine {
  labelKey: string;
  value: string;
}

export interface SystemPanelVm {
  title: string;
  status: string;
  statusTone: StatusTone;
  lines: SystemPanelLine[];
  isLoading: boolean;
  error?: string;
}

export interface DashboardStatusVm {
  label: string;
  detail: string;
  tone: StatusTone;
  isOffline: boolean;
  isStale: boolean;
  isLoading: boolean;
  isVisible: boolean;
  error?: string;
}
