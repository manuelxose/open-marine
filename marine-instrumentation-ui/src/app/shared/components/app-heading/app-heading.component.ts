import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingColor = 'primary' | 'secondary' | 'accent' | 'warn' | 'muted' | 'inverse';

@Component({
  selector: 'app-heading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="levelSignal()">
      <h1 *ngSwitchCase="1" [ngClass]="classes()"><ng-content></ng-content></h1>
      <h2 *ngSwitchCase="2" [ngClass]="classes()"><ng-content></ng-content></h2>
      <h3 *ngSwitchCase="3" [ngClass]="classes()"><ng-content></ng-content></h3>
      <h4 *ngSwitchCase="4" [ngClass]="classes()"><ng-content></ng-content></h4>
      <h5 *ngSwitchCase="5" [ngClass]="classes()"><ng-content></ng-content></h5>
      <h6 *ngSwitchCase="6" [ngClass]="classes()"><ng-content></ng-content></h6>
    </ng-container>
  `,
  styles: [`
    :host { display: contents; }
    h1, h2, h3, h4, h5, h6 { margin: 0; font-family: var(--font-display, 'Space Grotesk', sans-serif); }
  `]
})
export class AppHeadingComponent {
  private readonly _level = signal<HeadingLevel>(2);
  private readonly _color = signal<HeadingColor | undefined>(undefined);
  private readonly _truncate = signal<boolean>(false);

  @Input() set level(val: HeadingLevel | string) { 
    this._level.set(Number(val) as HeadingLevel); 
  }
  @Input() set color(val: HeadingColor) { this._color.set(val); }
  @Input() set truncate(val: boolean) { this._truncate.set(val !== false); }

  readonly levelSignal = this._level.asReadonly();

  readonly classes = computed(() => {
    const list: string[] = [];
    const lvl = this._level();
    
    // Default sizes per level if not overridden? 
    // Actually our global CSS usually handles h1-h6 sizes, but let's be explicit to match design system
    if (lvl === 1) list.push('text-4xl font-bold');
    if (lvl === 2) list.push('text-3xl font-bold');
    if (lvl === 3) list.push('text-2xl font-semibold');
    if (lvl === 4) list.push('text-xl font-semibold');
    if (lvl === 5) list.push('text-lg font-medium');
    if (lvl === 6) list.push('text-base font-medium');

    if (this._color()) list.push(`text-${this._color()}`);
    if (this._truncate()) list.push('truncate');
    
    return list.join(' ');
  });
}
