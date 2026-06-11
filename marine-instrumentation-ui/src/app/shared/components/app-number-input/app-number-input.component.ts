import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-number-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './app-number-input.component.html',
  styleUrls: ['./app-number-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppNumberInputComponent),
      multi: true
    }
  ]
})
export class AppNumberInputComponent implements ControlValueAccessor {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() disabled = false;
  
  value = signal<number>(0);

  onChange: any = () => {};
  onTouched: any = () => {};

  increment() {
    if (this.disabled) return;
    // Handle floating point precision issues simply
    const newValue = this.value() + this.step;
    // Check constraints
    if (newValue <= this.max) {
       this.updateValue(this.fixPrecision(newValue));
    } else {
       this.updateValue(this.max);
    }
  }

  decrement() {
    if (this.disabled) return;
    const newValue = this.value() - this.step;
    if (newValue >= this.min) {
        this.updateValue(this.fixPrecision(newValue));
    } else {
        this.updateValue(this.min);
    }
  }

  private fixPrecision(val: number): number {
    // If step is 0.1, we want 1 decimal. 
    // Quick hack: limit to 4 decimals to avoid 0.300000000004
    return Math.round(val * 10000) / 10000;
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    if (!isNaN(val)) {
        this.value.set(val);
        this.onChange(val);
    }
  }

  onBlur() {
     this.onTouched();
     let val = this.value();
     let clamped = val;
     
     if (val < this.min) clamped = this.min;
     if (val > this.max) clamped = this.max;
     
     if (clamped !== val) {
         this.updateValue(clamped);
     }
  }

  updateValue(val: number) {
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
  }

  writeValue(val: number): void {
    if (val !== undefined && val !== null) {
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
