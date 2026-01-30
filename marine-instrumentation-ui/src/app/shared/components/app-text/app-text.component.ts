import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TextVariant = 'body' | 'caption' | 'overline' | 'code' | 'value';
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type TextWeight = 'light' | 'normal' | 'medium' | 'bold';
export type TextColor = 'primary' | 'secondary' | 'accent' | 'warn' | 'danger' | 'success' | 'muted' | 'inverse';

@Component({
  selector: 'app-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p [ngClass]="classes()" [style.color]="inlineColor()">
      <ng-content></ng-content>
    </p>
  `,
  styles: [`
    :host { display: contents; }
    p { margin: 0; }
    .truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class AppTextComponent {
  private readonly _variant = signal<TextVariant>('body');
  private readonly _size = signal<TextSize | undefined>(undefined);
  private readonly _weight = signal<TextWeight | undefined>(undefined);
  private readonly _color = signal<TextColor | string | undefined>(undefined);
  private readonly _truncate = signal<boolean>(false);

  @Input() set variant(val: TextVariant) { this._variant.set(val); }
  @Input() set size(val: TextSize) { this._size.set(val); }
  @Input() set weight(val: TextWeight) { this._weight.set(val); }
  @Input() set color(val: TextColor | string) { this._color.set(val); }
  @Input() set truncate(val: boolean) { this._truncate.set(val !== false); } // Coerce truthy

  readonly classes = computed(() => {
    const list: string[] = [];
    const v = this._variant();
    
    // Variant defaults
    if (v === 'caption') {
      list.push('text-sm', 'text-muted');
    } else if (v === 'overline') {
      list.push('text-xs', 'uppercase', 'tracking-wide', 'text-muted');
    } else if (v === 'code') {
      list.push('font-mono');
    } else if (v === 'value') {
      list.push('text-value');
    }

    // Overrides
    if (this._size()) list.push(`text-${this._size()}`);
    if (this._weight()) list.push(`font-${this._weight()}`);
    if (this._truncate()) list.push('truncate');
    
    // Color classes if it matches a token name
    const color = this._color();
    if (color && this.isThemeColor(color)) {
      list.push(`text-${color}`);
    }

    return list.join(' ');
  });

  readonly inlineColor = computed(() => {
    const color = this._color();
    // If it's not a theme color (e.g. hex code), apply as inline style
    return (color && !this.isThemeColor(color)) ? color : undefined;
  });

  private isThemeColor(c: string): c is TextColor {
    return ['primary', 'secondary', 'accent', 'warn', 'danger', 'success', 'muted', 'inverse'].includes(c);
  }
}
