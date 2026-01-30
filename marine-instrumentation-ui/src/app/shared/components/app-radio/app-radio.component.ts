import { Component, Input, forwardRef, booleanAttribute, ChangeDetectionStrategy, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-radio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label class="app-radio-container" [class.disabled]="disabled">
      <input 
        type="radio"
        class="native-radio"
        [name]="name"
        [value]="value"
        [checked]="checked()"
        [disabled]="disabled"
        (change)="onChange($event)"
        (blur)="onTouched()"
      />
      <div class="radio-control" [class.checked]="checked()">
        <div class="radio-dot"></div>
      </div>
      
      <span class="label-text">
        <ng-content></ng-content>
      </span>
    </label>
  `,
  styleUrls: ['./app-radio.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppRadioComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppRadioComponent implements ControlValueAccessor {
  @Input() name = '';
  @Input() value: any;
  @Input({ transform: booleanAttribute }) disabled = false;
  
  readonly checked = signal<boolean>(false);

  // This internal model tracks the selected value of the group if used in a group logic, 
  // but standalone radio usually binds boolean or value match.
  // Standard Angular radio behavior: the ControlValueAccessor receives the selected value of the *group*.
  // We check if that value matches *this* radio's value.

  private controlValue: any = null;

  @Output() change = new EventEmitter<any>();

  onChangeFn: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  onChange(event: Event) {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.checked.set(true);
      this.onChangeFn(this.value);
      this.change.emit(this.value);
    }
  }

  // ControlValueAccessor
  writeValue(obj: any): void {
    this.controlValue = obj;
    // Simple strict equality check, can be improved for objects
    this.checked.set(obj === this.value);
  }

  registerOnChange(fn: any): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
