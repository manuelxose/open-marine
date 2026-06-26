import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SystemDiagnosticsFacadeService } from './system-diagnostics-facade.service';

@Component({
  selector: 'app-system-diagnostics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sys-diag-page">
      <header class="sys-diag-header">
        <div>
          <span class="eyebrow">OMI SYSTEM DIAGNOSTICS</span>
          <h1>{{ 'systemDiagnostics.title' | translate }}</h1>
          <p>{{ 'systemDiagnostics.subtitle' | translate }}</p>
        </div>
      </header>

      <section class="panel data-panel">
        <div class="data-toolbar">
          <input
            type="search"
            [placeholder]="'diagnostics.page.search_placeholder' | translate"
            [ngModel]="facade.filterText()"
            (ngModelChange)="facade.setFilter($event)">
          <div class="data-stats">
            <span>{{ facade.rows().length }} SIGNALS</span>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>{{ 'diagnostics.page.table.path' | translate }}</th>
                <th>{{ 'diagnostics.page.table.value' | translate }}</th>
                <th>Unit</th>
                <th>Quality</th>
                <th>{{ 'diagnostics.page.table.age' | translate }}</th>
                <th>{{ 'diagnostics.page.table.source' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of facade.rows(); track row.path) {
                <tr>
                  <td><span class="group-chip">{{ row.group }}</span></td>
                  <td class="path-cell" [title]="row.path">{{ row.path }}</td>
                  <td class="value-cell" [title]="row.formattedValue">{{ row.formattedValue }}</td>
                  <td>{{ row.unit || '—' }}</td>
                  <td><span class="quality" [attr.data-quality]="row.quality">{{ row.quality | uppercase }}</span></td>
                  <td [class]="row.ageClass">{{ row.ageSeconds | number:'1.1-1' }} s</td>
                  <td>{{ row.source }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    .sys-diag-page { height: 100%; min-height: 0; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); color: var(--gb-text-value); background: var(--gb-bg-canvas); }
    .sys-diag-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
    .sys-diag-header h1 { margin: 2px 0; font-size: clamp(1.35rem, 2vw, 1.8rem); }
    .sys-diag-header p { margin: 0; color: var(--gb-text-muted); font-size: 0.8rem; }
    .eyebrow { display: block; color: var(--gb-tick-reference); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    .panel { min-width: 0; min-height: 0; background: var(--gb-bg-panel); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
    .data-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .data-toolbar { min-height: 58px; padding: var(--space-2) var(--space-3); display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); border-bottom: 1px solid var(--gb-border-panel); }
    .data-toolbar input { width: min(420px, 100%); min-height: 40px; padding: 0 var(--space-3); color: var(--gb-text-value); background: var(--gb-bg-face); border: 1px solid var(--gb-border-panel); border-radius: var(--radius-md); }
    .data-toolbar input:focus { outline: none; border-color: var(--gb-border-active); }
    .data-stats { display: flex; gap: var(--space-2); color: var(--gb-text-muted); font: 0.66rem var(--font-mono, monospace); }
    .table-container { flex: 1; min-height: 0; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.74rem; }
    th, td { max-width: 360px; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--gb-border-panel); text-align: left; white-space: nowrap; }
    th { position: sticky; top: 0; z-index: 1; color: var(--gb-text-muted); background: var(--gb-bg-bezel); font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .path-cell, .value-cell { overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono, monospace); }
    .value-cell { color: var(--gb-text-value); }
    td.fresh { color: var(--gb-data-good); }
    td.stale { color: var(--gb-data-warn); }
    td.dead { color: var(--gb-data-stale); }
    .group-chip { padding: 3px 7px; border-radius: var(--radius-full); color: var(--gb-text-muted); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; }
    .quality { padding: 3px 7px; border-radius: var(--radius-full); color: var(--gb-text-muted); background: var(--gb-bg-glass); border: 1px solid var(--gb-border-panel); font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; }
    .quality[data-quality='good'] { color: var(--gb-data-good); border-color: var(--gb-data-good); }
    .quality[data-quality='warn'] { color: var(--gb-data-warn); border-color: var(--gb-data-warn); }
    .quality[data-quality='bad'] { color: var(--gb-data-stale); border-color: var(--gb-data-stale); }
  `],
})
export class SystemDiagnosticsPage {
  readonly facade = inject(SystemDiagnosticsFacadeService);
}
