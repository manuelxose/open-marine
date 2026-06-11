import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';

export type FabVariant = 'primary' | 'secondary' | 'accent' | 'warn';
export type FabSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-fab',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <button
      type="button"
      [class]="'fab fab-' + variant + ' fab-' + size"
      [class.fab-extended]="extended"
      [disabled]="disabled"
      [attr.aria-label]="label"
      (click)="onClick($event)"
    >
      <app-icon [name]="icon" [size]="iconSize"></app-icon>
      <span *ngIf="extended && label" class="fab-label">{{ label }}</span>
    </button>
  `,
  styleUrls: ['./app-fab.component.css']
})
export class AppFabComponent {
  @Input({ required: true }) icon!: IconName;
  @Input() label?: string;
  @Input() variant: FabVariant = 'primary';
  @Input() size: FabSize = 'lg';
  
  @Input({ transform: booleanAttribute }) extended = false;
  @Input({ transform: booleanAttribute }) disabled = false;

  @Output() action = new EventEmitter<Event>();

  get iconSize(): number {
    switch (this.size) {
      case 'sm': return 20;
      case 'lg': return 24;
      default: return 24; // md
    }
  }

  onClick(event: Event): void {
    if (!this.disabled) {
      this.action.emit(event);
    }
  }
}
