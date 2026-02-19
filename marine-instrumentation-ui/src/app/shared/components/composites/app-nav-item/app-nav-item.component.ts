import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AppBadgeComponent } from '../../app-badge/app-badge.component';

@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AppIconComponent, AppBadgeComponent],
  template: `
    <a 
      *ngIf="href"
      [routerLink]="href"
      class="nav-item"
      [class.active]="active"
      [class.disabled]="disabled"
      routerLinkActive="active"
      [attr.aria-disabled]="disabled"
      [attr.tabindex]="disabled ? -1 : 0">
      
      <app-icon *ngIf="icon" [name]="icon" class="nav-icon" size="sm"></app-icon>
      <span class="nav-label">{{ label }}</span>
      <span class="spacer"></span>
      <app-badge *ngIf="badge" [label]="badge + ''" size="sm" variant="info"></app-badge>
    </a>

    <button
      *ngIf="!href"
      type="button"
      class="nav-item"
      [class.active]="active"
      [class.disabled]="disabled"
      [disabled]="disabled">
      
      <app-icon *ngIf="icon" [name]="icon" class="nav-icon" size="sm"></app-icon>
      <span class="nav-label">{{ label }}</span>
      <span class="spacer"></span>
      <app-badge *ngIf="badge" [label]="badge + ''" size="sm" variant="info"></app-badge>
    </button>
  `,
  styleUrls: ['./app-nav-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavItemComponent {
  @Input() icon: IconName | undefined;
  @Input() label!: string;
  @Input() active = false; // Manual override
  @Input() badge: string | number | undefined;
  @Input() href: string | (string | number)[] | undefined;
  @Input() disabled = false;
}
