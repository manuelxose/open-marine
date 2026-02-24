import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'ghost';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-card.component.html',
  styleUrls: ['./app-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCardComponent {
  @Input() header?: string;
  @Input() footer?: string;
  @Input() variant: CardVariant = 'default';
  @Input() hoverable = false;
  @Input() selected = false;

  @Output() clicked = new EventEmitter<void>();

  onClick() {
    if (this.hoverable || this.clicked.observed) {
       this.clicked.emit();
    }
  }
}
