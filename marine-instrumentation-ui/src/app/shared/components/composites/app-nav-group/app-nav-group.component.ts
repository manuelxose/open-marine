import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNavItemComponent } from '../app-nav-item/app-nav-item.component';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export interface NavItemDef {
  label: string;
  icon?: IconName;
  href?: string | (string | number)[];
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
}

@Component({
  selector: 'app-nav-group',
  standalone: true,
  imports: [CommonModule, AppNavItemComponent, AppIconComponent],
  template: `
    <div class="nav-group">
      <div 
        class="nav-group-header" 
        [class.clickable]="collapsible"
        (click)="toggle()">
        
        <span class="label">{{ label }}</span>
        
        <app-icon 
          *ngIf="collapsible" 
          name="chevron-down" 
          size="xs" 
          class="toggle-icon"
          [class.expanded]="expanded">
        </app-icon>
      </div>

      <div class="nav-group-content" *ngIf="expanded" role="list">
        <!-- Render items from prop -->
        <ng-container *ngIf="items.length > 0">
          <app-nav-item
            *ngFor="let item of items"
            [label]="item.label"
            [icon]="item.icon"
            [href]="item.href"
            [badge]="item.badge"
            [disabled]="item.disabled || false"
            [active]="item.active || false">
          </app-nav-item>
        </ng-container>

        <!-- Or project content -->
        <ng-content *ngIf="items.length === 0"></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./app-nav-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavGroupComponent {
  @Input() label!: string;
  @Input() items: NavItemDef[] = [];
  @Input() collapsible = false;
  
  // Internal state for expansion
  private _expanded = true;
  @Input() 
  set expanded(val: boolean) {
    this._expanded = val;
  }
  get expanded(): boolean {
    return this._expanded;
  }

  toggle() {
    if (this.collapsible) {
      this._expanded = !this._expanded;
    }
  }
}
