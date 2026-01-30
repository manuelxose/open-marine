import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerLabelPosition = 'start' | 'center' | 'end';

@Component({
  selector: 'app-divider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngIf="label && orientation === 'horizontal'" class="divider-label">{{ label }}</span>
  `,
  styleUrls: ['./app-divider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses',
    '[attr.role]': '"separator"',
    '[attr.aria-orientation]': 'orientation'
  }
})
export class AppDividerComponent {
  @Input() orientation: DividerOrientation = 'horizontal';
  @Input() variant: DividerVariant = 'solid';
  @Input() label?: string;
  @Input() labelPosition: DividerLabelPosition = 'center';

  get hostClasses(): string {
    return [
      'app-divider',
      `app-divider--${this.orientation}`,
      `app-divider--${this.variant}`,
      this.label ? 'app-divider--with-label' : '',
      this.label ? `app-divider--label-${this.labelPosition}` : ''
    ].filter(Boolean).join(' ');
  }
}
