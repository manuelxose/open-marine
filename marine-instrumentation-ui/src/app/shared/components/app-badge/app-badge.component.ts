import { Component, Input, computed, signal, ChangeDetectionStrategy, ViewEncapsulation, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <span 
      [class]="computedClass()" 
      [style.gap.em]="icon() ? 0.35 : 0"
      [attr.aria-label]="ariaLabel || null"
    >
      <span *ngIf="dot" class="status-dot"></span>
      <span *ngIf="pulse" class="pulse-dot"></span>
      <app-icon 
        *ngIf="icon()" 
        [name]="icon()!" 
        [size]="iconSize()" 
      />
      <span class="content">
        <ng-content />
        <span *ngIf="label">{{ label }}</span>
      </span>
    </span>
  `,
  styleUrls: ['./app-badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AppBadgeComponent {
  private _variant = signal<BadgeVariant>('neutral');
  private _size = signal<BadgeSize>('md');
  protected icon = signal<IconName | undefined>(undefined);

  @Input() label?: string;
  @Input() set variant(v: BadgeVariant) { this._variant.set(v); }
  @Input() set size(v: BadgeSize) { this._size.set(v); }
  @Input('icon') set iconInput(v: IconName | undefined) { this.icon.set(v); }
  // Backwards compatibility alias if needed, or remove if unused in P.11 mandate
  @Input() set iconName(v: IconName | undefined) { this.icon.set(v); }
  
  @Input({ transform: booleanAttribute }) pulse = false;
  @Input({ transform: booleanAttribute }) dot = false;
  // Backwards compatibility alias
  @Input({ transform: booleanAttribute }) set isPulse(v: boolean) { this.pulse = v; }
  
  @Input() ariaLabel?: string;

  protected computedClass = computed(() => {
    return `app-badge badge-${this._variant()} badge-${this._size()}`;
  });

  protected iconSize = computed(() => {
    return this._size() === 'sm' ? 12 : 14;
  });
}
