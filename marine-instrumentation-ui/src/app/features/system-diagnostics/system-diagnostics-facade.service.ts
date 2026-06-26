import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, timer } from 'rxjs';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import type { DataPoint } from '../../state/datapoints/datapoint.models';

export interface SystemDiagnosticsRow {
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
}

const GROUP_LABELS: Record<string, string> = {
  navigation: 'Navegación',
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

const UNIT_LABELS: Record<string, string> = {
  rad: 'rad',
  'm/s': 'm/s',
  V: 'V',
  A: 'A',
  m: 'm',
  K: 'K',
  Pa: 'Pa',
  Hz: 'Hz',
};

@Injectable({ providedIn: 'root' })
export class SystemDiagnosticsFacadeService {
  private readonly store = inject(DatapointStoreService);
  readonly filterText = signal('');

  private readonly ticker$ = timer(0, 500);
  private readonly liveRows = toSignal(
    combineLatest([this.store.state$, this.ticker$]).pipe(
      map(([dataMap]) => this.toLiveRows(dataMap)),
    ),
    { initialValue: [] as SystemDiagnosticsRow[] },
  );

  readonly rows = computed(() => {
    const rows = this.liveRows();
    const filter = this.filterText().trim().toLowerCase();
    return (filter
      ? rows.filter((row) =>
          row.path.toLowerCase().includes(filter) ||
          row.source.toLowerCase().includes(filter) ||
          row.group.toLowerCase().includes(filter))
      : rows
    ).sort((a, b) => a.group.localeCompare(b.group) || a.path.localeCompare(b.path));
  });

  setFilter(value: string): void {
    this.filterText.set(value);
  }

  private toLiveRows(dataMap: Map<string, DataPoint>): SystemDiagnosticsRow[] {
    const now = Date.now();
    return Array.from(dataMap.values()).map((point) => {
      const ageSeconds = (now - point.timestamp) / 1000;
      return {
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
      };
    });
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4);
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  }

  private unitForPath(path: string): string {
    if (/heading|angle|rudder/i.test(path)) return UNIT_LABELS['rad'] ?? '';
    if (/speed/i.test(path)) return UNIT_LABELS['m/s'] ?? '';
    if (/voltage/i.test(path)) return UNIT_LABELS['V'] ?? '';
    if (/current/i.test(path)) return UNIT_LABELS['A'] ?? '';
    if (/depth/i.test(path)) return UNIT_LABELS['m'] ?? '';
    if (/temperature/i.test(path)) return UNIT_LABELS['K'] ?? '';
    if (/pressure/i.test(path)) return UNIT_LABELS['Pa'] ?? '';
    if (/revolutions/i.test(path)) return UNIT_LABELS['Hz'] ?? '';
    return '';
  }

  private groupForPath(path: string): string {
    const root = path.split('.')[0] ?? 'system';
    return GROUP_LABELS[root] ?? 'Sistema';
  }
}
