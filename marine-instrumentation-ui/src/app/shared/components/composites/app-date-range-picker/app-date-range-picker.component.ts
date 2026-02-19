import { Component, Input, forwardRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AppDatePickerComponent } from '../app-date-picker/app-date-picker.component';

export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePickerComponent],
  templateUrl: './app-date-range-picker.component.html',
  styleUrls: ['./app-date-range-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDateRangePickerComponent),
      multi: true
    }
  ]
})
export class AppDateRangePickerComponent implements ControlValueAccessor {
  @Input() label: string | undefined;
  @Input() min: string | undefined;
  @Input() max: string | undefined;
  @Input() disabled = false;

  startValue = signal<string | null>(null);
  endValue = signal<string | null>(null);

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(obj: DateRangeValue | null): void {
    if (obj) {
      this.startValue.set(obj.start);
      this.endValue.set(obj.end);
    } else {
      this.startValue.set(null);
      this.endValue.set(null);
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

  onStartChange(val: string) {
    this.startValue.set(val);
    this.emitChange();
  }

  onEndChange(val: string) {
    this.endValue.set(val);
    this.emitChange();
  }

  private emitChange() {
    this.onChange({
      start: this.startValue(),
      end: this.endValue()
    });
    this.onTouched();
  }
}
