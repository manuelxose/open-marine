import { Component, Input, forwardRef, booleanAttribute, ChangeDetectionStrategy, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <label class="app-checkbox-container" [class.disabled]="disabled">
      <input 
        type="checkbox"
        class="native-checkbox"
        [checked]="checked()"
        [disabled]="disabled"
        (change)="onChange($event)"
        (blur)="onTouched()"
      />
      <div class="checkbox-control" 
        [class.checked]="checked()" 
        [class.indeterminate]="indeterminate">
        
        <app-icon *ngIf="checked() && !indeterminate" 
          name="check" 
          size="xs" 
          class="checkbox-icon">
        </app-icon>
        
        <div *ngIf="indeterminate" class="indeterminate-mark"></div>
      </div>
      
      <span class="label-text">
        <ng-content></ng-content>
      </span>
    </label>
  `,
  styleUrls: ['./app-checkbox.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCheckboxComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCheckboxComponent implements ControlValueAccessor {
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) indeterminate = false;
  
  readonly checked = signal<boolean>(false);

  @Output() change = new EventEmitter<boolean>();

  onChangeFn: (value: boolean) => void = () => {};
  onTouched: () => void = () => {};

  onChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.checked.set(input.checked);
    this.onChangeFn(input.checked);
    this.change.emit(input.checked);
  }

  // ControlValueAccessor
  writeValue(value: boolean): void {
    this.checked.set(!!value);
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
