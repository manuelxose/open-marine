import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';

import { outsideZoneTicker } from '../../shared/rxjs/outside-zone-ticker';
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
const OFFLINE_UI_PUBLISH_INTERVAL_MS = 250;

// ── Offline mock scenarios (same as test-bench presets) ─────────────────────

// Reusable channel definitions (paths match @omi/marine-data-contract PATHS) shared by the curated
// offline scenarios, kept in sync with the backend channel-registry.
const MOCK_NAV: SimulationChannelDefinition[] = [
  { id: 'nav.position', label: 'Position', path: 'navigation.position', kind: 'text', dimension: 'position', canonicalUnit: 'deg', allowedUnits: ['deg'], precision: 6 },
  { id: 'nav.sog', label: 'SOG', path: 'navigation.speedOverGround', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 15 } },
  { id: 'nav.cog', label: 'COG', path: 'navigation.courseOverGroundTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
  { id: 'nav.heading', label: 'Heading', path: 'navigation.headingTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
];
const MOCK_WIND: SimulationChannelDefinition[] = [
  { id: 'wind.aws', label: 'AWS', path: 'environment.wind.speedApparent', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 30 } },
  { id: 'wind.awa', label: 'AWA', path: 'environment.wind.angleApparent', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: -3.142, max: 3.142 } },
  { id: 'wind.tws', label: 'TWS', path: 'environment.wind.speedTrue', kind: 'analog', dimension: 'speed', canonicalUnit: 'm/s', allowedUnits: ['m/s', 'kn'], precision: 2, range: { min: 0, max: 30 } },
  { id: 'wind.twd', label: 'TWD', path: 'environment.wind.directionTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
];
const MOCK_ELEC: SimulationChannelDefinition[] = [
  { id: 'elec.voltage', label: 'Battery Voltage', path: 'electrical.batteries.house.voltage', kind: 'analog', dimension: 'voltage', canonicalUnit: 'V', allowedUnits: ['V'], precision: 2, range: { min: 10, max: 16 }, limits: { low: 11.5, criticalLow: 10.8 } },
  { id: 'elec.current', label: 'Battery Current', path: 'electrical.batteries.house.current', kind: 'analog', dimension: 'current', canonicalUnit: 'A', allowedUnits: ['A'], precision: 2, range: { min: -20, max: 20 } },
];
const MOCK_ENGINE: SimulationChannelDefinition[] = [
  { id: 'motor.rpm', label: 'Engine RPM', path: 'propulsion.main.revolutions', kind: 'analog', dimension: 'frequency', canonicalUnit: 'Hz', allowedUnits: ['Hz', 'rpm'], precision: 1, range: { min: 0, max: 50 } },
  { id: 'motor.coolant', label: 'Coolant Temp', path: 'propulsion.main.temperature', kind: 'analog', dimension: 'temperature', canonicalUnit: 'K', allowedUnits: ['K', '°C'], precision: 1, range: { min: 273, max: 400 }, limits: { high: 368, criticalHigh: 383 } },
];
const MOCK_AP: SimulationChannelDefinition[] = [
  { id: 'ap.state', label: 'AP State', path: 'steering.autopilot.state', kind: 'text', dimension: 'state', canonicalUnit: 'text', allowedUnits: ['text'], precision: 0 },
  { id: 'ap.mode', label: 'AP Mode', path: 'steering.autopilot.mode', kind: 'text', dimension: 'state', canonicalUnit: 'text', allowedUnits: ['text'], precision: 0 },
  { id: 'ap.engaged', label: 'AP Engaged', path: 'steering.autopilot.engaged', kind: 'digital', dimension: 'state', canonicalUnit: 'bool', allowedUnits: ['bool'], precision: 0 },
  { id: 'ap.fault', label: 'AP Fault', path: 'steering.autopilot.fault', kind: 'text', dimension: 'state', canonicalUnit: 'text', allowedUnits: ['text'], precision: 0 },
  { id: 'ap.windHazard', label: 'Wind Hazard', path: 'steering.autopilot.windHazard', kind: 'text', dimension: 'state', canonicalUnit: 'text', allowedUnits: ['text'], precision: 0 },
  { id: 'ap.driveEnabled', label: 'Drive Enabled', path: 'steering.autopilot.drive.enabled', kind: 'digital', dimension: 'state', canonicalUnit: 'bool', allowedUnits: ['bool'], precision: 0 },
  { id: 'ap.targetHeading', label: 'Target Heading', path: 'steering.autopilot.target.headingTrue', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: 0, max: 6.283 } },
  { id: 'ap.targetWindAngle', label: 'Target Wind Angle', path: 'steering.autopilot.target.windAngleApparent', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: -3.142, max: 3.142 } },
  { id: 'ap.targetRudderAngle', label: 'Target Rudder', path: 'steering.autopilot.target.rudderAngle', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: -0.61, max: 0.61 }, limits: { low: -0.52, high: 0.52 } },
  { id: 'ap.rudderAngle', label: 'Rudder Angle', path: 'steering.rudderAngle', kind: 'analog', dimension: 'angle', canonicalUnit: 'rad', allowedUnits: ['rad', 'deg'], precision: 3, range: { min: -0.61, max: 0.61 }, limits: { low: -0.52, high: 0.52 } },
  { id: 'ap.driveCurrent', label: 'Drive Current', path: 'steering.autopilot.drive.motorCurrent', kind: 'analog', dimension: 'current', canonicalUnit: 'A', allowedUnits: ['A'], precision: 2, range: { min: 0, max: 30 }, limits: { high: 10, criticalHigh: 15 } },
];

