import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  UplotChartComponent,
  type UplotChartConfig,
  type UplotSeriesConfig,
} from '../../shared/components/uplot-chart/uplot-chart.component';
import {
  OscilloscopeComponent,
  type OscilloscopeTrace,
} from '../../shared/components/oscilloscope/oscilloscope.component';
import { SimulationFacadeService, type SimulationTab } from './simulation-facade.service';
import type { SimulationChannelDefinition, SimulationScenarioDocument } from '@omi/marine-data-contract';

interface ChannelGroup {
  id: string;
  label: string;
  channels: SimulationChannelDefinition[];
}

interface ChartGroup {
  key: string;
  label: string;
  config: UplotChartConfig;
  data: number[][];
}

type TimebaseMs = 10_000 | 30_000 | 60_000 | 120_000 | 'all';

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
  'ap.targetRudderAngle',
  'ap.driveEnabled',
  'ap.fault',
];

const CHART_COLORS = [
  'var(--gb-data-good)',
  'var(--gb-tick-reference)',
  'var(--gb-data-warn)',
  'var(--gb-data-stale)',
  'var(--gb-needle-secondary)',
  'var(--gb-needle-primary)',
  'var(--gb-text-value)',
  'var(--gb-text-cardinal)',
];

const STORAGE_KEY = 'omi-diagnostics-charts';

