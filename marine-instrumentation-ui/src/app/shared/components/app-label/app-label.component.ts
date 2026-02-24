import { Component, Input, ChangeDetectionStrategy, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-label',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label
      [attr.for]="for"
      class="app-label"
      [class.app-label--disabled]="disabled"
    >
      <ng-content></ng-content>
      <span *ngIf="required" class="app-label__required" aria-hidden="true">*</span>
    </label>
  `,
  styles: [`
    :host {
      display: block;
    }
    .app-label {
      font-family: var(--font-family-sans);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--gb-text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      transition: color 0.2s ease;
    }
    .app-label--disabled {
      color: var(--text-disabled);
      cursor: not-allowed;
    }
    .app-label__required {
      color: var(--ui-danger);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLabelComponent {
  @Input() for?: string;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
}
