import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';
import { ToastConfig } from './app-toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div 
      class="toast" 
      [class]="'toast-' + config.type"
      role="alert"
    >
      <div class="toast-icon">
        <app-icon [name]="iconName" [size]="20" />
      </div>
      
      <div class="toast-content">
        <span class="message">{{ config.message }}</span>
      </div>
      
      <button 
        *ngIf="config.action" 
        class="action-btn" 
        (click)="onAction()"
      >
        {{ config.action.label }}
      </button>

      <button 
        class="close-btn" 
        (click)="dismiss.emit()" 
        aria-label="Dismiss"
      >
        <app-icon name="x" [size]="16" />
      </button>
    </div>
  `,
  styleUrls: ['./app-toast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppToastComponent {
  @Input({ required: true }) config!: ToastConfig;
  @Output() dismiss = new EventEmitter<void>();

  get iconName(): IconName {
    switch (this.config.type) {
      case 'success': return 'check';
      case 'warning': return 'alert-triangle';
      case 'error': return 'alert-triangle';
      default: return 'info' as any; // Using accessible icon or 'info' if added
    }
  }

  onAction() {
    if (this.config.action?.callback) {
      this.config.action.callback();
    }
    this.dismiss.emit();
  }
}
