import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpacerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
export type SpacerAxis = 'horizontal' | 'vertical';

@Component({
  selector: 'app-spacer',
  standalone: true,
  imports: [CommonModule],
  template: '',
  styles: [`
    :host {
      display: block;
      flex-shrink: 0;
    }
    :host.app-spacer--horizontal {
      display: inline-block;
      height: 1px; // Minimal height to maintain line-height context if needed
      width: var(--spacer-size);
    }
    :host.app-spacer--vertical {
      width: 1px;
      height: var(--spacer-size);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses',
    '[style.--spacer-size]': 'sizeValue'
  }
})
export class AppSpacerComponent {
  @Input() size: SpacerSize = 'md';
  @Input() axis: SpacerAxis = 'vertical';

  get hostClasses(): string {
    return `app-spacer app-spacer--${this.axis}`;
  }

  get sizeValue(): string {
    const spacingMap: Record<string, string> = {
      xs: 'var(--space-xs)',
      sm: 'var(--space-sm)',
      md: 'var(--space-md)',
      lg: 'var(--space-lg)',
      xl: 'var(--space-xl)'
    };
    
    // Check if predefined token
    if (spacingMap[this.size]) {
      return spacingMap[this.size];
    }
    
    // Check if it's a number-like string or just a raw CSS value
    const sizeStr = String(this.size);
    if (!isNaN(parseFloat(sizeStr)) && isFinite(sizeStr as any)) {
      return `${sizeStr}px`;
    }
    
    return sizeStr;
  }
}