const MOCK_DEPTH: SimulationChannelDefinition = {
  id: 'depth.belowTransducer', label: 'Depth', path: 'environment.depth.belowTransducer', kind: 'analog', dimension: 'depth', canonicalUnit: 'm', allowedUnits: ['m', 'ft'], precision: 2, range: { min: 0, max: 100 }, limits: { low: 2, criticalLow: 1 },
};

const generalParams = (durationMs: number): SimulationScenarioDocument['parameters'] => [
  { id: 'seed', label: 'Random Seed', type: 'number', defaultValue: 42, min: 1, max: 9999, step: 1, group: 'General' },
  { id: 'speed', label: 'Simulation Speed', type: 'number', defaultValue: 1, min: 0.25, max: 4, step: 0.25, unit: 'x', group: 'General' },
  { id: 'durationMs', label: 'Duration', type: 'number', defaultValue: durationMs, min: 30_000, max: 3_600_000, step: 60_000, unit: 'ms', group: 'General' },
];
const WIND_PARAMS: SimulationScenarioDocument['parameters'] = [
  { id: 'windSpeedKt', label: 'True Wind Speed', type: 'number', defaultValue: 12, min: 0, max: 50, step: 1, unit: 'kt', group: 'Wind' },
  { id: 'windDirDeg', label: 'True Wind Direction', type: 'number', defaultValue: 45, min: 0, max: 360, step: 1, unit: 'deg', group: 'Wind' },
  { id: 'gustProbability', label: 'Gust Probability', type: 'number', defaultValue: 0.2, min: 0, max: 1, step: 0.05, unit: 'ratio', group: 'Wind' },
  { id: 'gustMaxDeltaKt', label: 'Gust Max Delta', type: 'number', defaultValue: 6, min: 0, max: 20, step: 0.5, unit: 'kt', group: 'Wind' },
];
const NAV_PARAMS: SimulationScenarioDocument['parameters'] = [
  { id: 'boatSpeedKt', label: 'Boat Speed', type: 'number', defaultValue: 6.5, min: 0, max: 20, step: 0.5, unit: 'kt', group: 'Navigation' },
  { id: 'courseDeg', label: 'Base Course', type: 'number', defaultValue: 66, min: 0, max: 360, step: 1, unit: 'deg', group: 'Navigation' },
];

