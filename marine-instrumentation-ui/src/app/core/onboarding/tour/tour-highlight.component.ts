import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { GuidedTourService } from './guided-tour.service';
import { TourTooltipComponent } from './tour-tooltip.component';
import type { TourStep } from './tour-steps';

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: string;
  left: string;
  transform: string;
  centered: boolean;
}

@Component({
  selector: 'app-tour-highlight',
  standalone: true,
  imports: [CommonModule, TourTooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isActive()) {
      <div class="tour-overlay" (click)="onOverlayClick($event)">
        <!-- SVG overlay with spotlight hole -->
        <svg class="tour-mask" width="100%" height="100%">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                class="tour-spotlight-hole"
                [attr.x]="spotlight().x"
                [attr.y]="spotlight().y"
                [attr.width]="spotlight().width"
                [attr.height]="spotlight().height"
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            class="tour-overlay-bg"
            width="100%" height="100%"
            fill="rgba(0,0,0,0.7)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        <!-- Tooltip -->
        <app-tour-tooltip
          [step]="currentStep()"
          [progress]="progress()"
          [position]="tooltipPosition()"
          (next)="tourService.next()"
          (prev)="tourService.prev()"
          (close)="tourService.end()"
        />
      </div>
    }
  `,
  styleUrl: './tour-highlight.component.scss',
})
export class TourHighlightComponent implements OnInit, OnDestroy {
  readonly tourService = inject(GuidedTourService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  isActive = signal(false);
  currentStep = signal<TourStep | null>(null);
  progress = signal<{ current: number; total: number }>({ current: 1, total: 1 });
  spotlight = signal<SpotlightRect>({ x: 0, y: 0, width: 0, height: 0 });
  tooltipPosition = signal<TooltipPos>({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', centered: true });

  ngOnInit(): void {
    this.sub = combineLatest([
      this.tourService.isActive$,
      this.tourService.currentStep$,
      this.tourService.progress$,
    ]).subscribe(([active, step, progress]) => {
      this.isActive.set(active);
      this.currentStep.set(step);
      this.progress.set(progress);

      if (active && step) {
        // Defer calculation to allow DOM to settle after navigation
        setTimeout(() => {
          this.calculatePositions(step);
          this.cdr.markForCheck();
        }, 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onOverlayClick(event: Event): void {
    // Only close if clicking the overlay itself, not the tooltip
    const target = event.target as HTMLElement;
    if (target.closest('.tour-tooltip')) return;
    // Don't close on overlay click - user must use buttons
  }

  private calculatePositions(step: TourStep): void {
    const spot = this.calculateSpotlight(step);
    this.spotlight.set(spot);
    this.tooltipPosition.set(this.calculateTooltipPos(step, spot));
  }

  private calculateSpotlight(step: TourStep): SpotlightRect {
    // Try each selector in comma-separated list
    const selectors = step.targetSelector.split(',').map(s => s.trim());
    let el: Element | null = null;
    for (const sel of selectors) {
      el = document.querySelector(sel);
      if (el) break;
    }

    if (!el) {
      // Full screen spotlight (no highlight)
      return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    }

    const rect = el.getBoundingClientRect();
    const pad = step.highlightPadding ?? 8;

    return {
      x: rect.left - pad,
      y: rect.top - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    };
  }

  private calculateTooltipPos(step: TourStep, spot: SpotlightRect): TooltipPos {
    const TOOLTIP_WIDTH = 340;
    const TOOLTIP_HEIGHT_EST = 220;
    const GAP = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        centered: true,
      };
    }

    let top: number;
    let left: number;

    switch (step.position) {
      case 'bottom':
        top = spot.y + spot.height + GAP;
        left = spot.x;
        break;
      case 'top':
        top = spot.y - TOOLTIP_HEIGHT_EST - GAP;
        left = spot.x;
        break;
      case 'right':
        top = spot.y;
        left = spot.x + spot.width + GAP;
        break;
      case 'left':
        top = spot.y;
        left = spot.x - TOOLTIP_WIDTH - GAP;
        break;
      default:
        top = spot.y + spot.height + GAP;
        left = spot.x;
    }

    // Clamp within viewport
    if (left + TOOLTIP_WIDTH > vw - 16) left = vw - TOOLTIP_WIDTH - 16;
    if (left < 16) left = 16;
    if (top + TOOLTIP_HEIGHT_EST > vh - 16) top = vh - TOOLTIP_HEIGHT_EST - 16;
    if (top < 16) top = 16;

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
      centered: false,
    };
  }
}
