import { Component, Input, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-popover__content">
      <ng-container *ngIf="isTemplate(content); else textContent">
        <ng-container *ngTemplateOutlet="asTemplate(content)"></ng-container>
      </ng-container>
      <ng-template #textContent>
        {{ content }}
      </ng-template>
    </div>
  `,
  styleUrls: ['./app-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppPopoverComponent {
  @Input() content: string | TemplateRef<any> = '';
  @Input() visible = false;

  isTemplate(val: any): boolean {
    return val instanceof TemplateRef;
  }

  asTemplate(val: any): TemplateRef<any> {
    return val as TemplateRef<any>;
  }
}
