import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'secondary' | 'white' | 'current';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="app-spinner"
      [class]="'size-' + size"
      [class]="'color-' + color"
      role="status"
      aria-label="Loading">
      <svg class="spinner-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle class="spinner-track" cx="12" cy="12" r="10" stroke-width="4"></circle>
        <circle class="spinner-indicator" cx="12" cy="12" r="10" stroke-width="4"></circle>
      </svg>
    </div>
  `,
  styleUrls: ['./app-spinner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() color: SpinnerColor = 'primary';
}
