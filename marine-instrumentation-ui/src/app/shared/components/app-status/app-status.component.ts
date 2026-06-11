import { Component, Input, ChangeDetectionStrategy, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';

export type StatusVariant = 'neutral' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <span class="app-status" [class]="variant">
      <span *ngIf="!icon" class="status-dot" [class.pulse]="pulse"></span>
      <app-icon *ngIf="icon" [name]="icon" size="xs" class="status-icon"></app-icon>
      <span class="status-label">
        <ng-content></ng-content>
      </span>
    </span>
  `,
  styleUrls: ['./app-status.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStatusComponent {
  @Input() variant: StatusVariant = 'neutral';
  @Input() icon?: IconName;
  @Input({ transform: booleanAttribute }) pulse = false;
}
