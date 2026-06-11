import { Component, Input, Output, EventEmitter, booleanAttribute, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';

export type ChipVariant = 'neutral' | 'primary' | 'input';

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <button 
      [type]="type"
      class="app-chip"
      [class.chip-neutral]="variant === 'neutral'"
      [class.chip-primary]="variant === 'primary'"
      [class.chip-input]="variant === 'input'"
      [class.chip-selected]="selected"
      [class.chip-removable]="removable"
      [disabled]="disabled"
      (click)="onClick($event)">
      
      <app-icon *ngIf="icon" [name]="icon" size="sm" class="chip-icon"></app-icon>
      
      <span class="chip-label">
        <ng-content></ng-content>
      </span>

      <span *ngIf="removable" 
        class="chip-remove" 
        (click)="onRemove($event)" 
        role="button" 
        aria-label="Remove">
        <app-icon name="x" size="xs"></app-icon>
      </span>
    </button>
  `,
  styleUrls: ['./app-chip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppChipComponent {
  @Input() variant: ChipVariant = 'neutral';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() icon?: IconName;
  
  @Input({ transform: booleanAttribute }) removable = false;
  @Input({ transform: booleanAttribute }) selected = false;
  @Input({ transform: booleanAttribute }) disabled = false;

  @Output() remove = new EventEmitter<void>();

  onRemove(event: MouseEvent) {
    event.stopPropagation();
    if (!this.disabled) {
      this.remove.emit();
    }
  }

  onClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