const MOCK_SCENARIOS: SimulationScenarioDocument[] = [
  {
    id: 'ap-sail',
    version: '1.0.0',
    name: 'Autopilot — Sail (Wind Mode)',
    description: 'Piloto en modo viento: gobierna a un ángulo de viento aparente objetivo. Velero en movimiento, viento real + aparente, detección de racha, respuesta de timón y drive.',
    category: 'safety',
    mode: 'data',
    defaultDurationMs: 180_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(180_000),
      ...WIND_PARAMS,
      ...NAV_PARAMS,
      { id: 'targetAwaDeg', label: 'Target Apparent Wind Angle', type: 'number', defaultValue: 42, min: 20, max: 160, step: 1, unit: 'deg', group: 'Autopilot' },
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, ...MOCK_ELEC, ...MOCK_AP],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Engage wind mode' },
      { id: 'settle', atSimulatedMs: 30_000, type: 'marker', label: 'AWA holding on target' },
      { id: 'gust', atSimulatedMs: 42_000, type: 'marker', label: 'Apparent wind gust' },
    ],
    tags: ['autopilot', 'sail', 'wind', 'gust'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ap-motor',
    version: '1.0.0',
    name: 'Autopilot — Motor (Heading Hold)',
    description: 'Piloto manteniendo rumbo de compás a motor: velero en movimiento, RPM/temperatura de motor, corriente de drive, timón y heading objetivo vs real.',
    category: 'safety',
    mode: 'data',
    defaultDurationMs: 180_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(180_000),
      ...NAV_PARAMS,
      { id: 'targetHeadingDeg', label: 'Target Heading', type: 'number', defaultValue: 66, min: 0, max: 360, step: 1, unit: 'deg', group: 'Autopilot' },
      { id: 'batteryV', label: 'Battery Voltage', type: 'number', defaultValue: 12.8, min: 10, max: 16, step: 0.1, unit: 'V', group: 'Electrical' },
      { id: 'engineRpm', label: 'Engine RPM', type: 'number', defaultValue: 1800, min: 0, max: 3000, step: 50, unit: 'rpm', group: 'Engine' },
      ...WIND_PARAMS.slice(0, 2),
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, ...MOCK_ELEC, ...MOCK_ENGINE, ...MOCK_AP],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Engage compass mode' },
      { id: 'settle', atSimulatedMs: 30_000, type: 'marker', label: 'Heading settled on target' },
      { id: 'disturb', atSimulatedMs: 90_000, type: 'marker', label: 'Course disturbance' },
    ],
    tags: ['autopilot', 'motor', 'heading', 'engine'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ap-safety',
    version: '1.0.0',
    name: 'Autopilot — Safety / Failsafe',
    description: 'Caso failsafe: a motor con heading hold hasta que la tensión cae bajo el corte, forzando FAULT y deshabilitando el drive.',
    category: 'safety',
    mode: 'data',
    defaultDurationMs: 120_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(120_000),
      { id: 'faultStartSec', label: 'Fault Onset', type: 'number', defaultValue: 30, min: 5, max: 300, step: 5, unit: 's', group: 'Safety' },
      ...NAV_PARAMS,
      { id: 'targetHeadingDeg', label: 'Target Heading', type: 'number', defaultValue: 66, min: 0, max: 360, step: 1, unit: 'deg', group: 'Autopilot' },
      { id: 'batteryV', label: 'Battery Voltage', type: 'number', defaultValue: 12.8, min: 10, max: 16, step: 0.1, unit: 'V', group: 'Electrical' },
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, ...MOCK_ELEC, ...MOCK_ENGINE, ...MOCK_AP],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Heading hold engaged' },
      { id: 'fault', atSimulatedMs: 30_000, type: 'marker', label: 'Low-voltage cutoff → FAULT' },
    ],
    tags: ['autopilot', 'safety', 'failsafe', 'battery'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ap-sail-adverse',
    version: '1.0.0',
    name: 'Autopilot — Sail · Adverse',
    description: 'Prueba de estrés en modo viento: viento fuerte y rolón, rachas frecuentes, guiñada por olas y peligro de trasluchada accidental. El piloto recupera el AWA con grandes movimientos de timón y corriente de drive.',
    category: 'safety',
    mode: 'data',
    defaultDurationMs: 180_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(180_000),
      { id: 'windSpeedKt', label: 'True Wind Speed', type: 'number', defaultValue: 22, min: 0, max: 50, step: 1, unit: 'kt', group: 'Wind' },
      { id: 'windDirDeg', label: 'True Wind Direction', type: 'number', defaultValue: 45, min: 0, max: 360, step: 1, unit: 'deg', group: 'Wind' },
      { id: 'gustProbability', label: 'Gust Probability', type: 'number', defaultValue: 0.6, min: 0, max: 1, step: 0.05, unit: 'ratio', group: 'Wind' },
      { id: 'gustMaxDeltaKt', label: 'Gust Max Delta', type: 'number', defaultValue: 14, min: 0, max: 20, step: 0.5, unit: 'kt', group: 'Wind' },
      ...NAV_PARAMS,
      { id: 'targetAwaDeg', label: 'Target Apparent Wind Angle', type: 'number', defaultValue: 42, min: 20, max: 160, step: 1, unit: 'deg', group: 'Autopilot' },
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, ...MOCK_ELEC, ...MOCK_AP],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Engage wind mode (rough)' },
      { id: 'gust', atSimulatedMs: 18_000, type: 'marker', label: 'Heavy gust front' },
      { id: 'tack', atSimulatedMs: 36_000, type: 'marker', label: 'Accidental-tack hazard' },
      { id: 'shift', atSimulatedMs: 60_000, type: 'marker', label: 'Large wind shift' },
    ],
    tags: ['autopilot', 'sail', 'adverse', 'gust', 'stress'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ap-motor-adverse',
    version: '1.0.0',
    name: 'Autopilot — Motor · Adverse',
    description: 'Prueba de estrés en heading-hold a motor con mar de través/corriente cruzada: fuertes guiñadas desvían la proa y el piloto aplica correcciones de timón grandes y frecuentes a alta corriente de drive.',
    category: 'safety',
    mode: 'data',
    defaultDurationMs: 180_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(180_000),
      { id: 'boatSpeedKt', label: 'Boat Speed', type: 'number', defaultValue: 5.5, min: 0, max: 20, step: 0.5, unit: 'kt', group: 'Navigation' },
      { id: 'courseDeg', label: 'Base Course', type: 'number', defaultValue: 66, min: 0, max: 360, step: 1, unit: 'deg', group: 'Navigation' },
      { id: 'targetHeadingDeg', label: 'Target Heading', type: 'number', defaultValue: 66, min: 0, max: 360, step: 1, unit: 'deg', group: 'Autopilot' },
      { id: 'batteryV', label: 'Battery Voltage', type: 'number', defaultValue: 12.8, min: 10, max: 16, step: 0.1, unit: 'V', group: 'Electrical' },
      { id: 'engineRpm', label: 'Engine RPM', type: 'number', defaultValue: 1800, min: 0, max: 3000, step: 50, unit: 'rpm', group: 'Engine' },
      { id: 'windSpeedKt', label: 'True Wind Speed', type: 'number', defaultValue: 20, min: 0, max: 50, step: 1, unit: 'kt', group: 'Wind' },
      { id: 'windDirDeg', label: 'True Wind Direction', type: 'number', defaultValue: 45, min: 0, max: 360, step: 1, unit: 'deg', group: 'Wind' },
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, ...MOCK_ELEC, ...MOCK_ENGINE, ...MOCK_AP],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Engage compass mode (rough)' },
      { id: 'seaway', atSimulatedMs: 20_000, type: 'marker', label: 'Beam sea building' },
      { id: 'set', atSimulatedMs: 60_000, type: 'marker', label: 'Cross-current set' },
    ],
    tags: ['autopilot', 'motor', 'adverse', 'seaway', 'stress'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nav-sail',
    version: '1.0.0',
    name: 'Navigation — Sailing (Free Helm)',
    description: 'Velero navegando libre con viento, profundidad y datos eléctricos. Sin autopilot — practica creando waypoints y rutas en la carta, luego activa el autopilot en modo TRACK para seguirlas.',
    category: 'navigation' as SimulationScenarioDocument['category'],
    mode: 'data',
    defaultDurationMs: 300_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(300_000),
      ...WIND_PARAMS,
      ...NAV_PARAMS,
      { id: 'depthM', label: 'Base Depth', type: 'number', defaultValue: 15, min: 1, max: 200, step: 1, unit: 'm', group: 'Environment' },
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, MOCK_DEPTH, ...MOCK_ELEC],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Departure' },
      { id: 'wind-shift', atSimulatedMs: 60_000, type: 'marker', label: 'Wind shift' },
      { id: 'shallow', atSimulatedMs: 120_000, type: 'marker', label: 'Shallow water approach' },
    ],
    tags: ['navigation', 'sail', 'wind', 'depth', 'free'],
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nav-motor',
    version: '1.0.0',
    name: 'Navigation — Motor Cruising (Free Helm)',
    description: 'Barco a motor navegando libre con motor, profundidad y datos eléctricos. Sin autopilot — practica creando waypoints y rutas en la carta, luego activa el autopilot en modo TRACK para seguirlas.',
    category: 'navigation' as SimulationScenarioDocument['category'],
    mode: 'data',
    defaultDurationMs: 300_000,
    defaultSpeed: 1,
    parameters: [
      ...generalParams(300_000),
      ...NAV_PARAMS,
      { id: 'engineRpm', label: 'Engine RPM', type: 'number', defaultValue: 1800, min: 0, max: 3000, step: 50, unit: 'rpm', group: 'Engine' },
      { id: 'batteryV', label: 'Battery Voltage', type: 'number', defaultValue: 12.8, min: 10, max: 16, step: 0.1, unit: 'V', group: 'Electrical' },
      { id: 'depthM', label: 'Base Depth', type: 'number', defaultValue: 15, min: 1, max: 200, step: 1, unit: 'm', group: 'Environment' },
      ...WIND_PARAMS.slice(0, 2),
    ],
    channels: [...MOCK_NAV, ...MOCK_WIND, MOCK_DEPTH, ...MOCK_ELEC, ...MOCK_ENGINE],
    timeline: [
      { id: 'start', atSimulatedMs: 0, type: 'marker', label: 'Departure' },
      { id: 'channel', atSimulatedMs: 90_000, type: 'marker', label: 'Channel transit' },
      { id: 'approach', atSimulatedMs: 180_000, type: 'marker', label: 'Anchoring approach' },
    ],
    tags: ['navigation', 'motor', 'engine', 'depth', 'free'],
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
  timer: ReturnType<typeof setTimeout> | null;
  intervalMs: number;
  simulatedMs: number;
  tick: number;
  lastPublishedAt: number;
}

