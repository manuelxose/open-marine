import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeadingComponent } from '../../app-heading/app-heading.component';
import { AppIconButtonComponent } from '../../app-icon-button/app-icon-button.component';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, AppHeadingComponent, AppIconButtonComponent],
  templateUrl: './app-bottom-sheet.component.html',
  styleUrls: ['./app-bottom-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppBottomSheetComponent {
  @Input() open = false;
  @Input() title = '';
  
  @Output() close = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('sheet-backdrop')) {
      this.close.emit();
    }
  }
}
