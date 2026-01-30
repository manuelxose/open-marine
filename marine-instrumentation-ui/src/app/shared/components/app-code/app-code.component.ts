import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CodeVariant = 'inline' | 'block';

@Component({
  selector: 'app-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="variant">
      <pre *ngSwitchCase="'block'" class="app-code app-code--block"><ng-content></ng-content></pre>
      <code *ngSwitchDefault class="app-code app-code--inline"><ng-content></ng-content></code>
    </ng-container>
  `,
  styles: [`
    :host {
      display: inline; /* Default for inline */
    }
    :host([variant="block"]) {
      display: block;
    }
    .app-code {
      font-family: var(--font-family-mono);
      font-size: var(--text-sm);
      background-color: var(--surface-2);
      color: var(--text-primary);
      border-radius: var(--radius-sm);
    }
    .app-code--inline {
      padding: 0.125rem 0.375rem;
      border: 1px solid var(--border-color);
    }
    .app-code--block {
      display: block;
      padding: 1rem;
      overflow-x: auto;
      border: 1px solid var(--border-color);
      white-space: pre;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCodeComponent {
  @Input() variant: CodeVariant = 'inline';
}
