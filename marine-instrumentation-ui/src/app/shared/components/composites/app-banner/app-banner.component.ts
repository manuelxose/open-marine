import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AlertType } from '../app-alert/app-alert.component';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" [class]="type" *ngIf="visible">
      <div class="container">
        <app-icon [name]="iconName" size="sm"></app-icon>
        
        <span class="message">{{ message }}</span>
        
        <div class="actions">
           <app-button 
            *ngIf="actionLabel" 
            variant="ghost" 
            size="sm" 
            (click)="onAction.emit()">
            {{ actionLabel }}
          </app-button>
          
          <app-button 
            *ngIf="dismissible" 
            variant="ghost" 
            size="sm" 
            iconLeft="close" 
            (click)="dismiss()">
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .banner {
      width: 100%;
      padding: var(--spacing-sm) 0;
      font-size: var(--text-sm);
      color: var(--banner-text);
      background-color: var(--banner-bg);
      border: 1px solid var(--banner-border);
      --banner-bg: var(--bg-surface-secondary);
      --banner-text: var(--text-primary);
      --banner-border: var(--border-default);
      
      &.info { 
        --banner-bg: var(--info-bg); 
        --banner-text: var(--info-text);
        --banner-border: color-mix(in srgb, var(--info) 35%, var(--border-default));
      }
      &.success { 
        --banner-bg: var(--success-bg); 
        --banner-text: var(--success-text);
        --banner-border: color-mix(in srgb, var(--success) 35%, var(--border-default));
      }
      &.warning { 
        --banner-bg: var(--warn-bg); 
        --banner-text: var(--warn-text);
        --banner-border: color-mix(in srgb, var(--warn) 40%, var(--border-default));
      }
      &.error { 
        --banner-bg: var(--danger-bg); 
        --banner-text: var(--danger-text);
        --banner-border: color-mix(in srgb, var(--danger) 40%, var(--border-default));
      }
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .message {
      flex: 1;
      font-weight: 500;
    }

    .actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  `]
})
export class AppBannerComponent {
  @Input() type: AlertType = 'info';
  @Input() message = '';
  @Input() actionLabel?: string;
  @Input() dismissible = false;

  @Output() onAction = new EventEmitter<void>();
  @Output() onDismiss = new EventEmitter<void>();

  visible = true;

  get iconName(): IconName {
    switch (this.type) {
      case 'success': return 'check';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }

  dismiss() {
    this.visible = false;
    this.onDismiss.emit();
  }
}
