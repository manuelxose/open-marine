import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StackDirection = 'row' | 'column';
export type StackSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

@Component({
  selector: 'app-stack',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styleUrls: ['./stack.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses',
    '[style.--stack-gap]': 'gapValue'
  }
})
export class StackComponent {
  @Input() direction: StackDirection = 'column';
  @Input() spacing: StackSpacing = 'md';
  @Input() align: StackAlign = 'stretch';
  @Input() justify: StackJustify = 'start';
  @Input() divider = false;
  @Input() wrap = false;

  get hostClasses(): string {
    return [
      'app-stack',
      `app-stack--${this.direction}`,
      `app-stack--align-${this.align}`,
      `app-stack--justify-${this.justify}`,
      this.divider ? 'app-stack--divider' : '',
      this.wrap ? 'app-stack--wrap' : ''
    ].filter(Boolean).join(' ');
  }

  get gapValue(): string {
    const spacingMap: Record<StackSpacing, string> = {
      none: '0',
      xs: 'var(--space-xs)',
      sm: 'var(--space-sm)',
      md: 'var(--space-md)',
      lg: 'var(--space-lg)',
      xl: 'var(--space-xl)'
    };
    return spacingMap[this.spacing] || spacingMap.md;
  }
}
