import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AppButtonComponent } from '../../app-button/app-button.component';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert" [class]="type" *ngIf="visible">
      <div class="icon-columns">
        <app-icon [name]="iconName" size="md"></app-icon>
      </div>
      
      <div class="content">
        <div *ngIf="title" class="title">{{ title }}</div>
        <div class="message">{{ message }}</div>
        <ng-content></ng-content>
      </div>

      <div class="actions" *ngIf="actionLabel || closable">
        <app-button 
          *ngIf="actionLabel" 
          variant="ghost" 
          size="sm" 
          (click)="onAction.emit()">
          {{ actionLabel }}
        </app-button>
        
        <app-button 
          *ngIf="closable" 
          variant="ghost" 
          size="sm" 
          iconLeft="close" 
          (click)="close()">
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .alert {
      display: flex;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--alert-border);
      margin-bottom: var(--spacing-md);
      animation: fadeIn 0.3s ease-in-out;
      background-color: var(--alert-bg);
      color: var(--alert-text);
      --alert-bg: var(--bg-surface-secondary);
      --alert-border: var(--border-default);
      --alert-text: var(--gb-text-value);
      --alert-icon: var(--info);

      &.info {
        --alert-bg: var(--info-bg);
        --alert-border: color-mix(in srgb, var(--info) 35%, var(--border-default));
        --alert-text: var(--info-text);
        --alert-icon: var(--info);
      }

      &.success {
        --alert-bg: var(--success-bg);
        --alert-border: color-mix(in srgb, var(--success) 35%, var(--border-default));
        --alert-text: var(--success-text);
        --alert-icon: var(--success);
      }

      &.warning {
        --alert-bg: var(--warn-bg);
        --alert-border: color-mix(in srgb, var(--warn) 40%, var(--border-default));
        --alert-text: var(--warn-text);
        --alert-icon: var(--warn);
      }

      &.error {
        --alert-bg: var(--danger-bg);
        --alert-border: color-mix(in srgb, var(--danger) 40%, var(--border-default));
        --alert-text: var(--danger-text);
        --alert-icon: var(--danger);
      }
    }

    .icon-columns {
      color: var(--alert-icon);
      flex-shrink: 0;
      padding-top: 2px; // Optical alignment with text
    }

    .content {
      flex: 1;
      font-size: var(--text-sm);
    }

    .title {
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .message {
      line-height: 1.5;
    }

    .actions {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AppAlertComponent {
  @Input() type: AlertType = 'info';
  @Input() title?: string;
  @Input() message?: string;
  @Input() closable = false;
  @Input() actionLabel?: string;
  
  @Output() onAction = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  visible = true;

  get iconName(): IconName {
    switch (this.type) {
      case 'success': return 'check';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }

  close() {
    this.visible = false;
    this.onClose.emit();
  }
}
