import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import type { LegendSymbol } from '../../chart-legend-data';

@Component({
  selector: 'app-legend-symbol',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="symbol-container">
      @if (symbol.type === 'icon') {
        <app-icon [name]="$any(symbol.name)" [size]="28" class="symbol-icon" />
      }

      @if (symbol.type === 'color-swatch') {
        <div
          class="color-swatch"
          [style.background-color]="symbol.color"
          [style.border-color]="symbol.border || symbol.color"
        ></div>
      }

      @if (symbol.type === 'text-badge') {
        <span
          class="text-badge"
          [style.color]="symbol.color || 'currentColor'"
          [style.background-color]="symbol.bgColor || 'transparent'"
        >{{ symbol.text }}</span>
      }

      @if (symbol.type === 'line') {
        <svg width="48" height="24" viewBox="0 0 48 24" class="symbol-svg">
          <line
            x1="2" y1="12" x2="46" y2="12"
            [attr.stroke]="symbol.color"
            [attr.stroke-width]="symbol.width || 2"
            [attr.stroke-dasharray]="symbol.dashArray || 'none'"
            stroke-linecap="round"
          />
        </svg>
      }

      @if (symbol.type === 'svg') {
        <svg width="36" height="36" viewBox="0 0 24 24" class="symbol-svg">
          <path
            [attr.d]="symbol.path"
            [attr.fill]="symbol.fillColor || 'none'"
            [attr.stroke]="symbol.color || 'currentColor'"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      }

      @if (symbol.type === 'composite') {
        <svg width="36" height="36" viewBox="0 0 36 36" class="symbol-svg">
          @if (hasCircleParts()) {
            @for (part of $any(symbol).parts; track $index) {
              <circle
                cx="18" cy="18"
                [attr.r]="getCircleRadius($index)"
                [attr.stroke]="part.color"
                fill="none"
                stroke-width="1"
              />
            }
          }
          @if (hasStripeParts()) {
            @for (part of $any(symbol).parts; track $index) {
              <rect
                x="4" y="0" width="28"
                [attr.height]="36 / $any(symbol).parts.length"
                [attr.y]="$index * (36 / $any(symbol).parts.length)"
                [attr.fill]="part.color"
                rx="2"
              />
            }
          }
        </svg>
      }
    </div>
  `,
  styles: [`
    .symbol-container {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: var(--radius-sm, 4px);
      background: color-mix(in srgb, var(--gb-text-value) 5%, transparent);
      border: 1px solid color-mix(in srgb, var(--gb-text-value) 8%, transparent);
    }

    .color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      border: 2px solid;
    }

    .text-badge {
      font-family: var(--font-mono, 'Share Tech Mono', monospace);
      font-size: 0.85rem;
      font-weight: bold;
      padding: 2px 5px;
      border-radius: 3px;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }

    .symbol-svg {
      display: block;
    }

    .symbol-icon {
      opacity: 0.85;
    }
  `],
})
export class LegendSymbolComponent {
  @Input({ required: true }) symbol!: LegendSymbol;

  hasCircleParts(): boolean {
    return (
      this.symbol.type === 'composite' &&
      this.symbol.parts.some(p => p.shape === 'circle')
    );
  }

  hasStripeParts(): boolean {
    return (
      this.symbol.type === 'composite' &&
      this.symbol.parts.some(p =>
        ['stripe', 'band', 'top-half', 'bottom-half'].includes(p.shape),
      )
    );
  }

  getCircleRadius(index: number): number {
    const radii = [16, 11, 6];
    return radii[index] ?? 6;
  }
}
