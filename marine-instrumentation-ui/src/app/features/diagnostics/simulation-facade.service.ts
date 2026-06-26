import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, timer } from 'rxjs';
import type {
  SimulationChannelSnapshot,
  SimulationEvent,
  SimulationRun,
  SimulationScenarioDocument,
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
  readonly selectedScenarioId = signal<string>('');
  readonly parameters = signal<Record<string, number | boolean | string>>({});
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly paused = signal(false);
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

  private lastSequence = 0;

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
      const first = scenarios[0];
      if (first) this.selectScenario(first.id);
      const active = runs.find((run) => run.status === 'running');
      if (active) {
        const run = await this.api.getRun(active.id);
        this.activeRun.set(run);
        this.connectRun(run);
      }
    } catch (err) {
      const isOffline = !this.api.online();
      const msg = isOffline
        ? 'El servicio marine-test-bench no responde. Asegúrate de iniciarlo con: npm run start:test-bench (puerto 4100).'
        : 'Error al cargar datos del laboratorio de simulación.';
      this.error.set(msg);
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
      const armed = await this.api.arm();
      const run = await this.api.startRun(scenario.id, armed.token, this.parameters());
      this.activeRun.set(run);
      this.events.set([]);
      this.channelSnapshots.set(new Map());
      this.sampleHistory.set(new Map());
      this.lastSequence = 0;
      this.connectRun(run);
      await this.refreshHistory();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async abortActiveRun(): Promise<void> {
    const run = this.activeRun();
    if (!run || run.status !== 'running') return;
    this.busy.set(true);
    try {
      this.activeRun.set(await this.api.abortRun(run.id));
      this.api.disconnectEvents();
      await this.refreshHistory();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  disconnectRun(): void {
    this.api.disconnectEvents();
    this.activeRun.set(null);
    this.events.set([]);
    this.channelSnapshots.set(new Map());
    this.sampleHistory.set(new Map());
  }

  async leaseActiveRun(): Promise<void> {
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

  private connectRun(run: SimulationRun): void {
    this.lastSequence = 0;
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
