import { Component, Input, forwardRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './app-time-picker.component.html',
  styleUrls: ['./app-time-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppTimePickerComponent),
      multi: true
    }
  ]
})
export class AppTimePickerComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() disabled = false;
  @Input() placeholder = '';
  @Input() step = 60; // seconds

  value = signal<string>('');

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(obj: any): void {
    // Expects "HH:mm" or "HH:mm:ss"
    this.value.set(obj || '');
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

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
  }
}
