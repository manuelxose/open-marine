import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="toggle-container" [class.disabled]="disabled">
      <div class="toggle-switch" [class.checked]="checked()">
        <input
          type="checkbox"
          [checked]="checked()"
          [disabled]="disabled"
          (change)="onChange($event)"
        />
        <span class="slider round"></span>
      </div>
      <span class="label-text" *ngIf="label">{{ label }}</span>
    </label>
  `,
  styleUrls: ['./app-toggle.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppToggleComponent),
      multi: true
    }
  ]
})
export class AppToggleComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() disabled = false;

  readonly checked = signal(false);

  // ControlValueAccessor methods
  onChangeFn: (value: boolean) => void = () => {};
  onTouchedFn: () => void = () => {};

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onChange(event: Event): void {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    this.checked.set(input.checked);
    this.onChangeFn(input.checked);
    this.onTouchedFn();
  }
}
