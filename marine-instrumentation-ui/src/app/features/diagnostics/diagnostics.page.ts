import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UplotChartComponent, type UplotChartConfig, type UplotSeriesConfig } from '../../shared/components/uplot-chart/uplot-chart.component';
import {
  SimulationFacadeService,
  type SimulationTab,
} from './simulation-facade.service';
import type { SimulationChannelDefinition } from '@omi/marine-data-contract';

interface ChannelGroup {
  id: string;
  label: string;
  channels: SimulationChannelDefinition[];
}

interface ChartGroup {
  unit: string;
  label: string;
  config: UplotChartConfig;
  data: number[][];
}

const DEFAULT_SELECTED_CHANNELS = [
  'nav.sog',
  'nav.cog',
  'nav.heading',
  'wind.aws',
  'wind.awa',
  'wind.tws',
  'elec.voltage',
  'elec.current',
  'motor.rpm',
  'ap.driveCurrent',
  'ap.rudderAngle',
  'ap.targetHeading',
];

const CHART_COLORS = [
  '#00ff88',
  '#00ccff',
  '#ffaa00',
  '#ff4444',
  '#cc88ff',
  '#ffff00',
  '#00ffcc',
  '#ff66cc',
  '#66ff66',
  '#ff9966',
];

const STORAGE_KEY = 'omi-diagnostics-charts';

@Component({
  selector: 'app-diagnostics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, UplotChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnostics.page.html',
  styleUrl: './diagnostics.page.scss',
})
export class DiagnosticsPage {
  readonly facade = inject(SimulationFacadeService);

  readonly tabs: Array<{ id: SimulationTab; labelKey: string }> = [
    { id: 'scenarios', labelKey: 'simulation.tabs.scenarios' },
    { id: 'execution', labelKey: 'simulation.tabs.execution' },
    { id: 'charts', labelKey: 'simulation.tabs.charts' },
    { id: 'data', labelKey: 'simulation.tabs.data' },
    { id: 'history', labelKey: 'simulation.tabs.history' },
  ];

