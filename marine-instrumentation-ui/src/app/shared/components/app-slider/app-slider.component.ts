import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSliderComponent),
      multi: true
    }
  ],
  template: `
    <div class="slider-container" [class.disabled]="isDisabled">
      <div class="slider-header" *ngIf="label || showValue">
        <label [attr.for]="id" class="slider-label" *ngIf="label">{{ label }}</label>
        <span class="slider-value" *ngIf="showValue">{{ displayValue }}</span>
      </div>
      
      <div class="slider-track-container">
        <input
          type="range"
          [id]="id"
          [min]="min"
          [max]="max"
          [step]="step"
          [disabled]="isDisabled"
          [ngModel]="value"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()"
          class="slider-input"
        />
        <div class="slider-fill" [style.width.%]="fillPercent"></div>
      </div>
    </div>
  `,
  styleUrls: ['./app-slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSliderComponent implements ControlValueAccessor {
  private _value = signal(0);
  private _min = signal(0);
  private _max = signal(100);
  private _step = signal(1);
  private _disabled = signal(false);
  private _label = signal<string | undefined>(undefined);
  private _showValue = signal(true);
  
  @Input() valueFormatter?: (v: number) => string;

  @Input() set min(v: number) { this._min.set(v); }
  @Input() set max(v: number) { this._max.set(v); }
  @Input() set step(v: number) { this._step.set(v); }
  @Input() set disabled(v: boolean) { this._disabled.set(v); }
  @Input() set label(v: string | undefined) { this._label.set(v); }
  @Input() set showValue(v: boolean) { this._showValue.set(v); }

  @Output() valueChange = new EventEmitter<number>();
  
  public id = `slider-${Math.random().toString(36).substr(2, 9)}`;

  get value(): number { return this._value(); }
  get min(): number { return this._min(); }
  get max(): number { return this._max(); }
  get step(): number { return this._step(); }
  get isDisabled(): boolean { return this._disabled(); }
  get label(): string | undefined { return this._label(); }
  get showValue(): boolean { return this._showValue(); }

  get displayValue(): string {
    const v = this._value();
    if (v === null || v === undefined || Number.isNaN(v)) return '--';
    return this.valueFormatter ? this.valueFormatter(v) : v.toString();
  }

  get fillPercent(): number {
    const min = this._min();
    const max = this._max();
    const val = this._value();
    if (max <= min) return 0;
    return ((val - min) / (max - min)) * 100;
  }

  onChange = (_value: number) => {};
  onTouched = () => {};

  writeValue(value: number): void {
    this._value.set(value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  onValueChange(val: number) {
    this._value.set(val);
    this.onChange(val);
    this.valueChange.emit(val);
  }
}
