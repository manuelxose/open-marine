import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AppButtonComponent } from '../../app-button/app-button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppButtonComponent],
  template: `
    <div class="empty-state">
      <div class="empty-state-icon" *ngIf="icon">
        <app-icon [name]="icon"></app-icon>
      </div>
      
      <h3 class="empty-state-title" *ngIf="title">{{ title }}</h3>
      
      <p class="empty-state-description" *ngIf="description">{{ description }}</p>
      
      <div class="empty-state-action" *ngIf="actionLabel">
        <app-button variant="primary" (click)="onAction()">{{ actionLabel }}</app-button>
      </div>

      <div class="empty-state-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--spacing-xl, 32px);
      color: var(--text-secondary);
      height: 100%;
      min-height: 200px;
      background-color: transparent;

      &-icon {
        font-size: 3rem; // 48px
        margin-bottom: var(--spacing-lg, 24px);
        color: var(--text-tertiary);
        opacity: 0.5;
        
        ::ng-deep svg {
             width: 64px;
             height: 64px;
        }
      }

      &-title {
        font-size: var(--text-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 var(--spacing-sm, 8px) 0;
      }

      &-description {
        font-size: var(--text-base, 1rem);
        color: var(--text-secondary);
        margin: 0 0 var(--spacing-lg, 24px) 0;
        max-width: 400px;
      }

      &-action {
        margin-top: var(--spacing-md, 16px);
      }
      
      &-content {
          margin-top: var(--spacing-md, 16px);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppEmptyStateComponent {
  @Input() icon?: IconName;
  @Input() title?: string;
  @Input() description?: string;
  @Input() actionLabel?: string;

  @Output() action = new EventEmitter<void>();

  onAction() {
    this.action.emit();
  }
}
