import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styleUrls: ['./app-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass',
    '[style.grid-template-columns]': 'columnsStyle',
    '[style.grid-template-rows]': 'rows',
    '[style.gap]': 'gapStyle',
    '[style.grid-template-areas]': 'areas',
    '[style.align-items]': 'align',
    '[style.justify-items]': 'justify'
  }
})
export class AppGridComponent {
  @Input() columns: string | number = 1;
  @Input() rows: string = '';
  @Input() gap: string = ''; 
  @Input() areas: string = '';
  @Input() align: 'start' | 'end' | 'center' | 'stretch' = 'stretch';
  @Input() justify: 'start' | 'end' | 'center' | 'stretch' = 'stretch';
  @Input() inline = false;

  get hostClass(): string {
    return this.inline ? 'app-grid-inline' : 'app-grid';
  }

  get columnsStyle(): string {
    if (typeof this.columns === 'number' || (!isNaN(Number(this.columns)) && this.columns !== '')) {
      return `repeat(${this.columns}, minmax(0, 1fr))`;
    }
    return String(this.columns);
  }

  get gapStyle(): string {
    if (!this.gap) return '';
    // If it's a simple number string, assume space token
    if (!isNaN(Number(this.gap))) {
      return `var(--space-${this.gap})`;
    }
    return this.gap;
  }
}
