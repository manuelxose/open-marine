import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `{{ text }}`,
  styleUrls: ['./app-tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTooltipComponent {
  @Input() text = '';
  
  // Handled via host binding class or renderer in directive, 
  // but explicitly having an input helps for debugging or declarative usage.
  @Input() visible = false;
}
