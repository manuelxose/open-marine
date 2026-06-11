import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { AppModalComponent } from '../../shared/components/app-modal/app-modal.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LegendSymbolComponent } from './components/legend-symbol/legend-symbol.component';
import {
  LEGEND_CATEGORIES,
  LegendCategoryId,
} from './chart-legend-data';

@Component({
  selector: 'app-chart-legend',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppIconComponent,
    AppModalComponent,
    LegendSymbolComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="'legend.title' | translate"
      size="fullscreen"
      [showFooter]="false"
      (close)="close.emit()"
    >
      <div class="legend-layout">

        <!-- ── Sidebar ───────────────────────────────────────────────── -->
        <aside class="legend-sidebar">
          <!-- Search -->
          <div class="legend-search">
            <app-icon name="search" [size]="16" class="search-icon" />
            <input
              type="search"
              class="search-input"
              [placeholder]="'legend.search_placeholder' | translate"
              [value]="searchTerm()"
              (input)="onSearchChange($any($event.target).value)"
              autocomplete="off"
            />
            @if (searchTerm().length > 0) {
              <button
                class="search-clear"
                (click)="clearSearch()"
                aria-label="Clear search"
              >
                <app-icon name="x" [size]="14" />
              </button>
            }
          </div>

          <!-- Category navigation -->
          @if (!isSearching()) {
            <nav class="category-nav">
              @for (cat of categories; track cat.id) {
                <button
                  class="category-btn"
                  [class.active]="selectedCategoryId() === cat.id"
                  (click)="selectCategory(cat.id)"
                >
                  <app-icon [name]="$any(cat.icon)" [size]="18" />
                  <span class="category-label">{{ cat.nameKey | translate }}</span>
                  <span class="entry-count">{{ cat.entries.length }}</span>
                </button>
              }
            </nav>
          }

          <!-- Search results count -->
          @if (isSearching()) {
            <div class="search-info">
              <span class="result-count">
                {{ searchResults()?.length ?? 0 }} {{ 'legend.results' | translate }}
                "{{ searchTerm() }}"
              </span>
            </div>
          }
        </aside>

        <!-- ── Content ────────────────────────────────────────────────── -->
        <main class="legend-content">

          <!-- Normal view: selected category -->
          @if (!isSearching()) {
            @if (selectedCategory(); as cat) {
              <div class="content-header">
                <h2>{{ cat.nameKey | translate }}</h2>
                <p class="content-description">{{ cat.descriptionKey | translate }}</p>
              </div>

              <div class="entries-grid">
                @for (entry of cat.entries; track entry.id) {
                  <div class="entry-card">
                    <app-legend-symbol [symbol]="entry.symbol" class="entry-symbol" />
                    <div class="entry-info">
                      <div class="entry-name">{{ entry.nameKey | translate }}</div>
                      <div class="entry-description">{{ entry.descriptionKey | translate }}</div>
                      @if (entry.standard) {
                        <div class="entry-standard">
                          <app-icon name="info" [size]="12" />
                          {{ entry.standard }}
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- Search view -->
          @if (isSearching()) {
            @if (searchResults(); as results) {
              @if (results.length === 0) {
                <div class="no-results">
                  <app-icon name="search" [size]="48" class="no-results-icon" />
                  <p>{{ 'legend.no_results' | translate }} "{{ searchTerm() }}"</p>
                </div>
              } @else {
                <div class="entries-grid entries-grid--search">
                  @for (result of results; track result.entry.id) {
                    <div class="entry-card entry-card--search">
                      <app-legend-symbol [symbol]="result.entry.symbol" class="entry-symbol" />
                      <div class="entry-info">
                        <div class="entry-category-label">{{ result.category.nameKey | translate }}</div>
                        <div class="entry-name">{{ result.entry.nameKey | translate }}</div>
                        <div class="entry-description">{{ result.entry.descriptionKey | translate }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          }
        </main>
      </div>
    </app-modal>
  `,
  styles: [`
    /* ── Layout ───────────────────────────────────────────────── */

    .legend-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      height: 100%;
      min-height: 0;
      gap: 0;
    }

    /* ── Sidebar ──────────────────────────────────────────────── */

    .legend-sidebar {
      border-right: 1px solid var(--gb-border-panel);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--gb-bg-bezel);
    }

    .legend-search {
      position: relative;
      padding: 0.75rem;
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .search-icon {
      position: absolute;
      left: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--gb-text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 2.25rem;
      border-radius: 6px;
      border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-panel);
      color: var(--gb-text-value);
      font-size: 0.875rem;
      font-family: 'Space Grotesk', sans-serif;

      &:focus {
        outline: none;
        border-color: #4a90d9;
        box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
      }

      &::placeholder {
        color: var(--gb-text-muted);
      }
    }

    .search-clear {
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--gb-text-muted);
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;

      &:hover { color: var(--gb-text-value); }
    }

    /* ── Category nav ─────────────────────────────────────────── */

    .category-nav {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .category-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.625rem;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--gb-text-muted);
      cursor: pointer;
      width: 100%;
      text-align: left;
      font-size: 0.8rem;
      font-family: 'Space Grotesk', sans-serif;
      transition: all 0.15s ease;

      &:hover {
        background: var(--gb-bg-glass-active, rgba(255,255,255,0.04));
        color: var(--gb-text-value);
      }

      &.active {
        background: rgba(74, 144, 217, 0.12);
        color: #4a90d9;
      }
    }

    .category-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entry-count {
      flex-shrink: 0;
      font-size: 0.7rem;
      color: var(--gb-text-muted);
      background: var(--gb-bg-panel);
      padding: 1px 6px;
      border-radius: 10px;
      font-variant-numeric: tabular-nums;
      font-family: 'Share Tech Mono', monospace;
    }

    /* ── Content ──────────────────────────────────────────────── */

    .legend-content {
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .content-header {
      h2 {
        margin: 0 0 0.25rem;
        font-size: 1.125rem;
        font-weight: 600;
        font-family: 'Space Grotesk', sans-serif;
        color: var(--gb-text-value);
      }
      .content-description {
        color: var(--gb-text-muted);
        margin: 0;
        font-size: 0.8rem;
        font-family: 'Space Grotesk', sans-serif;
      }
    }

    /* ── Entries Grid ─────────────────────────────────────────── */

    .entries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.625rem;

      &--search {
        grid-template-columns: 1fr;
      }
    }

    .entry-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-panel);
      transition: border-color 0.15s;

      &:hover {
        border-color: var(--gb-border-active);
      }
    }

    .entry-symbol { flex-shrink: 0; }

    .entry-info {
      flex: 1;
      min-width: 0;
    }

    .entry-category-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #4a90d9;
      margin-bottom: 0.15rem;
      font-family: 'Space Grotesk', sans-serif;
    }

    .entry-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--gb-text-value);
      margin-bottom: 0.2rem;
      font-family: 'Space Grotesk', sans-serif;
    }

    .entry-description {
      font-size: 0.75rem;
      color: var(--gb-text-unit);
      line-height: 1.4;
      font-family: 'Space Grotesk', sans-serif;
    }

    .entry-standard {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.3rem;
      font-size: 0.65rem;
      color: var(--gb-text-muted);
      font-family: 'Share Tech Mono', monospace;
    }

    /* ── No results ───────────────────────────────────────────── */

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      color: var(--gb-text-muted);
      text-align: center;
      font-family: 'Space Grotesk', sans-serif;
    }

    .no-results-icon { opacity: 0.3; }

    .search-info {
      padding: 0.75rem;
      border-bottom: 1px solid var(--gb-border-panel);

      .result-count {
        font-size: 0.8rem;
        color: var(--gb-text-unit);
        font-family: 'Space Grotesk', sans-serif;
      }
    }

    /* ── Responsive ───────────────────────────────────────────── */

    @media (max-width: 640px) {
      .legend-layout {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .legend-sidebar {
        border-right: none;
        border-bottom: 1px solid var(--gb-border-panel);
      }

      .category-nav {
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: auto;
        padding: 0.375rem 0.5rem;
        gap: 4px;
      }

      .category-btn {
        flex-shrink: 0;
        white-space: nowrap;
        font-size: 0.75rem;
        padding: 0.375rem 0.5rem;
      }

      .entries-grid {
        grid-template-columns: 1fr;
      }

      .legend-content {
        padding: 1rem;
      }
    }
  `],
})
export class ChartLegendComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  readonly categories = LEGEND_CATEGORIES;

  // ── State ──────────────────────────────────────────────────
  readonly selectedCategoryId = signal<LegendCategoryId>('omi-symbols');
  readonly searchTerm = signal('');

  readonly selectedCategory = computed(() =>
    this.categories.find(c => c.id === this.selectedCategoryId()),
  );

  readonly searchResults = computed(() => {
    const term = this.searchTerm();
    if (!term || term.length < 2) return null;
    const normalized = term.toLowerCase();

    return this.categories.flatMap(cat =>
      cat.entries
        .filter(entry => {
          const tokens = [
            ...(entry.searchTokens ?? []),
            entry.id.replace(/_/g, ' '),
            entry.standard ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return tokens.includes(normalized);
        })
        .map(entry => ({ category: cat, entry })),
    );
  });

  readonly isSearching = computed(() => (this.searchTerm()?.length ?? 0) >= 2);

  // ── Actions ────────────────────────────────────────────────

  selectCategory(id: LegendCategoryId): void {
    this.selectedCategoryId.set(id);
    this.searchTerm.set('');
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }
}
