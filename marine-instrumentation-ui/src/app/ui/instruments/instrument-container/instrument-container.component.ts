import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type InstrumentViewMode = 'numeric' | 'visual' | 'both';

const VIEW_MODES: readonly InstrumentViewMode[] = ['numeric', 'visual', 'both'] as const;

const VIEW_MODE_ICONS: Record<InstrumentViewMode, { icon: string; label: string }> = {
  numeric: { icon: 'Aa', label: 'Numeric' },
  visual: { icon: '◎', label: 'Visual' },
  both: { icon: '▤', label: 'Both' },
};

@Component({
  selector: 'app-instrument-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="instrument-container"
      [class]="'size-' + size()"
      [class.mode-numeric]="viewMode() === 'numeric'"
      [class.mode-visual]="viewMode() === 'visual'"
      [class.mode-both]="viewMode() === 'both'"
    >
      <!-- Header -->
      <div class="instrument-header">
        <span class="instrument-title">{{ title() }}</span>
        <button
          class="view-toggle"
          (click)="cycleView()"
          [title]="'View: ' + viewModeLabel()"
          [attr.aria-label]="'Toggle instrument view, current ' + viewModeLabel()"
          type="button"
        >
          <span class="view-toggle__icon">{{ viewModeIcon() }}</span>
        </button>
      </div>

      <!-- Body -->
      <div class="instrument-body">
        @if (viewMode() === 'numeric' || viewMode() === 'both') {
          <div class="numeric-view" [class.compact]="viewMode() === 'both'">
            <ng-content select="[numeric]"></ng-content>
          </div>
        }
        @if (viewMode() === 'visual' || viewMode() === 'both') {
          <div class="visual-view" [class.compact]="viewMode() === 'both'">
            <ng-content select="[visual]"></ng-content>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* ── Container frame ───────────────────────────── */
    .instrument-container {
      background: var(--widget-bg);
      backdrop-filter: blur(var(--glass-blur, 16px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
      border: 1px solid var(--widget-border);
      border-radius: var(--widget-radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition:
        border-color var(--gb-anim-theme) var(--gb-ease-data),
        box-shadow var(--gb-anim-theme) var(--gb-ease-data),
        transform var(--gb-anim-theme) var(--gb-ease-data);
      position: relative;
    }

    /* Top shine line */
    .instrument-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 12%;
      right: 12%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--widget-shine), transparent);
      opacity: 0.5;
      z-index: 1;
    }

    .instrument-container:hover {
      border-color: var(--widget-hover-border);
      box-shadow: var(--widget-shadow-active);
      transform: translateY(-1px);
    }

    /* ── Header ────────────────────────────────────── */
    .instrument-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-bottom: 1px solid var(--widget-border);
      background: var(--widget-header-bg);
      flex-shrink: 0;
    }

    .instrument-title {
      font-family: var(--font-family);
      font-size: var(--widget-label-size);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: var(--widget-label-tracking);
      color: var(--widget-label);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── View toggle button ────────────────────────── */
    .view-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      min-width: 32px;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--widget-border);
      background: var(--gb-bg-glass);
      cursor: pointer;
      transition:
        border-color 150ms var(--gb-ease-data),
        background 150ms var(--gb-ease-data);
      padding: 0;
      flex-shrink: 0;
    }

    .view-toggle:hover {
      border-color: var(--widget-hover-border);
      background: var(--widget-accent-soft);
    }

    .view-toggle:focus-visible {
      outline: 2px solid var(--widget-accent);
      outline-offset: 2px;
    }

    .view-toggle__icon {
      font-family: var(--font-family);
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--widget-label);
      line-height: 1;
    }

    .view-toggle:hover .view-toggle__icon {
      color: var(--widget-accent);
    }

    /* ── Body ──────────────────────────────────────── */
    .instrument-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .numeric-view,
    .visual-view {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Single views take full space */
    .mode-numeric .numeric-view,
    .mode-visual .visual-view {
      flex: 1;
      padding: var(--space-3, 12px);
    }

    /* Both mode: numeric compact on top, visual takes more space */
    .mode-both .numeric-view {
      padding: var(--space-2, 8px) var(--space-3, 12px) 0;
      flex-shrink: 0;
    }

    .mode-both .visual-view {
      flex: 1;
      padding: var(--space-2, 8px) var(--space-3, 12px) var(--space-3, 12px);
    }

    /* ── Content projections fill their container ──── */
    .numeric-view ::ng-deep > * {
      width: 100%;
    }

    .visual-view ::ng-deep > * {
      width: 100%;
      max-height: 100%;
    }

    /* ── Size variants ─────────────────────────────── */
    .size-sm {
      min-width: 160px;
      min-height: 140px;
    }

    .size-md {
      min-width: 220px;
      min-height: 200px;
    }

    .size-lg {
      min-width: 300px;
      min-height: 280px;
    }

    /* ── Compact styling for "both" inner elements ── */
    .compact ::ng-deep .instrument-tile {
      aspect-ratio: unset;
      padding: var(--space-1, 4px) var(--space-2, 8px);
      border: none;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      gap: var(--space-1, 4px);
    }

    .compact ::ng-deep .instrument-tile::before {
      display: none;
    }

    .compact ::ng-deep .instrument-tile:hover {
      transform: none;
      box-shadow: none;
      border-color: transparent;
    }

    .compact ::ng-deep .instrument-tile__value {
      font-size: 1.1rem;
    }

    .compact ::ng-deep .instrument-tile__gauge {
      display: none;
    }

    /* ── Mode-specific: visual full, no extra padding ── */
    .mode-visual .visual-view ::ng-deep omi-gb-bezel,
    .mode-visual .visual-view ::ng-deep app-compass-widget,
    .mode-visual .visual-view ::ng-deep app-speedometer-widget,
    .mode-visual .visual-view ::ng-deep app-depth-gauge-widget,
    .mode-visual .visual-view ::ng-deep app-wind-widget,
    .mode-visual .visual-view ::ng-deep app-battery-widget,
    .mode-visual .visual-view ::ng-deep app-meteo-widget {
      width: 100%;
    }

    /* ── Fade transition ──────────────────────────── */
    .numeric-view,
    .visual-view {
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class InstrumentContainerComponent implements OnInit {
  readonly title = input.required<string>();
  readonly instrumentId = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly defaultView = input<InstrumentViewMode>('both');

  readonly viewMode = signal<InstrumentViewMode>('both');

  private readonly storageKeyPrefix = 'omi-instrument-view-';

  constructor() {
    // Persist viewMode changes to localStorage
    effect(() => {
      const id = this.instrumentId();
      const mode = this.viewMode();
      try {
        if (typeof window !== 'undefined' && 'localStorage' in window) {
          localStorage.setItem(this.storageKeyPrefix + id, mode);
        }
      } catch {
        // ignore storage errors
      }
    });
  }

  ngOnInit(): void {
    // Restore viewMode from localStorage
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        const stored = localStorage.getItem(
          this.storageKeyPrefix + this.instrumentId(),
        );
        if (stored && VIEW_MODES.includes(stored as InstrumentViewMode)) {
          this.viewMode.set(stored as InstrumentViewMode);
        } else {
          this.viewMode.set(this.defaultView());
        }
      }
    } catch {
      this.viewMode.set(this.defaultView());
    }
  }

  cycleView(): void {
    const currentIndex = VIEW_MODES.indexOf(this.viewMode());
    const nextIndex = (currentIndex + 1) % VIEW_MODES.length;
    this.viewMode.set(VIEW_MODES[nextIndex] ?? 'both');
  }

  viewModeIcon(): string {
    return VIEW_MODE_ICONS[this.viewMode()].icon;
  }

  viewModeLabel(): string {
    return VIEW_MODE_ICONS[this.viewMode()].label;
  }
}
