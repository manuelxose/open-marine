import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styleUrls: ['./app-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass',
    '[style.--box-bg]': 'bgColor',
    '[style.--box-border-color]': 'borderColor'
  }
})
export class AppBoxComponent {
  @Input() padding: string = '';
  @Input() margin: string = '';
  @Input() bg: string = '';
  @Input() border: string | boolean = false;
  @Input() radius: 'none' | 'sm' | 'md' | 'lg' | 'full' = 'none';
  @Input() shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'none';
  @Input() block = false;

  get hostClass(): string {
    const classes = ['app-box'];

    // Padding
    if (this.padding) classes.push(`p-${this.padding}`);
    
    // Margin
    if (this.margin) classes.push(`m-${this.margin}`);

    // Background
    if (this.bg) classes.push(`bg-${this.bg}`);

    // Border
    if (this.border === true || this.border === '') classes.push('border');
    else if (this.border) classes.push(`border-${this.border}`);

    // Radius
    if (this.radius && this.radius !== 'none') classes.push(`rounded-${this.radius}`);

    // Shadow
    if (this.shadow && this.shadow !== 'none') classes.push(`shadow-${this.shadow}`);

    return classes.join(' ');
  }

  get bgColor(): string | null {
    // If bg is a specific hex or var not covered by classes, we could handle it here
    // For now assuming utility classes
    return null;
  }

  get borderColor(): string | null {
    return null;
  }
}
