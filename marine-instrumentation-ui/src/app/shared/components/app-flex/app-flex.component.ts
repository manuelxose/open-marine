import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-flex',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styleUrls: ['./app-flex.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass',
    '[style.gap]': 'gap ? "var(--space-" + gap + ")" : null'
  }
})
export class AppFlexComponent {
  @Input() direction: 'row' | 'column' | 'row-reverse' | 'column-reverse' = 'row';
  @Input() justify: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' = 'start';
  @Input() align: 'start' | 'end' | 'center' | 'baseline' | 'stretch' = 'stretch';
  @Input() gap: string = ''; // '0', '1', '2', '4', etc. maps to design tokens
  @Input() wrap: 'nowrap' | 'wrap' | 'wrap-reverse' = 'nowrap';

  get hostClass(): string {
    const classes = ['app-flex'];

    // Direction
    if (this.direction !== 'row') classes.push(`flex-${this.direction}`);

    // Justify
    if (this.justify !== 'start') classes.push(`justify-${this.justify}`);

    // Align
    if (this.align !== 'stretch') classes.push(`align-${this.align}`);

    // Wrap
    if (this.wrap !== 'nowrap') classes.push(`flex-${this.wrap}`);

    return classes.join(' ');
  }
}
