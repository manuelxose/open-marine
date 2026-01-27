import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer, combineLatest } from 'rxjs';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { DataPoint } from '../../state/datapoints/datapoint.models';

type DiagnosticsRow = DataPoint<unknown> & { age: number };

@Component({
  selector: 'app-diagnostics-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="diag-page p-4">
      <div class="toolbar mb-4 flex gap-4">
        <input 
          type="text" 
          placeholder="Filter paths..." 
          class="search-input"
          [ngModel]="filterText()"
          (ngModelChange)="filterText.set($event)"
        >
        <div class="stats text-muted">
          Tracking {{ (filteredList() || []).length }} points
        </div>
      </div>

      <div class="table-container">
        <table class="diag-table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Value</th>
              <th>Age</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of filteredList(); trackBy: trackByPath">
              <td class="path-col" [title]="row.path">{{ row.path }}</td>
              <td class="value-col">{{ formatValue(row.value) }}</td>
              <td class="age-col" [class.warn]="row.age > 2" [class.bad]="row.age > 5">
                {{ row.age | number:'1.1-1' }}s
              </td>
              <td class="source-col">{{ row.source }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .diag-page { height: 100%; display: flex; flex-direction: column; }
    .toolbar { flex-shrink: 0; }
    .table-container { flex-grow: 1; overflow: auto; background: var(--card-bg); border-radius: var(--border-radius); border: 1px solid var(--card-border); }
    .diag-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border); }
    th { background: var(--bg); position: sticky; top: 0; font-weight: 600; }
    .search-input { 
      padding: 0.5rem; 
      border-radius: 6px; 
      border: 1px solid var(--card-border); 
      background: var(--card-bg); 
      color: var(--fg);
      width: 300px;
    }
    .warn { color: var(--warn); }
    .bad { color: var(--danger); }
    .path-col { font-family: monospace; }
  `]
})
export class DiagnosticsPage {
  private store = inject(DatapointStoreService);
  
  // We need a signal for filter
  // Angular 16+ signals:
  filterText =  signalPrimitive(''); // Helper below since 'signal' is not imported as value? 
  // Wait, I can import { signal } from '@angular/core'.
  
  // Ticker for ages
  ticker$ = timer(0, 500);
  
  // All data from store
  // Note: store.state$ emits the Map.
  allData$ = combineLatest([this.store.state$, this.ticker$]).pipe(
    map(([dataMap, _]) => {
      const now = Date.now();
      return Array.from(dataMap.values()).map(p => ({
        ...p,
        age: (now - p.timestamp) / 1000
      })) as DiagnosticsRow[];
    })
  );

  allData = toSignal(this.allData$, { initialValue: [] });
  
  // Filtered
  filteredList = computed(() => {
    const list = this.allData();
    const txt = this.filterText().toLowerCase();
    if (!txt) return list.sort((a,b) => a.path.localeCompare(b.path));
    
    return list.filter(p => p.path.toLowerCase().includes(txt))
               .sort((a,b) => a.path.localeCompare(b.path));
  });

  trackByPath(index: number, item: DiagnosticsRow): string {
    return item.path;
  }

  formatValue(val: unknown): string {
    if (typeof val === 'number') return val.toFixed(4);
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
}

// Small workaround if 'signal' from core isn't available in this env, but it should be.
import { signal as signalPrimitive } from '@angular/core';
