import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonGroupOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'app-button-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'btn-group btn-group-' + orientation" role="group">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .btn-group {
      display: inline-flex;
      border-radius: var(--radius-md);
      /* We rely on the buttons themselves for background/border, 
         but we need to manage the overlap and radius. */
    }

    .btn-group-horizontal {
      flex-direction: row;
    }

    .btn-group-vertical {
      flex-direction: column;
    }

    /* Target direct app-button children for Emulated encapsulation piercing 
       Note: This relies on app-button using specific classes in its own template.
       Since we use Emulated (default), ::ng-deep is needed to affect the child component styles.
    */
    
    /* Horizontal Grouping */
    :host ::ng-deep .btn-group-horizontal > app-button:not(:first-child) {
      margin-left: -1px; /* Overlap borders */
    }

    :host ::ng-deep .btn-group-horizontal > app-button:first-child .btn {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    :host ::ng-deep .btn-group-horizontal > app-button:last-child .btn {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    :host ::ng-deep .btn-group-horizontal > app-button:not(:first-child):not(:last-child) .btn {
      border-radius: 0;
    }
    
    /* Bring active/hovered button to front so border is visible */
    :host ::ng-deep .btn-group > app-button .btn:hover,
    :host ::ng-deep .btn-group > app-button .btn:focus,
    :host ::ng-deep .btn-group > app-button .btn.active {
      z-index: 1;
      position: relative;
    }

    /* Vertical Grouping */
    :host ::ng-deep .btn-group-vertical {
      align-items: stretch;
    }
    
    :host ::ng-deep .btn-group-vertical > app-button {
      width: 100%;
    }

    :host ::ng-deep .btn-group-vertical > app-button:not(:first-child) {
      margin-top: -1px;
    }

    :host ::ng-deep .btn-group-vertical > app-button:first-child .btn {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    :host ::ng-deep .btn-group-vertical > app-button:last-child .btn {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    :host ::ng-deep .btn-group-vertical > app-button:not(:first-child):not(:last-child) .btn {
      border-radius: 0;
    }

  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppButtonGroupComponent {
  @Input() orientation: ButtonGroupOrientation = 'horizontal';
}
