import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeadingComponent } from '../../app-heading/app-heading.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export interface DialogAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  handler: () => void;
}

export type DialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'default';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, AppHeadingComponent, AppTextComponent, AppButtonComponent, AppIconComponent],
  templateUrl: './app-dialog.component.html',
  styleUrls: ['./app-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppDialogComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() variant: DialogVariant = 'default';
  @Input() actions: DialogAction[] = [];
  
  @Output() close = new EventEmitter<void>();

  get iconName(): IconName | null {
    switch (this.variant) {
      case 'info': return 'info';
      case 'success': return 'check';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return null;
    }
  }

  get iconColor(): string {
    switch (this.variant) {
      case 'info': return 'var(--info)';
      case 'success': return 'var(--success)';
      case 'warning': return 'var(--warn)';
      case 'danger': return 'var(--danger)';
      default: return 'var(--text-primary)';
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.close.emit();
    }
  }
}
