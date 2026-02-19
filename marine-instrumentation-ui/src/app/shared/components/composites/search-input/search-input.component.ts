import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppSpinnerComponent } from '../../app-spinner/app-spinner.component';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent, AppSpinnerComponent],
  templateUrl: './search-input.component.html',
  styleUrls: ['./search-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchInputComponent {
  @Input() placeholder = 'Search...';
  @Input() loading = false;
  @Input() suggestions: string[] = [];
  @Input() disabled = false;

  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();
  @Output() suggestionSelect = new EventEmitter<string>();

  query = signal('');
  showSuggestions = signal(false);

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.showSuggestions.set(value.length > 0 && this.suggestions.length > 0);
  }

  onFocus() {
    if (this.query().length > 0 && this.suggestions.length > 0) {
      this.showSuggestions.set(true);
    }
  }

  onBlur() {
    // Delay hiding suggestions to allow click event to register
    setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }

  onEnter() {
    if (this.query()) {
      this.search.emit(this.query());
      this.showSuggestions.set(false);
    }
  }

  onClear() {
    this.query.set('');
    this.clear.emit();
    this.search.emit('');
    this.showSuggestions.set(false);
  }

  selectSuggestion(suggestion: string) {
    this.query.set(suggestion);
    this.suggestionSelect.emit(suggestion);
    this.search.emit(suggestion);
    this.showSuggestions.set(false);
  }
}
