import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export interface TabItem {
  id: string | number;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  count?: number;
}

export type TabVariant = 'line' | 'pills' | 'contained';
export type TabOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div 
      class="tabs-list" 
      [class]="'variant-' + variant + ' orientation-' + orientation + ' size-' + size" 
      role="tablist"
      [attr.aria-orientation]="orientation">
      
      <button
        *ngFor="let tab of items"
        type="button"
        class="tab-item"
        [class.active]="activeTab === tab.id"
        [disabled]="tab.disabled"
        (click)="selectTab(tab)"
        role="tab"
        [attr.aria-selected]="activeTab === tab.id"
        [attr.tabindex]="activeTab === tab.id ? 0 : -1"
      >
        <app-icon *ngIf="tab.icon" [name]="tab.icon" [size]="size === 'sm' ? 'xs' : 'sm'"></app-icon>
        <span class="tab-label">{{ tab.label }}</span>
        <span *ngIf="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
        
        <!-- Active Indicator for animation (optional depending on style) -->
        <div *ngIf="variant === 'line' && activeTab === tab.id" class="active-indicator" layout:view-transition-name="active-tab"></div>
      </button>
    </div>
  `,
  styleUrls: ['./app-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTabsComponent {
  @Input() items: TabItem[] = [];
  @Input() variant: TabVariant = 'line';
  @Input() orientation: TabOrientation = 'horizontal';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  
  @Input() activeTab: string | number | undefined;
  @Output() activeTabChange = new EventEmitter<string | number>();

  selectTab(tab: TabItem) {
    if (tab.disabled || this.activeTab === tab.id) return;
    this.activeTab = tab.id;
    this.activeTabChange.emit(tab.id);
  }
}
