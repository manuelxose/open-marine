import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DiagnosticsFacadeService, type DiagnosticsRow } from './diagnostics-facade.service';

@Component({
  selector: 'app-diagnostics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="diag-page">
      <div class="toolbar">
        <input
          type="text"
          [placeholder]="'diagnostics.page.search_placeholder' | translate"
          class="search-input"
          [ngModel]="facade.filterText()"
          (ngModelChange)="facade.setFilter($event)"
        />
        <div class="stats">
          {{ 'diagnostics.page.stats.showing' | translate }} {{ facade.vm().filteredCount }} {{ 'diagnostics.page.stats.of' | translate }} {{ facade.vm().totalCount }} {{ 'diagnostics.page.stats.points' | translate }}
        </div>
      </div>

      <div class="table-container">
        <table class="diag-table">
          <thead>
            <tr>
              <th>{{ 'diagnostics.page.table.path' | translate }}</th>
              <th>{{ 'diagnostics.page.table.value' | translate }}</th>
              <th>{{ 'diagnostics.page.table.age' | translate }}</th>
              <th>{{ 'diagnostics.page.table.source' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of facade.vm().rows; track row.path) {
              <tr>
                <td class="path-col" [title]="row.path">{{ row.path }}</td>
                <td class="value-col">{{ row.formattedValue }}</td>
                <td class="age-col" [class]="row.ageClass">
                  {{ row.ageSeconds | number:'1.1-1' }}s
                </td>
                <td class="source-col">{{ row.source }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .diag-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 1rem;
      gap: 1rem;
    }

    .toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .search-input {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      color: var(--fg);
      width: 300px;
      font-size: 0.875rem;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .stats {
      color: var(--muted);
      font-size: 0.875rem;
    }

    .table-container {
      flex: 1;
      overflow: auto;
      background: var(--card-bg);
      border-radius: var(--radius);
      border: 1px solid var(--card-border);
    }

    .diag-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    th, td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--card-border);
    }

    th {
      background: var(--bg);
      position: sticky;
      top: 0;
      font-weight: 600;
      color: var(--fg);
    }

    .path-col {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
    }

    .value-col {
      font-family: var(--font-mono);
    }

    .age-col {
      font-family: var(--font-mono);
    }

    .age-col.fresh {
      color: var(--success);
    }

    .age-col.stale {
      color: var(--warn);
    }

    .age-col.dead {
      color: var(--danger);
    }

    .source-col {
      color: var(--muted);
    }
  `],
})
export class DiagnosticsPage {
  readonly facade = inject(DiagnosticsFacadeService);
}
