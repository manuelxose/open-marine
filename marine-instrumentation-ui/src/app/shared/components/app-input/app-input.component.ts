import { Component, Input, forwardRef, booleanAttribute, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="app-input-container" 
      [class.disabled]="disabled" 
      [class.has-error]="!!error"
      [class.has-icon]="!!icon">
      
      <div class="input-wrapper">
        <app-icon *ngIf="icon" [name]="icon" size="sm" class="input-icon"></app-icon>
        
        <input
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onBlur()"
          class="native-input"
        />

        <button *ngIf="clearable && value() && !disabled" 
          type="button" 
          class="clear-btn" 
          (click)="clear()" 
          tabindex="-1"
          aria-label="Clear">
          <app-icon name="x" size="xs"></app-icon>
        </button>
      </div>

      <div *ngIf="error" class="error-text">
        <app-icon name="error" size="xs"></app-icon>
        {{ error }}
      </div>
    </div>
  `,
  styleUrls: ['./app-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInputComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppInputComponent implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() error?: string;
  @Input() icon?: IconName;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) clearable = false;

  readonly value = signal<string>('');

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value.set(input.value);
    this.onChange(input.value);
  }

  onBlur() {
    this.onTouched();
  }

  clear() {
    this.value.set('');
    this.onChange('');
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