  readonly channelGroups = computed<ChannelGroup[]>(() => {
    const defs = Array.from(this.facade.channelDefinitions().values());
    const groups = new Map<string, SimulationChannelDefinition[]>();
    for (const def of defs) {
      const group = this.groupForChannel(def.id);
      const list = groups.get(group) ?? [];
      list.push(def);
      groups.set(group, list);
    }
    return Array.from(groups.entries())
      .map(([id, channels]) => ({ id, label: this.groupLabel(id), channels: channels.sort((a, b) => a.label.localeCompare(b.label)) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly chartGroups = computed<ChartGroup[]>(() => {
    const selectedIds = this.facade.selectedChannelIds();
    if (selectedIds.length === 0) return [];

    const defs = this.facade.channelDefinitions();
    const history = this.facade.sampleHistory();

    // Group selected channels by unit
    const unitGroups = new Map<string, SimulationChannelDefinition[]>();
    for (const id of selectedIds) {
      const def = defs.get(id);
      if (!def) continue;
      const unit = def.canonicalUnit;
      const list = unitGroups.get(unit) ?? [];
      list.push(def);
      unitGroups.set(unit, list);
    }

    const result: ChartGroup[] = [];
    for (const [unit, channels] of unitGroups) {
      // Build aligned time series
      const timeSet = new Set<number>();
      for (const channel of channels) {
        const samples = history.get(channel.id) ?? [];
        for (const s of samples) timeSet.add(s.simulatedMs);
      }
      const times = Array.from(timeSet).sort((a, b) => a - b);
      if (times.length === 0) continue;

      const seriesData: number[][] = [];
      const seriesConfig: UplotSeriesConfig[] = [];

      for (const [i, channel] of channels.entries()) {
        const samples = history.get(channel.id) ?? [];
        const sampleMap = new Map(samples.map((s) => [s.simulatedMs, s.value]));
        const values = times.map((t) => {
          const v = sampleMap.get(t);
          return typeof v === 'number' ? v : null;
        });
        seriesData.push(values as number[]);
        seriesConfig.push({
          id: channel.id,
          label: channel.label,
          unit: channel.canonicalUnit,
          color: this.chartColor(i),
          range: channel.range,
          limits: channel.limits,
          precision: channel.precision,
        });
      }

      result.push({
        unit,
        label: this.unitLabel(unit),
        config: { series: seriesConfig, xLabel: 'Simulated Time (s)' },
        data: [times, ...seriesData],
      });
    }

    return result;
  });

  readonly selectedCount = computed(() => this.facade.selectedChannelIds().length);

  // Wind generator form
  windForm = {
    baseWindSpeedKt: 12,
    baseWindDirDeg: 45,
    gustProbability: 0.2,
    gustMaxDeltaKt: 5,
    durationMs: 120000,
    seed: 42,
  };

  constructor() {
    this.loadSelectedChannels();
    effect(() => {
      this.saveSelectedChannels(this.facade.selectedChannelIds());
    });
  }

  setNumericParameter(id: string, value: unknown): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) this.facade.setParameter(id, parsed);
  }

  eventTime(simulatedMs: number): string {
    return `${(simulatedMs / 1000).toFixed(1)} s`;
  }

  statusLabel(status: string): string {
    return status.replace('-', ' ').toUpperCase();
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  togglePause(): void {
    this.facade.paused.update((p) => !p);
  }

  isSelected(id: string): boolean {
    return this.facade.selectedChannelIds().includes(id);
  }

  toggleChannel(id: string): void {
    this.facade.toggleChannel(id);
  }

  resetChannels(): void {
    this.facade.selectedChannelIds.set([...DEFAULT_SELECTED_CHANNELS]);
  }

  selectGroup(group: ChannelGroup): void {
    this.facade.selectedChannelIds.update((current) => {
      const ids = group.channels.map((c) => c.id);
      const allSelected = ids.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !ids.includes(id));
      }
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return Array.from(next).slice(-12);
    });
  }

  async generateWindScenario(): Promise<void> {
    await this.facade.generateWindScenario({ ...this.windForm });
  }

  private groupForChannel(channelId: string): string {
    const root = channelId.split('.')[0] ?? 'system';
    const labels: Record<string, string> = {
      nav: 'navigation',
      wind: 'wind',
      depth: 'environment',
      env: 'environment',
      elec: 'electrical',
      motor: 'motor',
      ap: 'autopilot',
      ais: 'ais',
      uart: 'uart',
    };
    return labels[root] ?? 'system';
  }

  private groupLabel(id: string): string {
    const labels: Record<string, string> = {
      navigation: 'Navegación',
      wind: 'Viento',
      environment: 'Entorno',
      electrical: 'Energía',
      motor: 'Motor',
      autopilot: 'Autopiloto',
      ais: 'AIS',
      uart: 'UART',
      system: 'Sistema',
    };
    return labels[id] ?? id;
  }

  private unitLabel(unit: string): string {
    const labels: Record<string, string> = {
      'm/s': 'Velocidad (m/s)',
      kn: 'Velocidad (nudos)',
      rad: 'Ángulo (rad)',
      deg: 'Ángulo (deg)',
      V: 'Tensión (V)',
      A: 'Corriente (A)',
      K: 'Temperatura (K)',
      '°C': 'Temperatura (°C)',
      Pa: 'Presión (Pa)',
      m: 'Profundidad (m)',
      ft: 'Profundidad (ft)',
      ratio: 'Ratio',
      bool: 'Digital',
      text: 'Estado',
      Hz: 'Frecuencia (Hz)',
      rpm: 'RPM',
    };
    return labels[unit] ?? unit;
  }

  private chartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length] ?? '#00ff88';
  }

  private loadSelectedChannels(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
          this.facade.selectedChannelIds.set(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    this.facade.selectedChannelIds.set([...DEFAULT_SELECTED_CHANNELS]);
  }

  private saveSelectedChannels(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }
}
