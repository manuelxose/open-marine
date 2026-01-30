import { Component, Input, forwardRef, booleanAttribute, ChangeDetectionStrategy, signal, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="app-textarea-container" 
      [class.disabled]="disabled" 
      [class.has-error]="!!error">
      
      <div class="textarea-wrapper">
        <textarea
          [rows]="rows"
          [style.resize]="resize"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [attr.maxlength]="maxLength ?? null"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onBlur()"
          class="native-textarea">
        </textarea>
      </div>

      <div class="textarea-footer" *ngIf="showCount || error">
        <div class="error-text" *ngIf="error">{{ error }}</div>
        <div class="spacer"></div>
        <div class="char-count" *ngIf="showCount && maxLength">
          {{ value().length }} / {{ maxLength }}
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app-textarea.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppTextareaComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTextareaComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() error?: string;
  @Input({ transform: numberAttribute }) rows = 3;
  @Input({ transform: numberAttribute }) maxLength?: number;
  @Input() resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';
  
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) showCount = false;

  readonly value = signal<string>('');

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(event: Event) {
    const input = event.target as HTMLTextAreaElement;
    this.value.set(input.value);
    this.onChange(input.value);
  }

  onBlur() {
    this.onTouched();
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
