import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import type { TourStep } from './tour-steps';

@Component({
  selector: 'app-tour-tooltip',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (step(); as s) {
      <div
        class="tour-tooltip"
        [class.center-mode]="position().centered"
        [style.top]="position().top"
        [style.left]="position().left"
        [style.transform]="position().transform"
      >
        <div class="tooltip-header">
          <span class="tooltip-progress">{{ progress().current }} / {{ progress().total }}</span>
          <button class="tooltip-close" (click)="close.emit()" aria-label="Close tour">✕</button>
        </div>

        <h3 class="tooltip-title">{{ s.title | translate }}</h3>
        <p class="tooltip-desc">{{ s.description | translate }}</p>

        <div class="tooltip-actions">
          <button
            class="btn-back"
            (click)="prev.emit()"
            [disabled]="progress().current === 1"
          >
            {{ 'tour.back' | translate }}
          </button>

          <button class="btn-next" (click)="next.emit()">
            {{ progress().current === progress().total
              ? ('tour.finish' | translate)
              : ('tour.next' | translate) }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .tour-tooltip {
      position: absolute;
      width: 340px;
      max-width: calc(100vw - 32px);
      background: var(--gb-bg-panel, #1e2231);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 8001;
      pointer-events: all;
      animation: tooltip-enter 0.25s ease-out;
    }

    .center-mode {
      position: fixed;
    }

    .tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .tooltip-progress {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--gb-accent, #4a90d9);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-family: 'JetBrains Mono', monospace;
    }

    .tooltip-close {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      background: transparent;
      color: var(--gb-text-muted, #7b88a0);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      min-height: 44px;
      min-width: 44px;
    }

    .tooltip-close:hover {
      background: var(--gb-bg-bezel, #1e2231);
    }

    .tooltip-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--gb-text-value, #eceff4);
      margin: 0 0 0.5rem 0;
    }

    .tooltip-desc {
      font-size: 0.85rem;
      color: var(--gb-text-muted, #7b88a0);
      line-height: 1.5;
      margin: 0 0 1.25rem 0;
    }

    .tooltip-actions {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .btn-next {
      flex: 1;
      background: var(--gb-accent, #4a90d9);
      color: white;
      border: none;
      padding: 0.6rem 1rem;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
    }

    .btn-next:hover {
      filter: brightness(1.1);
    }

    .btn-back {
      background: transparent;
      color: var(--gb-text-muted, #7b88a0);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      padding: 0.6rem 1rem;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
    }

    .btn-back:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-back:hover:not(:disabled) {
      border-color: var(--gb-text-muted, #7b88a0);
    }

    @keyframes tooltip-enter {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    .center-mode {
      animation-name: tooltip-center-enter;
    }

    @keyframes tooltip-center-enter {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `],
})
export class TourTooltipComponent {
  step = input.required<TourStep | null>();
  progress = input.required<{ current: number; total: number }>();
  position = input.required<{ top: string; left: string; transform: string; centered: boolean }>();

  next = output();
  prev = output();
  close = output();
}
