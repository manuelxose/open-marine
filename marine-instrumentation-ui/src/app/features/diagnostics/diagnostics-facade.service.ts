import { Injectable, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer, combineLatest } from 'rxjs';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import type { DataPoint } from '../../state/datapoints/datapoint.models';

export interface DiagnosticsRow {
  path: string;
  value: unknown;
  formattedValue: string;
  ageSeconds: number;
  ageClass: 'fresh' | 'stale' | 'dead';
  source: string;
  timestamp: number;
}

export interface DiagnosticsViewModel {
  rows: DiagnosticsRow[];
  totalCount: number;
  filteredCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class DiagnosticsFacadeService {
  private readonly store = inject(DatapointStoreService);

  readonly filterText = signal('');

  private readonly ticker$ = timer(0, 500);

  private readonly allData$ = combineLatest([this.store.state$, this.ticker$]).pipe(
    map(([dataMap]) => {
      const now = Date.now();
      return Array.from(dataMap.values()).map((point: DataPoint): DiagnosticsRow => {
        const ageSeconds = (now - point.timestamp) / 1000;
        return {
          path: point.path,
          value: point.value,
          formattedValue: this.formatValue(point.value),
          ageSeconds,
          ageClass: ageSeconds <= 2 ? 'fresh' : ageSeconds <= 5 ? 'stale' : 'dead',
          source: point.source,
          timestamp: point.timestamp,
        };
      });
    })
  );

  private readonly allData = toSignal(this.allData$, { initialValue: [] });

  readonly vm = computed((): DiagnosticsViewModel => {
    const all = this.allData();
    const filter = this.filterText().toLowerCase();

    const filtered = filter
      ? all.filter((row) => row.path.toLowerCase().includes(filter))
      : all;

    const sorted = [...filtered].sort((a, b) => a.path.localeCompare(b.path));

    return {
      rows: sorted,
      totalCount: all.length,
      filteredCount: sorted.length,
    };
  });

  setFilter(text: string): void {
    this.filterText.set(text);
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'number') {
      return value.toFixed(4);
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
