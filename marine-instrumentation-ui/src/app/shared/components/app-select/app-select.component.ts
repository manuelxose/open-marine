import { Component, Input, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AppIconComponent } from '../app-icon/app-icon.component';

export interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './app-select.component.html',
  styleUrls: ['./app-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true
    }
  ]
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input() placeholder = 'Select an option';
  @Input() disabled = false;
  @Input() error: string | null = null;
  @Input() options: SelectOption[] = [];

  // Internal value signal
  value = signal<any>(null);

  // Computed label to display in the custom trigger
  displayLabel = computed(() => {
    const val = this.value();
    // Check if value is "empty"
    if (val === null || val === undefined || val === '') {
      return this.placeholder;
    }
    
    // Find matching option (loose equality might be needed if types mismatch, 
    // but ngValue usually preserves strict reference)
    const option = this.options.find(o => o.value === val);
    return option ? option.label : String(val);
  });

  // Track if a valid value is selected to style text color (placeholder vs value)
  hasSelection = computed(() => {
    const val = this.value();
    return val !== null && val !== undefined && val !== '';
  });

  onChange: any = () => {};
  onTouched: any = () => {};

  // Called when internal select changes
  updateValue(val: any) {
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
  }

  // ControlValueAccessor methods
  writeValue(val: any): void {
    this.value.set(val);
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