@Component({
  selector: 'app-diagnostics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, UplotChartComponent, OscilloscopeComponent],
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

  readonly selectedTimebase = signal<TimebaseMs>(60_000);
  readonly viewMode = signal<'chart' | 'scope'>('scope');
  readonly timebaseOptions: Array<{ label: string; value: TimebaseMs }> = [
    { label: '10 s', value: 10_000 },
    { label: '30 s', value: 30_000 },
    { label: '60 s', value: 60_000 },
    { label: '120 s', value: 120_000 },
    { label: 'ALL', value: 'all' },
  ];

  scenarioDescription(scenario: SimulationScenarioDocument): string {
    const description = scenario.description?.trim();
    if (description) return description;
    return scenario.expectation?.summary ?? 'Scenario ready for bench execution; no detailed description was provided by the catalog.';
  }

  scenarioCatalogSummary(scenario: SimulationScenarioDocument): string {
    return scenario.expectation?.summary ?? this.scenarioDescription(scenario);
  }

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
      .map(([id, channels]) => ({
        id,
        label: this.groupLabel(id),
        channels: channels.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly chartGroups = computed<ChartGroup[]>(() => {
    const selectedIds = this.facade.selectedChannelIds();
    if (selectedIds.length === 0) return [];

    const defs = this.facade.channelDefinitions();
    const history = this.facade.sampleHistory();
    const latestTime = this.latestSelectedTime(selectedIds, history);
    const timebase = this.selectedTimebase();
    const startTime = timebase === 'all' ? 0 : Math.max(0, latestTime - timebase);

    const laneGroups = new Map<string, SimulationChannelDefinition[]>();
    for (const id of selectedIds) {
      const def = defs.get(id);
      if (!def) continue;
      const lane = this.scopeLaneFor(def);
      const list = laneGroups.get(lane) ?? [];
      list.push(def);
      laneGroups.set(lane, list);
    }

    const result: ChartGroup[] = [];
    for (const [lane, channels] of laneGroups) {
      const timeSet = new Set<number>();
      for (const channel of channels) {
        const samples = history.get(channel.id) ?? [];
        for (const sample of samples) {
          if (sample.simulatedMs >= startTime) timeSet.add(sample.simulatedMs);
        }
      }
      const times = Array.from(timeSet).sort((a, b) => a - b);
      if (times.length === 0) continue;

      const seriesData: number[][] = [];
      const seriesConfig: UplotSeriesConfig[] = [];
      for (const [i, channel] of channels.entries()) {
        const samples = history.get(channel.id) ?? [];
        // Sort samples by simulatedMs so forward-fill is deterministic
        const sorted = [...samples].sort((a, b) => a.simulatedMs - b.simulatedMs);

        // Forward-fill: for each unified time, use the last known value.
        // This prevents null gaps when channels have different sample rates.
        let lastValue: unknown = null;
        let sampleIdx = 0;
        const filled: number[] = [];
        for (const time of times) {
          // Advance sampleIdx to the last sample with simulatedMs <= time
          while (sampleIdx < sorted.length && sorted[sampleIdx]!.simulatedMs <= time) {
            lastValue = sorted[sampleIdx]!.value;
            sampleIdx++;
          }
          const v = this.scopeValue(lastValue, channel);
          filled.push(v ?? 0);
        }
        seriesData.push(filled);
        seriesConfig.push({
          id: channel.id,
          label: channel.label,
          unit: channel.canonicalUnit,
          color: this.chartColor(i),
          scale: lane,
          range:
            channel.kind === 'digital' || channel.kind === 'text'
              ? { min: 0, max: 1 }
              : channel.range,
          limits: channel.limits,
          precision: channel.precision,
          stepped: channel.kind === 'digital' || channel.kind === 'text',
        });
      }

      result.push({
        key: lane,
        label: this.unitLabel(lane),
        config: { series: seriesConfig, xLabel: 'Simulated Time (s)', mode: 'chart' },
        data: [times, ...seriesData],
      });
    }
    return result;
  });

  /** Oscilloscope mode: trace data keyed by unit/scale lane */
  readonly scopeTraces = computed<OscilloscopeTrace[]>(() => {
    const selectedIds = this.facade.selectedChannelIds();
    if (selectedIds.length === 0) return [];

    const defs = this.facade.channelDefinitions();
    const history = this.facade.sampleHistory();

    // Find the latest simulatedMs across all selected channels for time-windowing
    let latestSimMs = 0;
    for (const id of selectedIds) {
      for (const s of history.get(id) ?? []) {
        if (s.simulatedMs > latestSimMs) latestSimMs = s.simulatedMs;
      }
    }
    const tb = this.selectedTimebase();
    const timebaseMs = tb === 'all' ? Math.max(latestSimMs, 120_000) : tb;
    const startTime = Math.max(0, latestSimMs - timebaseMs);

    const traces: OscilloscopeTrace[] = [];
    let colorIndex = 0;

    for (const id of selectedIds) {
      const def = defs.get(id);
      if (!def) continue;

      const samples = history.get(id) ?? [];
      const windowed: Array<{ timestamp: number; value: number }> = [];
      for (const s of samples) {
        if (s.simulatedMs >= startTime) {
          windowed.push({
            timestamp: s.simulatedMs,
            value: typeof s.value === 'number' ? s.value : s.value ? 1 : 0,
          });
        }
      }

      if (windowed.length < 2) continue;

      const trace: OscilloscopeTrace = {
        id: def.id,
        label: def.label,
        color: this.chartColor(colorIndex),
        data: windowed,
        unit: def.canonicalUnit,
        verticalOffset: 0.5,
        verticalScale: 1.0,
      };
      if (def.kind === 'digital' || def.kind === 'text') {
        trace.yRange = { min: 0, max: 1 };
      } else if (def.range) {
        trace.yRange = def.range;
      }
      traces.push(trace);

      colorIndex++;
    }

    return traces;
  });

  readonly selectedCount = computed(() => this.facade.selectedChannelIds().length);

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
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number')
      return Number.isInteger(value) ? String(value) : value.toFixed(4);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  togglePause(): void {
    this.facade.paused.update((paused) => !paused);
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

  setTimebase(value: TimebaseMs): void {
    this.selectedTimebase.set(value);
  }

  setViewMode(mode: 'chart' | 'scope'): void {
    this.viewMode.set(mode);
  }

  selectGroup(group: ChannelGroup): void {
    this.facade.selectedChannelIds.update((current) => {
      const ids = group.channels.map((channel) => channel.id);
      const allSelected = ids.every((id) => current.includes(id));
      if (allSelected) return current.filter((id) => !ids.includes(id));
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return Array.from(next).slice(-12);
    });
  }

  async generateWindScenario(): Promise<void> {
    await this.facade.generateWindScenario({ ...this.windForm });
  }

  async clearRunHistory(): Promise<void> {
    const confirmed = window.confirm('Eliminar todo el historial de simulaciones?');
    if (confirmed) await this.facade.clearRunHistory();
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
      angle: 'Ángulo (rad)',
      rad: 'Ángulo (rad)',
      deg: 'Ángulo (deg)',
      V: 'Tensión (V)',
      A: 'Corriente (A)',
      K: 'Temperatura (K)',
      C: 'Temperatura (C)',
      Pa: 'Presión (Pa)',
      m: 'Profundidad (m)',
      ft: 'Profundidad (ft)',
      count: 'Conteo',
      ratio: 'Ratio',
      bool: 'Digital',
      state: 'Estado / Digital',
      text: 'Estado',
      json: 'Datos',
      Hz: 'Frecuencia (Hz)',
      rpm: 'RPM',
    };
    return labels[unit] ?? unit;
  }

  private chartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length] ?? 'var(--gb-data-good)';
  }

  private scopeLaneFor(channel: SimulationChannelDefinition): string {
    if (channel.kind === 'digital' || channel.kind === 'text') return 'state';
    if (channel.dimension === 'angle') return 'angle';
    return channel.canonicalUnit;
  }

  private scopeValue(value: unknown, channel: SimulationChannelDefinition): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (channel.kind === 'text') return value && value !== 'none' && value !== 'standby' ? 1 : 0;
    return null;
  }

  private latestSelectedTime(
    selectedIds: string[],
    history: Map<string, Array<{ simulatedMs: number }>>,
  ): number {
    let latest = 0;
    for (const id of selectedIds) {
      for (const sample of history.get(id) ?? []) latest = Math.max(latest, sample.simulatedMs);
    }
    return latest;
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
