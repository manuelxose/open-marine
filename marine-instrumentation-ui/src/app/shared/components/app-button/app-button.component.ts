import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'outline' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <button
      type="button"
      [class]="'btn btn-' + variant + ' btn-' + size"
      [class.active]="active"
      [class.btn-loading]="loading"
      [class.btn-full-width]="fullWidth"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
    >
      <span *ngIf="loading" class="spinner" aria-hidden="true"></span>
      <app-icon *ngIf="leftIcon && !loading" [name]="leftIcon" [size]="iconSize"></app-icon>
      <span class="label" *ngIf="label || (loading && loadingLabel)">{{ loading ? (loadingLabel || label) : label }}</span>
      <ng-content></ng-content>
      <app-icon *ngIf="iconRight && !loading" [name]="iconRight" [size]="iconSize"></app-icon>
    </button>
  `,
  styleUrls: ['./app-button.component.css']
})
export class AppButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) active = false;
  @Input({ transform: booleanAttribute }) fullWidth = false;

  @Input() icon?: IconName;
  @Input() iconLeft?: IconName;
  @Input() iconRight?: IconName;
  @Input() label?: string;
  @Input() loadingLabel?: string;

  @Output() action = new EventEmitter<Event>();

  get iconSize(): number {
    switch (this.size) {
      case 'xs': return 14;
      case 'sm': return 16;
      case 'lg': return 24;
      case 'xl': return 28;
      default: return 20; // md
    }
  }

  get leftIcon(): IconName | undefined {
    return this.iconLeft ?? this.icon;
  }

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.action.emit(event);
    }
  }
}