@Injectable({ providedIn: 'root' })
export class SimulationFacadeService {
  private readonly store = inject(DatapointStoreService);
  readonly api = inject(SimulationApiService);
  private readonly zone = inject(NgZone);

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
  private samplePollTimer: ReturnType<typeof setTimeout> | null = null;
  private leaseTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly ticker$ = outsideZoneTicker(this.zone, 500);
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

  readonly canAbortActiveRun = computed(() => {
    const run = this.activeRun();
    return Boolean(run && run.status !== 'passed' && run.status !== 'failed' && run.status !== 'aborted');
  });

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
        const params = this.parameters();
        const speed = Number(params['speed'] ?? scenario.defaultSpeed);
        const seed = Number(params['seed'] ?? 42);
        const run = await this.api.startRun(scenario.id, armed.token, params, scenario.mode, speed, seed);
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
    if (!run || !this.canAbortActiveRun()) return;
    this.busy.set(true);
    try {
      this.activeRun.set(await this.api.abortRun(run.id));
      await this.refreshHistory();
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.activeRun.set({
        ...run,
        status: 'aborted',
        completedAtUtc: new Date().toISOString(),
        failureReason: 'Abort requested locally; server response unavailable',
      });
    } finally {
      this.stopSamplePolling();
      this.stopLeaseRenewal();
      this.api.disconnectEvents();
      this.busy.set(false);
    }
  }

  async clearRunHistory(): Promise<void> {
    if (this.busy() || this.activeRun()?.status === 'running') return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.useOffline()) {
        this.runHistory.set([]);
      } else {
        await this.api.clearRuns();
        this.runHistory.set([]);
      }
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
    this.stopLeaseRenewal();
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
      if (this.isNotFoundError(error)) {
        this.stopLeaseRenewal();
        this.stopSamplePolling();
        this.api.disconnectEvents();
        try {
          this.activeRun.set(await this.api.getRun(run.id));
          await this.refreshHistory();
        } catch {
          this.activeRun.set({
            ...run,
            status: 'aborted',
            completedAtUtc: new Date().toISOString(),
            failureReason: 'Run process is no longer active; returned to safe state',
          });
        }
        return;
      }
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
      intervalMs: Math.max(100, 1000 / (run.speed * 10)),
      simulatedMs: 0,
      tick: 0,
      lastPublishedAt: 0,
    };
    this.offlineRun = state;

    // Emit initial events
    this.addOfflineEvent(state, 'run', 0, `Escenario "${scenario.name}" iniciado (modo offline)`);
    this.addOfflineEvent(state, 'step', 0, 'Armado completado');
    this.addOfflineEvent(state, 'step', 10, 'Inicialización completada');

    // Start simulation loop
    this.scheduleOfflineTick(state, scenario);
  }

  private scheduleOfflineTick(state: OfflineRunState, scenario: SimulationScenarioDocument): void {
    this.zone.runOutsideAngular(() => {
      state.timer = setTimeout(() => {
        state.timer = null;
        this.offlineTick(state, scenario);
        if (this.offlineRun === state && state.run.status === 'running') {
          this.scheduleOfflineTick(state, scenario);
        }
      }, state.intervalMs);
    });
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
      const value = this.generateOfflineValue(channel.id, state.simulatedMs, state.run.seed, scenario.id);
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

    const now = Date.now();
    if (now - state.lastPublishedAt >= OFFLINE_UI_PUBLISH_INTERVAL_MS) {
      state.lastPublishedAt = now;
      this.publishOfflineState(state);
      // Feed the shared datapoint store so the chart map, instruments and wind vectors move
      // during a run, exactly as they would from a live backend over Signal K.
      this.injectToStore(Array.from(state.snapshots.values()));
    }
  }

  /**
   * Mirrors simulation channel values into the shared datapoint store so the chart map, instruments
   * and wind vectors update from the same source the rest of the UI reads. Used for both offline and
   * backend runs (the backend may publish Signal K to a different host than the UI reads). Faulted
   * channels are skipped to emulate sensor dropout (e.g. GPS loss freezes the vessel on the map).
   */
  private injectToStore(entries: Array<{ channelId: string; value: unknown; quality: string }>): void {
    const defs = this.channelDefinitions();
    const timestamp = Date.now();
    const points: DataPoint[] = [];
    for (const entry of entries) {
      const path = defs.get(entry.channelId)?.path;
      if (!path || entry.quality === 'bad') continue;
      points.push({ path, value: entry.value, timestamp, source: 'simulation' });
    }
    if (points.length > 0) {
      this.zone.runOutsideAngular(() => this.store.update(points));
    }
  }

  private publishOfflineState(state: OfflineRunState): void {
    const snapshots = new Map(state.snapshots);
    const samples = new Map(state.samples);
    const events = [...state.events];
    const run = { ...state.run };
    this.zone.run(() => {
      this.channelSnapshots.set(snapshots);
      this.sampleHistory.set(samples);
      this.events.set(events);
      this.activeRun.set(run);
    });
  }

  /**
   * Deterministic boat motion + coupled true/apparent wind for the offline run, so the vessel
   * actually travels and the apparent wind is the true wind plus the boat's velocity (matching the
   * backend physics). Pure function of (t, seed) so every channel stays mutually consistent.
   */
  private offlineKinematics(t: number, seed: number, adverse: boolean): {
    courseRad: number; headingRad: number; sogMs: number; latitude: number; longitude: number;
    twsMs: number; twdRad: number; awsMs: number; awaRad: number;
  } {
    // Adverse runs add big wave/current yaw and wind shifts so the offline pilot has to fight back.
    const isGust = adverse ? t % 30 >= 18 && t % 30 < 27 : t % 60 >= 42 && t % 60 < 54;
    const disturbance = adverse
      ? 0.32 * Math.sin(t / 6.5) + 0.16 * Math.sin(t / 2.1) + (isGust ? 0.28 * Math.sin(t * 1.7) : 0)
      : 0;
    const courseRad = wrapRadians((66 * Math.PI) / 180 + (seed % 31) * 0.003 + 0.18 * Math.sin(t / 90) + disturbance);
    const headingRad = wrapRadians(courseRad + 0.06 * Math.sin(t * 0.05));
    const sogMs = Math.max(0, (adverse ? 3.2 : 4.0) + 0.6 * Math.sin(t / 30) + (adverse ? 0.5 * Math.sin(t / 4) : 0));

    const originLat = 42.2406;
    const originLon = -8.7207;
    const distanceMeters = sogMs * t;
    const north = Math.cos(courseRad) * distanceMeters;
    const east = Math.sin(courseRad) * distanceMeters;
    const latitude = originLat + north / 111_320;
    const longitude = originLon + east / (111_320 * Math.cos((originLat * Math.PI) / 180));

    const twsMs = (adverse ? 10 : 6) + 2 * Math.sin(t * 0.05);
    const twdRad = wrapRadians((45 * Math.PI) / 180 + 0.2 * Math.sin(t / 120) + (adverse ? 0.45 * Math.sin(t / 17) : 0));
    const twa = wrapToPi(twdRad - headingRad);
    const awsMs = Math.sqrt(twsMs * twsMs + sogMs * sogMs + 2 * twsMs * sogMs * Math.cos(twa));
    const awaRad = Math.atan2(twsMs * Math.sin(twa), twsMs * Math.cos(twa) + sogMs);

    return { courseRad, headingRad, sogMs, latitude, longitude, twsMs, twdRad, awsMs, awaRad };
  }

  private generateOfflineValue(channelId: string, simulatedMs: number, seed: number, scenarioId: string): unknown {
    const t = simulatedMs / 1000;
    const phase = (t * 0.1) + (seed % 100);
    const adverse = scenarioId.endsWith('-adverse');
    const k = this.offlineKinematics(t, seed, adverse);
    const ap = this.offlineAutopilot(t, scenarioId, k.headingRad);
    switch (channelId) {
      case 'nav.sog': return k.sogMs;
      case 'nav.cog': return k.courseRad;
      case 'nav.heading': return k.headingRad;
      case 'nav.position': return { latitude: k.latitude, longitude: k.longitude };
      case 'wind.aws': return k.awsMs;
      case 'wind.awa': return ap.awaTarget ?? k.awaRad;
      case 'wind.tws': return k.twsMs;
      case 'wind.twd': return k.twdRad;
      case 'depth.belowTransducer': {
        const depthParam = this.parameters()['depthM'];
        const baseDepth = typeof depthParam === 'number' ? depthParam : 12;
        return baseDepth + 4 * Math.sin(phase * 0.3) + Math.random() * 0.3;
      }
      case 'elec.voltage': return ap.voltage ?? (12.6 + 0.8 * Math.sin(phase * 0.5) + Math.random() * 0.1);
      case 'elec.current': return 5 + 3 * Math.sin(phase * 0.8) + Math.random() * 0.5;
      case 'elec.soc': return 0.7 + 0.2 * Math.sin(phase * 0.2);
      case 'motor.rpm': return Number(this.parameters()['engineRpm'] ?? 1800) / 60 + 4 * Math.sin(phase * 0.4) + Math.random();
      case 'motor.coolant': return 355 + 10 * Math.sin(phase * 0.3) + Math.random() * 2;
      case 'motor.oil': return 300_000 + 50_000 * Math.sin(phase * 0.6);
      case 'motor.fuel': return 0.6 + 0.1 * Math.sin(phase * 0.1);
      case 'motor.fuelRate': return 0.000_002_5 + Math.random() * 1e-7;
      case 'env.waterTemp': return 290 + 2 * Math.sin(phase * 0.2);
      case 'env.airTemp': return 295 + 3 * Math.sin(phase * 0.15);
      case 'env.baro': return 101_325 + 200 * Math.sin(phase * 0.1);
      case 'env.humidity': return 0.65 + 0.1 * Math.sin(phase * 0.25);
      case 'ap.state': return ap.state;
      case 'ap.mode': return ap.mode;
      case 'ap.engaged': return ap.engaged;
      case 'ap.driveEnabled':
      case 'ap.clutch': return ap.driveEnabled;
      case 'ap.fault': return ap.fault;
      case 'ap.windHazard': return ap.windHazard;
      case 'ap.noGo': return false;
      case 'ap.targetHeading': return ap.targetHeading;
      case 'ap.targetWindAngle': return ap.targetWindAngle;
      case 'ap.targetRudderAngle': return ap.targetRudder;
      case 'ap.rudderAngle': return ap.rudder;
      case 'ap.driveCurrent': return ap.driveCurrent;
      default: return Math.random() * 100;
    }
  }

  /**
   * Compact mirror of the backend autopilot model for the three curated scenarios, so the offline
   * run shows the same piloto/motor signals and steers the moving vessel.
   */
  private offlineAutopilot(t: number, scenarioId: string, headingRad: number): {
    state: string; mode: string; engaged: boolean; driveEnabled: boolean; fault: string;
    windHazard: string; targetHeading: number; targetWindAngle: number; targetRudder: number;
    rudder: number; driveCurrent: number; voltage: number | null; awaTarget: number | null;
  } {
    const adverse = scenarioId.endsWith('-adverse');
    const baseId = scenarioId.replace(/-adverse$/, '');
    const kind = baseId === 'ap-sail' ? 'sail' : baseId === 'ap-motor' ? 'motor' : baseId === 'ap-safety' ? 'safety' : null;
    const params = this.parameters();
    const num = (key: string, fallback: number): number => typeof params[key] === 'number' ? params[key] as number : fallback;
    const d2r = (deg: number): number => deg * Math.PI / 180;
    const clampN = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
    if (!kind) {
      return { state: 'standby', mode: 'compass', engaged: false, driveEnabled: false, fault: 'none', windHazard: 'none', targetHeading: headingRad, targetWindAngle: 0, targetRudder: 0, rudder: 0, driveCurrent: 0, voltage: null, awaTarget: null };
    }
    const targetAwaDeg = num('targetAwaDeg', 42);
    const targetHeadingDeg = num('targetHeadingDeg', num('courseDeg', 66));
    const faultStart = num('faultStartSec', 30);
    const faulted = kind === 'safety' && t >= faultStart;
    const isGust = adverse ? t % 30 >= 18 && t % 30 < 27 : t % 60 >= 42 && t % 60 < 54;
    const isAccidentalTack = adverse && kind === 'sail' && t % 48 >= 36 && t % 48 < 41;
    const awaHeld = clampN(d2r(targetAwaDeg) + (isGust ? d2r(adverse ? 26 : 12) * Math.sin(t * 1.3) : d2r(adverse ? 7 : 3) * Math.sin(t / 9)), -Math.PI, Math.PI);
    const targetHeading = kind === 'motor' || kind === 'safety' ? d2r(targetHeadingDeg) : wrapRadians(headingRad);
    // Compass modes steer on heading error; wind mode steers to cancel the apparent-wind-angle error.
    const error = kind === 'sail' ? wrapToPi(awaHeld - d2r(targetAwaDeg)) : wrapToPi(targetHeading - headingRad);
    const targetRudder = clampN(error * (kind === 'sail' ? 1.6 : 1.3), -0.5, 0.5);
    const rudder = clampN(targetRudder * 0.85, -0.61, 0.61);
    return {
      state: faulted ? 'fault' : kind === 'sail' ? 'wind' : 'auto',
      mode: kind === 'sail' ? 'wind' : 'compass',
      engaged: !faulted,
      driveEnabled: !faulted,
      fault: faulted ? 'low-battery' : 'none',
      windHazard: kind !== 'sail' ? 'none' : isAccidentalTack ? 'accidental-tack' : isGust ? 'gust' : 'none',
      targetHeading,
      targetWindAngle: d2r(targetAwaDeg),
      targetRudder: faulted ? 0 : targetRudder,
      rudder: faulted ? 0 : rudder,
      driveCurrent: faulted ? 0 : Math.max(0, 1.2 + Math.abs(rudder) * 9),
      voltage: faulted ? 10.6 : null,
      awaTarget: kind === 'sail' ? awaHeld : null,
    };
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
      clearTimeout(state.timer);
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
    this.publishOfflineState(state);
    this.zone.run(() => {
      this.runHistory.update((history) => [{
        id: state.run.id,
        scenarioId: state.run.scenarioId,
        status: state.run.status,
        startedAtUtc: state.run.startedAtUtc,
        completedAtUtc: state.run.completedAtUtc,
        simulatedTimeMs: state.run.simulatedTimeMs,
        mode: state.run.mode,
      }, ...history]);
    });
    this.offlineRun = null;
  }

  // ── Backend-connected run ────────────────────────────────────────────────

  private connectRun(run: SimulationRun): void {
    this.lastSequence = 0;
    this.stopSamplePolling();
    this.stopLeaseRenewal();
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
    this.scheduleSamplePoll(run.id);
    this.scheduleLeaseRenewal();
  }

  private scheduleSamplePoll(runId: string): void {
    this.zone.runOutsideAngular(() => {
      this.samplePollTimer = setTimeout(() => {
        this.samplePollTimer = null;
        void this.pollSamples(runId).finally(() => {
          if (this.activeRun()?.id === runId && this.activeRun()?.status === 'running') {
            this.scheduleSamplePoll(runId);
          }
        });
      }, SAMPLE_POLL_INTERVAL_MS);
    });
  }

  private scheduleLeaseRenewal(): void {
    this.zone.runOutsideAngular(() => {
      this.leaseTimer = setTimeout(() => {
        this.leaseTimer = null;
        void this.leaseActiveRun().finally(() => {
          if (this.activeRun()?.status === 'running') {
            this.scheduleLeaseRenewal();
          }
        });
      }, 10_000);
    });
  }

  private stopSamplePolling(): void {
    if (this.samplePollTimer) {
      clearTimeout(this.samplePollTimer);
      this.samplePollTimer = null;
    }
  }

  private stopLeaseRenewal(): void {
    if (this.leaseTimer) {
      clearTimeout(this.leaseTimer);
      this.leaseTimer = null;
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
        if (batch.tick > maxTick) maxTick = batch.tick;
      }
      this.zone.run(() => {
        for (const batch of batches) {
          this.addSampleBatch(batch);
        }
        this.lastSampleTick.set(maxTick);
      });
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
    // Mirror to the shared store so the chart map + instruments move during a backend run too.
    this.injectToStore(batch.samples);
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
      if (event.kind === 'safe-state' || (event.kind === 'run' && /superada|fallida|abortada|desconectada/i.test(event.message))) {
        void this.api.getRun(run.id).then((updated) => {
          this.activeRun.set(updated);
          this.stopLeaseRenewal();
          this.stopSamplePolling();
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

  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === 404;
  }
}

const wrapRadians = (value: number): number => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
const wrapToPi = (value: number): number => {
  const wrapped = wrapRadians(value);
  return wrapped > Math.PI ? wrapped - Math.PI * 2 : wrapped;
};
