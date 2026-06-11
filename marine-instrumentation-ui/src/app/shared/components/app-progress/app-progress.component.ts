import { Component, Input, ChangeDetectionStrategy, computed, numberAttribute, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-progress-container" [class]="'size-' + size">
      <div 
        class="app-progress-bar"
        [class]="'variant-' + variant"
        [class.indeterminate]="indeterminate"
        role="progressbar"
        [attr.aria-valuenow]="indeterminate ? null : value"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="max"
        [style.width.%]="percentage()">
      </div>
    </div>
    <div *ngIf="showLabel && !indeterminate" class="app-progress-label">
      {{ value }} / {{ max }} {{ unit }}
    </div>
  `,
  styleUrls: ['./app-progress.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProgressComponent {
  @Input({ transform: numberAttribute }) value = 0;
  @Input({ transform: numberAttribute }) max = 100;
  @Input() variant: ProgressVariant = 'primary';
  @Input() size: ProgressSize = 'md';
  @Input({ transform: booleanAttribute }) showLabel = false;
  @Input({ transform: booleanAttribute }) indeterminate = false;
  @Input() unit = '';

  readonly percentage = computed(() => {
    if (this.indeterminate) return 100;
    const p = (this.value / this.max) * 100;
    return Math.min(100, Math.max(0, p));
  });
}
