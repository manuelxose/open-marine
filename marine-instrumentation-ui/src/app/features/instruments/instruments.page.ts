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
      background:
        radial-gradient(ellipse 100% 60% at 50% 0%, rgba(74, 144, 217, 0.06), transparent 70%),
        radial-gradient(ellipse 80% 50% at 80% 100%, rgba(136, 192, 208, 0.04), transparent 60%),
        var(--gb-bg-canvas);
    }

    /* ── Toolbar ──────────────────────────────────── */
    .instruments-toolbar {
      display: flex;
      align-items: center;
      padding: var(--space-3, 12px) var(--space-5, 24px);
      border-bottom: 1px solid var(--glass-border, var(--gb-border-panel));
      background: var(--glass-bg, var(--gb-bg-bezel));
      backdrop-filter: blur(var(--glass-blur, 16px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
      flex-shrink: 0;
      gap: var(--space-4, 16px);
      position: relative;
    }

    .instruments-toolbar::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--glass-shine, rgba(255,255,255,0.1)), transparent);
      opacity: 0.5;
    }

    .instruments-toolbar__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary, var(--gb-text-value));
      margin: 0;
      white-space: nowrap;
      position: relative;
    }

    .instruments-toolbar__title::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--primary, #4a90d9);
      border-radius: var(--radius-full, 999px);
    }

    .instruments-toolbar__tabs {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      padding: 3px;
      background: linear-gradient(145deg, rgba(0,0,0,0.04), rgba(0,0,0,0.07));
      border: 1px solid var(--glass-border, var(--gb-border-panel));
      border-radius: 12px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .instruments-toolbar__tabs::-webkit-scrollbar { display: none; }

    .instruments-toolbar__tab {
      background: transparent;
      border: none;
      color: var(--text-muted, var(--gb-text-muted));
      padding: 6px 14px;
      border-radius: 9px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 0.7rem;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      min-height: 32px;
      position: relative;
    }

    .instruments-toolbar__tab:hover {
      background: rgba(74, 144, 217, 0.08);
      color: var(--text-primary, var(--gb-text-value));
    }

    .instruments-toolbar__tab.active {
      background: rgba(74, 144, 217, 0.18);
      color: #4a90d9;
      box-shadow: 0 0 8px rgba(74, 144, 217, 0.15);
    }

    /* ── Scrollable content ───────────────────────── */
    .instruments-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: var(--glass-border, rgba(255,255,255,0.1)) transparent;
    }

    /* ── Instruments grid ─────────────────────────── */
    .instruments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: var(--space-4, 16px);
      padding: var(--space-5, 24px);
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
      color: var(--text-muted, var(--gb-text-muted));
      padding: var(--space-3, 12px) 0 var(--space-2, 8px);
      border-bottom: 1px solid var(--glass-border, var(--gb-border-panel));
      margin-bottom: var(--space-3, 12px);
      position: relative;
    }

    .instruments-section__title::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 40px;
      height: 2px;
      background: var(--primary, #4a90d9);
      border-radius: 1px;
    }

    /* ── AIS panel ────────────────────────────────── */
    .ais-panel {
      background: var(--glass-bg, var(--gb-bg-panel));
      backdrop-filter: blur(var(--glass-blur, 16px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
      border-radius: var(--glass-card-radius-sm, 14px);
      border: 1px solid var(--glass-border, var(--gb-border-panel));
      box-shadow:
        var(--glass-highlight, none),
        var(--glass-depth-shadow, 0 4px 20px rgba(0,0,0,0.12));
      padding: var(--space-4, 16px);
      position: relative;
      overflow: hidden;
    }

    .ais-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--glass-shine, rgba(255,255,255,0.1)), transparent);
      opacity: 0.5;
    }

    @media (max-width: 640px) {
      .instruments-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: var(--space-3, 12px);
        gap: var(--space-3, 12px);
      }

      .instruments-toolbar {
        flex-wrap: wrap;
        padding: var(--space-2, 8px) var(--space-3, 12px);
        gap: var(--space-2, 8px);
      }

      .instruments-toolbar__title::before { display: none; }

      .instruments-section {
        padding: 0 var(--space-3, 12px);
      }
    }

    @media (min-width: 1200px) {
      .instruments-grid {
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
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
