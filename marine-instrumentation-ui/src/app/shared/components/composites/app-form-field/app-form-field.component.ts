import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-form-field.component.html',
  styleUrls: ['./app-form-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppFormFieldComponent {
  @Input() label?: string;
  @Input() hint?: string;
  @Input() error?: string;
  @Input() required = false;
  
  // ID linking for accessibility usually requires ContentChild or robust ID generation
  // For now we keep it visual wrapper
}
