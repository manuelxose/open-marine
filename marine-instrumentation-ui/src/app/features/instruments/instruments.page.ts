import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { InstrumentWidgetComponent } from './components/instrument-widget/instrument-widget.component';
import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_CATALOG,
  getInstrumentsByCategory,
  type InstrumentCategoryId,
  type InstrumentDefinition,
} from './data/instrument-catalog';
import { AisTargetListComponent } from '../ais/components/ais-target-list/ais-target-list.component';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';

@Component({
  selector: 'app-instruments-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    InstrumentWidgetComponent,
    AisTargetListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="instruments-page">
      <!-- Toolbar -->
      <div class="instruments-toolbar">
        <h1 class="instruments-toolbar__title">{{ 'instruments.page.title' | translate }}</h1>
        <div class="instruments-toolbar__tabs" role="tablist">
          <button
            class="instruments-toolbar__tab"
            [class.active]="activeCategory() === 'all'"
            (click)="activeCategory.set('all')"
            role="tab"
            [attr.aria-selected]="activeCategory() === 'all'"
          >All ({{ allCount }})</button>
          @for (cat of categories; track cat.id) {
            <button
              class="instruments-toolbar__tab"
              [class.active]="activeCategory() === cat.id"
              (click)="activeCategory.set(cat.id)"
              role="tab"
              [attr.aria-selected]="activeCategory() === cat.id"
            >{{ cat.label }} ({{ getCategoryCount(cat.id) }})</button>
          }
        </div>
      </div>

      <!-- Scrollable content -->
      <div class="instruments-content">
        <!-- Instruments grid -->
        <div class="instruments-grid">
          @for (inst of filteredInstruments(); track inst.id) {
            <omi-instrument-widget
              [config]="inst"
              [compact]="false"
            />
          }
        </div>

        <!-- AIS section -->
        <div class="instruments-section">
          <div class="instruments-section__title">AIS Targets</div>
          <div class="ais-panel">
            <app-ais-target-list
              [targets]="sortedTargets()"
              [sortBy]="sortBy()"
              (sortChange)="handleSortChange($event)"
            ></app-ais-target-list>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* ── Page shell ───────────────────────────────── */
    .instruments-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--gb-bg-canvas);
    }

    /* ── Toolbar ──────────────────────────────────── */
    .instruments-toolbar {
      display: flex;
      align-items: center;
      padding: var(--space-3, 12px) var(--space-5, 24px);
      border-bottom: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-bezel);
      flex-shrink: 0;
      gap: var(--space-3, 12px);
    }

    .instruments-toolbar__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: var(--gb-text-value);
      margin: 0;
      white-space: nowrap;
    }

    .instruments-toolbar__tabs {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      padding: 3px;
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 10px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .instruments-toolbar__tabs::-webkit-scrollbar { display: none; }

    .instruments-toolbar__tab {
      background: transparent;
      border: none;
      color: var(--gb-text-muted);
      padding: 6px 12px;
      border-radius: 7px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 0.7rem;
      cursor: pointer;
      transition: all 150ms ease;
      white-space: nowrap;
      min-height: 32px;
    }

    .instruments-toolbar__tab:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.04));
      color: var(--gb-text-value);
    }

    .instruments-toolbar__tab.active {
      background: rgba(74, 144, 217, 0.15);
      color: #4a90d9;
    }

    /* ── Scrollable content ───────────────────────── */
    .instruments-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* ── Instruments grid ─────────────────────────── */
    .instruments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--space-3, 12px);
      padding: var(--space-4, 16px) var(--space-5, 24px);
    }

    /* ── Section ──────────────────────────────────── */
    .instruments-section {
      margin-bottom: var(--space-5, 24px);
      padding: 0 var(--space-5, 24px);
    }

    .instruments-section__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--gb-text-muted);
      padding: var(--space-3, 12px) 0 var(--space-2, 8px);
      border-bottom: 1px solid var(--gb-border-panel);
      margin-bottom: var(--space-3, 12px);
    }

    /* ── AIS panel ────────────────────────────────── */
    .ais-panel {
      background: var(--gb-bg-panel);
      border-radius: 14px;
      border: 1px solid var(--gb-border-panel);
      padding: var(--space-4, 16px);
    }

    @media (max-width: 640px) {
      .instruments-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: var(--space-3, 12px);
      }

      .instruments-toolbar {
        flex-wrap: wrap;
        padding: var(--space-2, 8px) var(--space-3, 12px);
      }

      .instruments-section {
        padding: 0 var(--space-3, 12px);
      }
    }
  `],
})
export class InstrumentsPage {
  private readonly aisStore = inject(AisStoreService);
  private readonly store = inject(DatapointStoreService);

  readonly categories = INSTRUMENT_CATEGORIES;
  readonly allCount = INSTRUMENT_CATALOG.length;
  readonly activeCategory = signal<InstrumentCategoryId | 'all'>('all');

  readonly filteredInstruments = computed<InstrumentDefinition[]>(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return INSTRUMENT_CATALOG;
    return getInstrumentsByCategory(cat);
  });

  getCategoryCount(id: InstrumentCategoryId): number {
    return getInstrumentsByCategory(id).length;
  }

  // ── AIS section (kept from original) ──────────────────────────────
  readonly targetsMap = this.aisStore.targets;

  readonly position = toSignal(
    this.store.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
    { initialValue: null },
  );

  readonly sortBy = signal<'range' | 'cpa' | 'tcpa'>('range');

  readonly sortedTargets = computed(() => {
    const list = Array.from(this.targetsMap().values());
    this.sortBy();
    this.position();
    return list;
  });

  handleSortChange(sort: unknown): void {
    this.sortBy.set(sort as 'range' | 'cpa' | 'tcpa');
  }
}
