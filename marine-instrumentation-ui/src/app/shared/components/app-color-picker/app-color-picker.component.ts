import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-color-picker.component.html',
  styleUrls: ['./app-color-picker.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppColorPickerComponent),
      multi: true
    }
  ]
})
export class AppColorPickerComponent implements ControlValueAccessor {
  @Input() disabled = false;
  
  value = signal<string>('#000000');

  onChange: any = () => {};
  onTouched: any = () => {};

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value.set(input.value);
    this.onChange(input.value);
  }
  
  onBlur() {
    this.onTouched();
  }

  writeValue(val: string): void {
    if (val) {
      this.value.set(val);
    }
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
