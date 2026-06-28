import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, timer } from 'rxjs';
import type {
  SimulationChannelDefinition,
  SimulationChannelSnapshot,
  SimulationEvent,
  SimulationRun,
  SimulationSampleBatch,
  SimulationScenarioDocument,
  SimulationRunStatus,
  SimulationStep,
} from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import type { DataPoint } from '../../state/datapoints/datapoint.models';
import { SimulationApiService, type RunSummary } from './simulation-api.service';

export type SimulationTab = 'scenarios' | 'execution' | 'charts' | 'data' | 'history';

export interface SimulationRow {
  channelId: string;
  path: string;
  value: unknown;
  formattedValue: string;
  ageSeconds: number;
  ageClass: 'fresh' | 'stale' | 'dead';
  source: string;
  timestamp: number;
  unit: string;
  group: string;
  quality: string;
  mapped: boolean;
}

export interface ChannelSample {
  timestamp: number;
  simulatedMs: number;
  value: unknown;
}

const MAX_EVENTS = 500;
const MAX_SAMPLES = 400;
const SAMPLE_POLL_INTERVAL_MS = 500;

// ── Offline mock scenarios (same as test-bench presets) ─────────────────────

const MOCK_SCENARIOS: SimulationScenarioDocument[] = [
  {
    id: 'basic-cruise',
    version: '1.0.0',
    name: 'Basic Cruise',
    description: 'Cruise navegación básica con viento variable, batería con ciclos carga/descarga, eventos de aguas someras y blanco AIS intruso.',
    category: 'navigation',
    mode: 'data',
    defaultDurationMs: 300_000,
    defaultSpeed: 1,
    parameters: [
      { id: 'seed', label: 'Random Seed', type: 'number', defaultValue: 42, min: 1, max: 9999, step: 1, group: 'General' },
      { id: 'speed', label: 'Simulation Speed', type: 'number', defaultValue: 1, min: 0.25, max: 4, step: 0.25, unit: 'x', group: 'General' },
      { id: 'durationMs', label: 'Duration', type: 'number', defaultValue: 300_000, min: 30_000, max: 3_600_000, step: 60_000, unit: 'ms', group: 'General' },
    ],
    channels: [
      { id: 'nav.position', label: 'Position', path: 'navigation.position', kind: 'text', dimension: 'position', canonicalUnit: 'deg', allowedUnits: ['deg'], precision: 6 },
      { id: 'nav.sog', label: 'SOG', path: 'navigation.speedOverGround', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 15 } },
      { id: 'nav.cog', label: 'COG', path: 'navigation.courseOverGroundTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'nav.heading', label: 'Heading', path: 'navigation.headingTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'wind.aws', label: 'AWS', path: 'environment.wind.speedApparent', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 20 } },
      { id: 'wind.awa', label: 'AWA', path: 'environment.wind.angleApparent', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: -3.142, max: 3.142 } },
      { id: 'depth.belowTransducer', label: 'Depth', path: 'environment.depth.belowTransducer', kind: 'analog', dimension: 'depth', canonicalUnit: 'm', allowedUnits: ['m', 'ft'], precision: 2, range: { min: 0, max: 100 }, limits: { low: 2, criticalLow: 1 } },
      { id: 'elec.voltage', label: 'Battery Voltage', path: 'electrical.batteries.house.voltage', kind: 'analog', dimension: 'voltage', canonicalUnit: 'V', allowedUnits: ['V'], precision: 2, range: { min: 10, max: 16 }, limits: { low: 11.5, criticalLow: 10.8 } },
      { id: 'elec.current', label: 'Battery Current', path: 'electrical.batteries.house.current', kind: 'analog', dimension: 'current', canonicalUnit: 'A', allowedUnits: ['A'], precision: 2, range: { min: -20, max: 20 } },
      { id: 'motor.rpm', label: 'Engine RPM', path: 'propulsion.main.revolutions', kind: 'analog', dimension: 'frequency', canonicalUnit: 'Hz', allowedUnits: ['Hz', 'rpm'], precision: 1, range: { min: 0, max: 50 } },
    ],
    timeline: [
      { id: 't1', atSimulatedMs: 0, type: 'marker', label: 'Inicio de navegación' },
      { id: 't2', atSimulatedMs: 60_000, type: 'marker', label: 'Primer ciclo de batería' },
      { id: 't3', atSimulatedMs: 120_000, type: 'marker', label: 'Evento de aguas someras' },
      { id: 't4', atSimulatedMs: 180_000, type: 'marker', label: 'Ráfaga de viento' },
      { id: 't5', atSimulatedMs: 240_000, type: 'marker', label: 'Segundo ciclo de batería' },
    ],
    tags: ['cruise', 'navigation', 'wind', 'battery', 'ais'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'harbor-traffic',
    version: '1.0.0',
    name: 'Harbor Traffic',
    description: 'Tráfico denso en puerto con múltiples blancos AIS, maniobras lentas, fondo irregular y corrientes.',
    category: 'navigation',
    mode: 'data',
    defaultDurationMs: 180_000,
    defaultSpeed: 1,
    parameters: [
      { id: 'seed', label: 'Random Seed', type: 'number', defaultValue: 42, min: 1, max: 9999, step: 1, group: 'General' },
      { id: 'speed', label: 'Simulation Speed', type: 'number', defaultValue: 1, min: 0.25, max: 4, step: 0.25, unit: 'x', group: 'General' },
      { id: 'durationMs', label: 'Duration', type: 'number', defaultValue: 180_000, min: 30_000, max: 3_600_000, step: 60_000, unit: 'ms', group: 'General' },
    ],
    channels: [
      { id: 'nav.position', label: 'Position', path: 'navigation.position', kind: 'text', dimension: 'position', canonicalUnit: 'deg', allowedUnits: ['deg'], precision: 6 },
      { id: 'nav.sog', label: 'SOG', path: 'navigation.speedOverGround', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 15 } },
      { id: 'nav.cog', label: 'COG', path: 'navigation.courseOverGroundTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'wind.aws', label: 'AWS', path: 'environment.wind.speedApparent', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 20 } },
      { id: 'depth.belowTransducer', label: 'Depth', path: 'environment.depth.belowTransducer', kind: 'analog', dimension: 'depth', canonicalUnit: 'm', allowedUnits: ['m', 'ft'], precision: 2, range: { min: 0, max: 100 } },
    ],
    timeline: [
      { id: 't1', atSimulatedMs: 0, type: 'marker', label: 'Entrada a puerto' },
      { id: 't2', atSimulatedMs: 45_000, type: 'marker', label: 'Primer cruce de tráfico' },
      { id: 't3', atSimulatedMs: 90_000, type: 'marker', label: 'Zona de fondeo' },
    ],
    tags: ['harbor', 'traffic', 'ais', 'maneuvering'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'combined-failures',
    version: '1.0.0',
    name: 'Combined Failures',
    description: 'Escenario con fallos múltiples: pérdida de GPS, batería crítica, sobrecalentamiento del motor, pérdida de presión de aceite.',
    category: 'safety',
    mode: 'data',
    defaultDurationMs: 120_000,
    defaultSpeed: 0.5,
    parameters: [
      { id: 'seed', label: 'Random Seed', type: 'number', defaultValue: 42, min: 1, max: 9999, step: 1, group: 'General' },
      { id: 'speed', label: 'Simulation Speed', type: 'number', defaultValue: 0.5, min: 0.25, max: 4, step: 0.25, unit: 'x', group: 'General' },
      { id: 'durationMs', label: 'Duration', type: 'number', defaultValue: 120_000, min: 30_000, max: 3_600_000, step: 60_000, unit: 'ms', group: 'General' },
    ],
    channels: [
      { id: 'nav.position', label: 'Position', path: 'navigation.position', kind: 'text', dimension: 'position', canonicalUnit: 'deg', allowedUnits: ['deg'], precision: 6 },
      { id: 'nav.sog', label: 'SOG', path: 'navigation.speedOverGround', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 15 } },
      { id: 'nav.cog', label: 'COG', path: 'navigation.courseOverGroundTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'elec.voltage', label: 'Battery Voltage', path: 'electrical.batteries.house.voltage', kind: 'analog', dimension: 'voltage', canonicalUnit: 'V', allowedUnits: ['V'], precision: 2, range: { min: 10, max: 16 }, limits: { low: 11.5, criticalLow: 10.8 } },
      { id: 'elec.current', label: 'Battery Current', path: 'electrical.batteries.house.current', kind: 'analog', dimension: 'current', canonicalUnit: 'A', allowedUnits: ['A'], precision: 2, range: { min: -20, max: 20 } },
      { id: 'motor.rpm', label: 'Engine RPM', path: 'propulsion.main.revolutions', kind: 'analog', dimension: 'frequency', canonicalUnit: 'Hz', allowedUnits: ['Hz', 'rpm'], precision: 1, range: { min: 0, max: 50 } },
      { id: 'motor.coolant', label: 'Coolant Temp', path: 'propulsion.main.temperature', kind: 'analog', dimension: 'temperature', canonicalUnit: 'K', allowedUnits: ['K', '°C'], precision: 1, range: { min: 273, max: 400 }, limits: { high: 368, criticalHigh: 383 } },
      { id: 'motor.oil', label: 'Oil Pressure', path: 'propulsion.main.oilPressure', kind: 'analog', dimension: 'pressure', canonicalUnit: 'Pa', allowedUnits: ['Pa', 'bar'], precision: 0, range: { min: 0, max: 700_000 } },
    ],
    timeline: [
      { id: 't1', atSimulatedMs: 0, type: 'marker', label: 'Navegación normal' },
      { id: 't2', atSimulatedMs: 20_000, type: 'fault-enable', channelId: 'nav.position', label: 'Pérdida de GPS' },
      { id: 't3', atSimulatedMs: 40_000, type: 'fault-enable', channelId: 'elec.voltage', label: 'Batería crítica' },
      { id: 't4', atSimulatedMs: 60_000, type: 'fault-enable', channelId: 'motor.coolant', label: 'Sobrecalentamiento' },
      { id: 't5', atSimulatedMs: 80_000, type: 'fault-enable', channelId: 'motor.oil', label: 'Pérdida de presión de aceite' },
      { id: 't6', atSimulatedMs: 100_000, type: 'fault-disable', channelId: 'nav.position', label: 'GPS recuperado' },
    ],
    tags: ['failure', 'safety', 'alarm', 'gps', 'engine', 'battery'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wind-gps-demo',
    version: '1.0.0',
    name: 'Wind GPS Demo',
    description: 'Demostración de instrumentos de viento y GPS con patrones predecibles para calibración de displays.',
    category: 'sensors',
    mode: 'data',
    defaultDurationMs: 120_000,
    defaultSpeed: 1,
    parameters: [
      { id: 'seed', label: 'Random Seed', type: 'number', defaultValue: 42, min: 1, max: 9999, step: 1, group: 'General' },
      { id: 'speed', label: 'Simulation Speed', type: 'number', defaultValue: 1, min: 0.25, max: 4, step: 0.25, unit: 'x', group: 'General' },
      { id: 'durationMs', label: 'Duration', type: 'number', defaultValue: 120_000, min: 30_000, max: 3_600_000, step: 60_000, unit: 'ms', group: 'General' },
    ],
    channels: [
      { id: 'nav.position', label: 'Position', path: 'navigation.position', kind: 'text', dimension: 'position', canonicalUnit: 'deg', allowedUnits: ['deg'], precision: 6 },
      { id: 'nav.sog', label: 'SOG', path: 'navigation.speedOverGround', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 15 } },
      { id: 'nav.cog', label: 'COG', path: 'navigation.courseOverGroundTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'nav.heading', label: 'Heading', path: 'navigation.headingTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'wind.aws', label: 'AWS', path: 'environment.wind.speedApparent', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 20 } },
      { id: 'wind.awa', label: 'AWA', path: 'environment.wind.angleApparent', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: -3.142, max: 3.142 } },
      { id: 'wind.tws', label: 'TWS', path: 'environment.wind.speedTrue', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 20 } },
      { id: 'wind.twd', label: 'TWD', path: 'environment.wind.angleTrueGround', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
      { id: 'depth.belowTransducer', label: 'Depth', path: 'environment.depth.belowTransducer', kind: 'analog', dimension: 'depth', canonicalUnit: 'm', allowedUnits: ['m', 'ft'], precision: 2, range: { min: 0, max: 100 } },
    ],
    timeline: [
      { id: 't1', atSimulatedMs: 0, type: 'marker', label: 'Inicio de calibración' },
      { id: 't2', atSimulatedMs: 30_000, type: 'marker', label: 'Rosa de viento completa' },
      { id: 't3', atSimulatedMs: 60_000, type: 'marker', label: 'Patrón de rumbo' },
      { id: 't4', atSimulatedMs: 90_000, type: 'marker', label: 'Patrón de velocidad' },
    ],
    tags: ['demo', 'calibration', 'wind', 'gps', 'instruments'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ── Offline simulation engine ───────────────────────────────────────────────

interface OfflineRunState {
  run: SimulationRun;
  events: SimulationEvent[];
  samples: Map<string, ChannelSample[]>;
  snapshots: Map<string, SimulationChannelSnapshot>;
  timer: ReturnType<typeof setInterval> | null;
  simulatedMs: number;
  tick: number;
}

@Injectable({ providedIn: 'root' })
export class SimulationFacadeService {
  private readonly store = inject(DatapointStoreService);
  readonly api = inject(SimulationApiService);

  readonly activeTab = signal<SimulationTab>('scenarios');
  readonly filterText = signal('');
  readonly scenarios = signal<SimulationScenarioDocument[]>([]);
  readonly runHistory = signal<RunSummary[]>([]);
  readonly activeRun = signal<SimulationRun | null>(null);
  readonly events = signal<SimulationEvent[]>([]);
  readonly channelSnapshots = signal<Map<string, SimulationChannelSnapshot>>(new Map());
  readonly sampleHistory = signal<Map<string, ChannelSample[]>>(new Map());
  readonly channelDefinitions = signal<Map<string, SimulationChannelDefinition>>(new Map());
  readonly lastSampleTick = signal<number>(0);
  readonly selectedScenarioId = signal<string>('');
  readonly parameters = signal<Record<string, number | boolean | string>>({});
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly paused = signal(false);
  readonly isOffline = computed(() => this.useOffline());
  readonly selectedChannelIds = signal<string[]>([
    'nav.sog',
    'nav.cog',
    'nav.heading',
    'wind.aws',
    'wind.awa',
    'elec.voltage',
    'elec.current',
    'motor.rpm',
  ]);

  readonly useOffline = signal(false);
  private offlineRun: OfflineRunState | null = null;
  private lastSequence = 0;
  private samplePollTimer: ReturnType<typeof setInterval> | null = null;

  private readonly ticker$ = timer(0, 500);
  private readonly liveRows = toSignal(
    combineLatest([this.store.state$, this.ticker$]).pipe(
      map(([dataMap]) => this.toLiveRows(dataMap)),
    ),
    { initialValue: [] as SimulationRow[] },
  );

  readonly allChannelIds = computed(() => {
    return Array.from(this.channelSnapshots().keys());
  });

  readonly rows = computed(() => {
    const rows = this.activeRun() ? this.toBenchRows() : this.liveRows();
    const filter = this.filterText().trim().toLowerCase();
    return (filter
      ? rows.filter((row) =>
          row.path.toLowerCase().includes(filter) ||
          row.source.toLowerCase().includes(filter) ||
          row.group.toLowerCase().includes(filter))
      : rows
    ).sort((a, b) => a.group.localeCompare(b.group) || a.path.localeCompare(b.path));
  });

  readonly selectedScenario = computed(() =>
    this.scenarios().find((item) => item.id === this.selectedScenarioId()) ?? null,
  );

  readonly currentChannels = computed(() =>
    this.selectedChannelIds()
      .map((id) => this.channelSnapshots().get(id) ?? null)
      .filter((item): item is SimulationChannelSnapshot => item !== null),
  );

  constructor() {
    void this.initialize();
  }

  async initialize(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const [scenarios, runs] = await Promise.all([
        this.api.loadScenarios(),
        this.api.loadRuns(),
      ]);
      this.scenarios.set(scenarios);
      this.runHistory.set(runs);
      this.useOffline.set(false);
      const first = scenarios[0];
      if (first) this.selectScenario(first.id);
      const active = runs.find((run) => run.status === 'running');
      if (active) {
        const run = await this.api.getRun(active.id);
        this.activeRun.set(run);
        this.connectRun(run);
      }
    } catch {
      // Backend unavailable — switch to offline mode with mock data
      this.useOffline.set(true);
      this.scenarios.set(MOCK_SCENARIOS);
      this.runHistory.set([]);
      this.error.set(null); // Clear error, we're in offline mode
      const first = MOCK_SCENARIOS[0];
      if (first) this.selectScenario(first.id);
    } finally {
      this.busy.set(false);
    }
  }

  setTab(tab: SimulationTab): void {
    this.activeTab.set(tab);
  }

  setFilter(value: string): void {
    this.filterText.set(value);
  }

  selectScenario(id: string): void {
    this.selectedScenarioId.set(id);
    const scenario = this.scenarios().find((item) => item.id === id);
    if (!scenario) return;
    this.parameters.set(Object.fromEntries(
      scenario.parameters.map((p) => [p.id, p.defaultValue]),
    ) as Record<string, number | boolean | string>);
    this.channelDefinitions.set(new Map(scenario.channels.map((c) => [c.id, c])));
  }

  setParameter(id: string, value: number | boolean | string): void {
    this.parameters.update((current) => ({ ...current, [id]: value }));
  }

  toggleChannel(id: string): void {
    this.selectedChannelIds.update((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(-12),
    );
  }

  async startSelectedScenario(): Promise<void> {
    const scenario = this.selectedScenario();
    if (!scenario || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.useOffline()) {
        this.startOfflineRun(scenario);
      } else {
        const armed = await this.api.arm();
        const run = await this.api.startRun(scenario.id, armed.token, this.parameters());
        this.activeRun.set(run);
        this.events.set([]);
        this.channelSnapshots.set(new Map());
        this.sampleHistory.set(new Map());
        this.lastSampleTick.set(0);
        this.lastSequence = 0;
        this.channelDefinitions.set(new Map(scenario.channels.map((c) => [c.id, c])));
        this.connectRun(run);
      }
      await this.refreshHistory();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async generateWindScenario(options: {
    baseWindSpeedKt: number;
    baseWindDirDeg: number;
    gustProbability: number;
    gustMaxDeltaKt: number;
    durationMs: number;
    seed: number;
  }): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const scenario = await this.api.generateWindScenario(options);
      await this.api.saveScenario(scenario);
      this.scenarios.update((current) => [...current, scenario]);
      this.selectScenario(scenario.id);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async abortActiveRun(): Promise<void> {
    if (this.useOffline() && this.offlineRun) {
      this.stopOfflineRun('aborted');
      return;
    }
    const run = this.activeRun();
    if (!run || run.status !== 'running') return;
    this.busy.set(true);
    try {
      this.activeRun.set(await this.api.abortRun(run.id));
      this.stopSamplePolling();
      this.api.disconnectEvents();
      await this.refreshHistory();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  disconnectRun(): void {
    if (this.useOffline() && this.offlineRun) {
      this.stopOfflineRun('aborted');
      return;
    }
    this.stopSamplePolling();
    this.api.disconnectEvents();
    this.activeRun.set(null);
    this.events.set([]);
    this.channelSnapshots.set(new Map());
    this.sampleHistory.set(new Map());
    this.lastSampleTick.set(0);
  }

  async leaseActiveRun(): Promise<void> {
    if (this.useOffline()) return;
    const run = this.activeRun();
    if (!run || run.status !== 'running') return;
    try {
      await this.api.leaseRun(run.id);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  reportUrl(runId: string, format: 'json' | 'csv' | 'html'): string {
    return this.api.reportUrl(runId, format);
  }

  channelForId(id: string): SimulationChannelSnapshot | null {
    return this.channelSnapshots().get(id) ?? null;
  }

  historyFor(id: string): ChannelSample[] {
    return this.sampleHistory().get(id) ?? [];
  }

  // ── Offline simulation ──────────────────────────────────────────────────

  private startOfflineRun(scenario: SimulationScenarioDocument): void {
    this.stopOfflineRun();
    const runId = `offline-${Date.now()}`;
    const steps: SimulationStep[] = [
      { id: 's1', label: 'Armado', status: 'passed' },
      { id: 's2', label: 'Inicialización', status: 'running' },
      { id: 's3', label: 'Ejecución', status: 'pending' },
      { id: 's4', label: 'Finalización', status: 'pending' },
    ];
    const run: SimulationRun = {
      id: runId,
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      status: 'running',
      mode: scenario.mode,
      speed: Number(this.parameters()['speed'] ?? 1),
      seed: Number(this.parameters()['seed'] ?? 42),
      parameters: this.parameters(),
      steps,
      assertions: [],
      channelSnapshot: [],
      startedAtUtc: new Date().toISOString(),
      lastSequence: 0,
      simulatedTimeMs: 0,
    };
    this.activeRun.set(run);
    this.events.set([]);
    this.channelSnapshots.set(new Map());
    this.sampleHistory.set(new Map());
    this.lastSequence = 0;

    const state: OfflineRunState = {
      run,
      events: [],
      samples: new Map(),
      snapshots: new Map(),
      timer: null,
      simulatedMs: 0,
      tick: 0,
    };
    this.offlineRun = state;

    // Emit initial events
    this.addOfflineEvent(state, 'run', 0, `Escenario "${scenario.name}" iniciado (modo offline)`);
    this.addOfflineEvent(state, 'step', 0, 'Armado completado');
    this.addOfflineEvent(state, 'step', 10, 'Inicialización completada');

    // Start simulation loop
    const intervalMs = 1000 / (run.speed * 10); // 10 Hz base
    state.timer = setInterval(() => {
      this.offlineTick(state, scenario);
    }, Math.max(50, intervalMs));
  }

  private offlineTick(state: OfflineRunState, scenario: SimulationScenarioDocument): void {
    if (this.paused()) return;

    const dtSimulatedMs = 100 * state.run.speed; // 100ms per tick at 1x
    state.simulatedMs += dtSimulatedMs;
    state.tick += 1;

    // Check timeline events
    for (const action of scenario.timeline) {
      if (action.atSimulatedMs <= state.simulatedMs && action.atSimulatedMs > state.simulatedMs - dtSimulatedMs) {
        const label = action.label ?? action.type;
        this.addOfflineEvent(state, 'timeline', state.simulatedMs, `Timeline: ${label}`);
      }
    }

    // Generate channel values
    for (const channel of scenario.channels) {
      const value = this.generateOfflineValue(channel.id, state.simulatedMs, state.run.seed);
      const snapshot: SimulationChannelSnapshot = {
        channelId: channel.id,
        value,
        unit: channel.canonicalUnit,
        quality: this.computeOfflineQuality(channel.id),
        simulatedTimeMs: state.simulatedMs,
      };
      state.snapshots.set(channel.id, snapshot);

      // Add to sample history
      const samples = state.samples.get(channel.id) ?? [];
      samples.push({ timestamp: Date.now(), simulatedMs: state.simulatedMs, value });
      if (samples.length > MAX_SAMPLES) samples.shift();
      state.samples.set(channel.id, samples);
    }

    // Update run state
    state.run.simulatedTimeMs = state.simulatedMs;
    state.run.channelSnapshot = Array.from(state.snapshots.values());

    // Check duration
    const durationMs = Number(this.parameters()['durationMs'] ?? scenario.defaultDurationMs);
    if (state.simulatedMs >= durationMs) {
      this.stopOfflineRun('passed');
      return;
    }

    // Update signals
    this.channelSnapshots.set(new Map(state.snapshots));
    this.sampleHistory.set(new Map(state.samples));
    this.events.set([...state.events]);
    this.activeRun.set({ ...state.run });
  }

  private generateOfflineValue(channelId: string, simulatedMs: number, seed: number): unknown {
    const t = simulatedMs / 1000;
    const phase = (t * 0.1) + (seed % 100);
    switch (channelId) {
      case 'nav.sog': return 2.5 + 1.5 * Math.sin(phase) + Math.random() * 0.2;
      case 'nav.cog': return (phase % 6.283);
      case 'nav.heading': return ((phase + 0.1) % 6.283);
      case 'nav.position': return { latitude: 42.2406 + Math.sin(phase * 0.01) * 0.01, longitude: -8.7207 + Math.cos(phase * 0.01) * 0.01 };
      case 'wind.aws': return 5 + 3 * Math.sin(phase * 2) + Math.random() * 0.5;
      case 'wind.awa': return Math.sin(phase) * 1.5;
      case 'wind.tws': return 6 + 2 * Math.sin(phase * 1.5);
      case 'wind.twd': return (phase * 0.5) % 6.283;
      case 'depth.belowTransducer': return 12 + 4 * Math.sin(phase * 0.3) + Math.random() * 0.3;
      case 'elec.voltage': return 12.6 + 0.8 * Math.sin(phase * 0.5) + Math.random() * 0.1;
      case 'elec.current': return 5 + 3 * Math.sin(phase * 0.8) + Math.random() * 0.5;
      case 'elec.soc': return 0.7 + 0.2 * Math.sin(phase * 0.2);
      case 'motor.rpm': return 25 + 10 * Math.sin(phase * 0.4) + Math.random() * 2;
      case 'motor.coolant': return 355 + 10 * Math.sin(phase * 0.3) + Math.random() * 2;
      case 'motor.oil': return 300_000 + 50_000 * Math.sin(phase * 0.6);
      case 'motor.fuel': return 0.6 + 0.1 * Math.sin(phase * 0.1);
      case 'motor.fuelRate': return 0.000_002_5 + Math.random() * 1e-7;
      case 'env.waterTemp': return 290 + 2 * Math.sin(phase * 0.2);
      case 'env.airTemp': return 295 + 3 * Math.sin(phase * 0.15);
      case 'env.baro': return 101_325 + 200 * Math.sin(phase * 0.1);
      case 'env.humidity': return 0.65 + 0.1 * Math.sin(phase * 0.25);
      default: return Math.random() * 100;
    }
  }

  private computeOfflineQuality(channelId: string): 'good' | 'warn' | 'bad' | 'unknown' {
    // Simulate faults based on timeline
    const run = this.activeRun();
    if (!run) return 'good';
    const scenario = this.selectedScenario();
    if (!scenario) return 'good';

    const simulatedMs = this.offlineRun?.simulatedMs ?? 0;
    for (const action of scenario.timeline) {
      if (action.type === 'fault-enable' && action.channelId === channelId && action.atSimulatedMs <= simulatedMs) {
        // Check if there's a matching fault-disable later
        const disabled = scenario.timeline.some(
          (a) => a.type === 'fault-disable' && a.channelId === channelId && a.atSimulatedMs <= simulatedMs && a.atSimulatedMs > action.atSimulatedMs,
        );
        if (!disabled) return 'bad';
      }
    }
    return 'good';
  }

  private addOfflineEvent(state: OfflineRunState, kind: SimulationEvent['kind'], atSimulatedMs: number, message: string): void {
    this.lastSequence += 1;
    const event: SimulationEvent = {
      id: `evt-${this.lastSequence}`,
      runId: state.run.id,
      sequence: this.lastSequence,
      kind,
      atSimulatedMs,
      atUtc: new Date().toISOString(),
      message,
    };
    state.events.push(event);
    if (state.events.length > MAX_EVENTS) state.events.shift();
  }

  private stopOfflineRun(finalStatus: SimulationRunStatus = 'aborted'): void {
    const state = this.offlineRun;
    if (!state) return;
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    state.run.status = finalStatus;
    state.run.completedAtUtc = new Date().toISOString();
    if (finalStatus === 'aborted') {
      this.addOfflineEvent(state, 'safe-state', state.simulatedMs, 'Ejecución abortada por el operador');
    } else if (finalStatus === 'passed') {
      this.addOfflineEvent(state, 'run', state.simulatedMs, 'Escenario completado exitosamente');
      state.run.steps = state.run.steps.map((s) => ({ ...s, status: 'passed' as const }));
    }
    this.activeRun.set({ ...state.run });
    this.events.set([...state.events]);
    this.runHistory.update((history) => [{
      id: state.run.id,
      scenarioId: state.run.scenarioId,
      status: state.run.status,
      startedAtUtc: state.run.startedAtUtc,
      completedAtUtc: state.run.completedAtUtc,
      simulatedTimeMs: state.run.simulatedTimeMs,
      mode: state.run.mode,
    }, ...history]);
    this.offlineRun = null;
  }

  // ── Backend-connected run ────────────────────────────────────────────────

  private connectRun(run: SimulationRun): void {
    this.lastSequence = 0;
    this.stopSamplePolling();
    this.api.connectEvents(
      run.id,
      this.lastSequence,
      (event) => this.consumeEvent(event),
      () => {
        if (this.activeRun()?.status === 'running') {
          this.error.set('Conexión SSE interrumpida; el servidor aplicará estado seguro si no se recupera.');
        }
      },
    );
    this.samplePollTimer = setInterval(() => {
      void this.pollSamples(run.id);
    }, SAMPLE_POLL_INTERVAL_MS);
  }

  private stopSamplePolling(): void {
    if (this.samplePollTimer) {
      clearInterval(this.samplePollTimer);
      this.samplePollTimer = null;
    }
  }

  private async pollSamples(runId: string): Promise<void> {
    if (this.paused()) return;
    try {
      const after = this.lastSampleTick();
      const batches = await this.api.loadSamples(runId, after, 2000);
      if (batches.length === 0) return;
      let maxTick = after;
      for (const batch of batches) {
        this.addSampleBatch(batch);
        if (batch.tick > maxTick) maxTick = batch.tick;
      }
      this.lastSampleTick.set(maxTick);
    } catch {
      // Ignore transient sample load errors; the SSE connection will surface real failures.
    }
  }

  private addSampleBatch(batch: SimulationSampleBatch): void {
    const defs = this.channelDefinitions();
    this.channelSnapshots.update((current) => {
      const next = new Map(current);
      for (const sample of batch.samples) {
        const def = defs.get(sample.channelId);
        next.set(sample.channelId, {
          channelId: sample.channelId,
          value: sample.value,
          unit: def?.canonicalUnit ?? '',
          quality: sample.quality,
          simulatedTimeMs: batch.simulatedTimeMs,
        });
      }
      return next;
    });
    this.sampleHistory.update((current) => {
      const next = new Map(current);
      for (const sample of batch.samples) {
        if (typeof sample.value !== 'number') continue;
        const history = next.get(sample.channelId) ?? [];
        history.push({
          timestamp: Date.now(),
          simulatedMs: batch.simulatedTimeMs,
          value: sample.value,
        });
        if (history.length > MAX_SAMPLES) history.shift();
        next.set(sample.channelId, history);
      }
      return next;
    });
  }

  private consumeEvent(event: SimulationEvent): void {
    this.events.update((current) => [...current, event].slice(-MAX_EVENTS));
    if (event.channelId && !this.paused()) {
      const snapshot: SimulationChannelSnapshot = {
        channelId: event.channelId,
        value: event.value ?? 0,
        unit: '',
        quality: 'good',
        simulatedTimeMs: event.atSimulatedMs,
      };
      this.channelSnapshots.update((current) => {
        const next = new Map(current);
        next.set(snapshot.channelId, snapshot);
        return next;
      });
      this.sampleHistory.update((current) => {
        const next = new Map(current);
        const history = next.get(snapshot.channelId) ?? [];
        next.set(snapshot.channelId, [...history, {
          timestamp: Date.now(),
          simulatedMs: event.atSimulatedMs,
          value: snapshot.value,
        }].slice(-MAX_SAMPLES));
        return next;
      });
    }
    const run = this.activeRun();
    if (run && event.sequence > this.lastSequence) {
      this.lastSequence = event.sequence;
      const next: SimulationRun = { ...run };
      if (event.assertion) {
        next.assertions = [...next.assertions, event.assertion];
      }
      if (event.kind === 'run' && /superada|fallida|abortada|desconectada/i.test(event.message)) {
        void this.api.getRun(run.id).then((updated) => {
          this.activeRun.set(updated);
          void this.refreshHistory();
        });
      } else {
        this.activeRun.set(next);
      }
    }
  }

  private async refreshHistory(): Promise<void> {
    if (this.useOffline()) return;
    this.runHistory.set(await this.api.loadRuns());
  }

  private toLiveRows(dataMap: Map<string, DataPoint>): SimulationRow[] {
    const now = Date.now();
    return Array.from(dataMap.values()).map((point) => {
      const ageSeconds = (now - point.timestamp) / 1000;
      return {
        channelId: point.path,
        path: point.path,
        value: point.value,
        formattedValue: this.formatValue(point.value),
        ageSeconds,
        ageClass: ageSeconds <= 2 ? 'fresh' : ageSeconds <= 5 ? 'stale' : 'dead',
        source: point.source,
        timestamp: point.timestamp,
        unit: this.unitForPath(point.path),
        group: this.groupForPath(point.path),
        quality: ageSeconds <= 2 ? 'good' : ageSeconds <= 5 ? 'warn' : 'bad',
        mapped: false,
      };
    });
  }

  private toBenchRows(): SimulationRow[] {
    const now = Date.now();
    return Array.from(this.channelSnapshots().values()).map((snapshot) => ({
      channelId: snapshot.channelId,
      path: snapshot.channelId,
      value: snapshot.value,
      formattedValue: this.formatValue(snapshot.value),
      ageSeconds: 0,
      ageClass: snapshot.quality === 'bad' ? 'dead' : snapshot.quality === 'warn' ? 'stale' : 'fresh',
      source: 'simulation',
      timestamp: now,
      unit: snapshot.unit,
      group: this.groupForPath(snapshot.channelId),
      quality: snapshot.quality,
      mapped: true,
    }));
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4);
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  }

  private unitForPath(path: string): string {
    if (/heading|angle|rudder/i.test(path)) return 'rad';
    if (/speed/i.test(path)) return 'm/s';
    if (/voltage/i.test(path)) return 'V';
    if (/current/i.test(path)) return 'A';
    if (/depth/i.test(path)) return 'm';
    return '';
  }

  private groupForPath(path: string): string {
    const root = path.split('.')[0] ?? 'system';
    const labels: Record<string, string> = {
      nav: 'Navegación',
      steering: 'Autopiloto',
      autopilot: 'Autopiloto',
      drive: 'Motor',
      motor: 'Motor',
      power: 'Energía',
      electrical: 'Energía',
      environment: 'Entorno',
      sensors: 'Sensores',
      propulsion: 'Propulsión',
      uart: 'UART',
      communication: 'Comunicaciones',
    };
    return labels[root] ?? 'Sistema';
  }

  private errorMessage(error: unknown): string {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 0;
    if (status === 409) return 'Ya existe una ejecución activa.';
    if (status === 401) return 'El token de armado ha caducado. Vuelve a iniciar la ejecución.';
    return 'No se pudo ejecutar la operación de simulación.';
  }
}
