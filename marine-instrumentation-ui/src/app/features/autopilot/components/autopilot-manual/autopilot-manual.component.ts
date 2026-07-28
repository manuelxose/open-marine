import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Output,
  EventEmitter,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageService } from '../../../../core/services/language.service';
import { AUTOPILOT_MANUAL, ManualBlock, ManualSection } from './autopilot-manual.content';

/**
 * Full-screen autopilot technical manual: a table of contents, live search and
 * richly-formatted sections (paragraphs, lists, step-by-step, spec tables,
 * notes/warnings). Bilingual — follows the app language via {@link LanguageService}.
 */
@Component({
  selector: 'app-autopilot-manual',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="man" role="dialog" aria-modal="true" (click)="onBackdrop($event)">
      <div class="man__box">
        <header class="man__hd">
          <div class="man__title">
            <span class="man__mark">📖</span>
            <div>
              <h2>{{ doc().title }}</h2>
              <span class="man__subtitle">{{ doc().subtitle }}</span>
            </div>
          </div>
          <button class="man__close" (click)="close.emit()" [attr.aria-label]="doc().ui.close">✕</button>
        </header>

        <div class="man__search">
          <span class="man__search-icon">🔎</span>
          <input
            type="search"
            [placeholder]="doc().ui.search"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </div>

        <div class="man__body">
          <!-- Table of contents -->
          <nav class="man__toc">
            <span class="man__toc-hd">{{ doc().ui.contents }}</span>
            <button
              class="man__toc-item"
              *ngFor="let s of sections()"
              (click)="scrollTo(s.id)"
            >
              <span class="man__toc-icon">{{ s.icon }}</span>{{ s.title }}
            </button>
          </nav>

          <!-- Sections -->
          <div class="man__content" #content>
            <p class="man__empty" *ngIf="!sections().length">{{ doc().ui.empty }}</p>

            <section class="man__sec" *ngFor="let s of sections()" [attr.id]="'man-' + s.id">
              <h3 class="man__sec-hd"><span class="man__sec-icon">{{ s.icon }}</span>{{ s.title }}</h3>

              <ng-container *ngFor="let b of s.blocks" [ngSwitch]="b.k">
                <p class="man__p" *ngSwitchCase="'p'">{{ textOf(b) }}</p>

                <ul class="man__ul" *ngSwitchCase="'ul'">
                  <li *ngFor="let it of itemsOf(b)">{{ it }}</li>
                </ul>

                <ol class="man__steps" *ngSwitchCase="'steps'">
                  <li *ngFor="let it of itemsOf(b)">{{ it }}</li>
                </ol>

                <div class="man__note" *ngSwitchCase="'note'">
                  <span class="man__note-icon">ℹ️</span><span>{{ textOf(b) }}</span>
                </div>

                <div class="man__warn" *ngSwitchCase="'warn'">
                  <span class="man__note-icon">⚠️</span><span>{{ textOf(b) }}</span>
                </div>

                <dl class="man__spec" *ngSwitchCase="'spec'">
                  <div class="man__spec-row" *ngFor="let r of rowsOf(b)">
                    <dt>{{ r.label }}</dt>
                    <dd>{{ r.value }}</dd>
                  </div>
                </dl>
              </ng-container>
            </section>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .man {
        position: fixed;
        inset: 0;
        z-index: var(--z-chart-modals, 1000);
        display: flex;
        align-items: stretch;
        justify-content: center;
        padding: var(--space-3);
        background: var(--overlay-backdrop, rgba(0, 0, 0, 0.6));
        backdrop-filter: blur(3px);
      }
      .man__box {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 1100px;
        max-height: 100%;
        border-radius: var(--radius-lg);
        background: var(--gb-bg-bezel);
        border: 1px solid var(--gb-border-active);
        overflow: hidden;
      }

      .man__hd {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--gb-border-panel);
        background: var(--gb-bg-panel);
      }
      .man__title {
        display: flex;
        gap: var(--space-3);
        min-width: 0;
      }
      .man__mark {
        font-size: 1.4rem;
        line-height: 1.2;
      }
      .man__title h2 {
        margin: 0;
        font-size: 1.05rem;
        color: var(--gb-text-value);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .man__subtitle {
        font-size: 0.68rem;
        color: var(--gb-text-muted);
      }
      .man__close {
        flex-shrink: 0;
        width: 38px;
        height: 38px;
        border-radius: var(--radius-md);
        background: var(--gb-bg-glass);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-value);
        font-size: 1rem;
        cursor: pointer;
      }
      .man__close:active {
        border-color: var(--gb-border-active);
      }

      .man__search {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        border-bottom: 1px solid var(--gb-border-panel);
      }
      .man__search-icon {
        font-size: 0.85rem;
        opacity: 0.8;
      }
      .man__search input {
        flex: 1;
        min-width: 0;
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        background: var(--gb-bg-face);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-value);
        font-size: 0.8rem;
      }
      .man__search input::placeholder {
        color: var(--gb-text-muted);
      }

      .man__body {
        display: flex;
        min-height: 0;
        flex: 1;
      }
      .man__toc {
        display: none;
        flex-direction: column;
        gap: 2px;
        width: 240px;
        flex-shrink: 0;
        padding: var(--space-3);
        border-right: 1px solid var(--gb-border-panel);
        overflow-y: auto;
      }
      .man__toc-hd {
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--gb-text-muted);
        padding: 0 var(--space-2) var(--space-2);
      }
      .man__toc-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2);
        border-radius: var(--radius-sm);
        background: transparent;
        border: none;
        color: var(--gb-text-muted);
        font-size: 0.72rem;
        text-align: left;
        cursor: pointer;
      }
      .man__toc-item:hover {
        background: var(--gb-bg-glass-active);
        color: var(--gb-text-value);
      }
      .man__toc-icon {
        flex-shrink: 0;
      }

      .man__content {
        flex: 1;
        min-width: 0;
        overflow-y: auto;
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        scroll-behavior: smooth;
      }
      .man__empty {
        color: var(--gb-text-muted);
        font-size: 0.8rem;
        text-align: center;
        padding: var(--space-6) 0;
      }

      .man__sec {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        scroll-margin-top: var(--space-3);
      }
      .man__sec-hd {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0;
        padding-bottom: var(--space-2);
        border-bottom: 1px solid var(--gb-border-panel);
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--gb-text-value);
        letter-spacing: 0.02em;
      }
      .man__sec-icon {
        font-size: 1rem;
      }
      .man__p {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.6;
        color: var(--gb-text-muted);
      }
      .man__ul,
      .man__steps {
        margin: 0;
        padding-left: 1.2rem;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .man__ul li,
      .man__steps li {
        font-size: 0.76rem;
        line-height: 1.55;
        color: var(--gb-text-muted);
      }
      .man__ul li::marker,
      .man__steps li::marker {
        color: var(--gb-tick-reference);
      }

      .man__note,
      .man__warn {
        display: flex;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        font-size: 0.74rem;
        line-height: 1.5;
        color: var(--gb-text-value);
      }
      .man__note {
        background: var(--gb-alarm-info-bg);
        border: 1px solid var(--gb-alarm-info-border);
      }
      .man__warn {
        background: var(--gb-alarm-warning-bg);
        border: 1px solid var(--gb-alarm-warning-border);
      }
      .man__note-icon {
        flex-shrink: 0;
      }

      .man__spec {
        margin: 0;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--gb-border-panel);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .man__spec-row {
        display: grid;
        grid-template-columns: minmax(9rem, 12rem) 1fr;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-3);
        background: var(--gb-bg-panel);
        border-top: 1px solid var(--gb-border-panel);
      }
      .man__spec-row:first-child {
        border-top: none;
      }
      .man__spec-row dt {
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        font-size: 0.72rem;
        color: var(--gb-text-value);
      }
      .man__spec-row dd {
        margin: 0;
        font-size: 0.72rem;
        line-height: 1.5;
        color: var(--gb-text-muted);
      }

      @media (min-width: 860px) {
        .man__toc {
          display: flex;
        }
      }
      @media (max-width: 520px) {
        .man__spec-row {
          grid-template-columns: 1fr;
          gap: 2px;
        }
      }
    `,
  ],
})
export class AutopilotManualComponent {
  @Output() close = new EventEmitter<void>();
  @ViewChild('content') private content?: ElementRef<HTMLElement>;

  private readonly language = inject(LanguageService);
  private readonly lang = toSignal(this.language.lang$, {
    initialValue: this.language.getCurrentLanguage(),
  });

  readonly query = signal('');

  /** The manual document for the active language (falls back to English). */
  readonly doc = computed(() => AUTOPILOT_MANUAL[this.lang()] ?? AUTOPILOT_MANUAL.en);

  /** Sections filtered by the search query (matches title or any block text). */
  readonly sections = computed<ManualSection[]>(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.doc().sections;
    if (!q) {
      return all;
    }
    return all.filter((s) => this.sectionText(s).includes(q));
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  onBackdrop(event: MouseEvent): void {
    // Close only when the dim backdrop itself is clicked, not the dialog box.
    if ((event.target as HTMLElement).classList.contains('man')) {
      this.close.emit();
    }
  }

  scrollTo(id: string): void {
    this.content?.nativeElement.querySelector('#man-' + id)?.scrollIntoView({ block: 'start' });
  }

  // Template-side narrowing: Angular's template checker does not narrow the block
  // union through *ngSwitchCase, so expose typed accessors for each variant.
  textOf(b: ManualBlock): string {
    return b.k === 'p' || b.k === 'note' || b.k === 'warn' ? b.text : '';
  }
  itemsOf(b: ManualBlock): string[] {
    return b.k === 'ul' || b.k === 'steps' ? b.items : [];
  }
  rowsOf(b: ManualBlock): { label: string; value: string }[] {
    return b.k === 'spec' ? b.rows : [];
  }

  private sectionText(s: ManualSection): string {
    const parts: string[] = [s.title];
    for (const b of s.blocks) {
      if (b.k === 'p' || b.k === 'note' || b.k === 'warn') {
        parts.push(b.text);
      } else if (b.k === 'ul' || b.k === 'steps') {
        parts.push(b.items.join(' '));
      } else if (b.k === 'spec') {
        parts.push(b.rows.map((r) => `${r.label} ${r.value}`).join(' '));
      }
    }
    return parts.join(' ').toLowerCase();
  }
}
