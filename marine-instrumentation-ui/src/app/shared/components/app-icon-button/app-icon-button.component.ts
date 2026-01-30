import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';
import { ButtonVariant, ButtonSize } from '../app-button/app-button.component';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <button
      type="button"
      [class]="'btn-icon btn-' + variant + ' btn-' + size"
      [class.active]="active"
      [attr.aria-label]="label"
      [disabled]="disabled"
      (click)="onClick($event)"
      [title]="label"
    >
      <app-icon [name]="icon" [size]="iconSize"></app-icon>
    </button>
  `,
  styleUrls: ['./app-icon-button.component.css']
})
export class AppIconButtonComponent {
  @Input({ required: true }) icon!: IconName;
  @Input({ required: true }) label!: string;
  @Input() variant: ButtonVariant = 'ghost';
  @Input() size: ButtonSize = 'md';
  
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) active = false;

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

  onClick(event: Event): void {
    if (!this.disabled) {
      this.action.emit(event);
    }
  }
}
