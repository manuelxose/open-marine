import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../../components/app-icon/app-icon.component';

export interface TabItem {
  id: string | number;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  count?: number;
}

export type TabVariant = 'line' | 'pills' | 'segment';
export type TabOrientation = 'horizontal' | 'vertical';
export type TabSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div 
      class="tabs-list" 
      [class]="'variant-' + variant + ' orientation-' + orientation + ' size-' + size" 
      role="tablist"
      [attr.aria-orientation]="orientation"
      (keydown)="onKeydown($event)">
      
      <button
        #tabButton
        *ngFor="let tab of items; let i = index"
        type="button"
        class="tab-item"
        [class.active]="activeTab === tab.id"
        [disabled]="tab.disabled"
        (click)="selectTab(tab)"
        role="tab"
        [attr.id]="'tab-' + tab.id"
        [attr.aria-selected]="activeTab === tab.id"
        [attr.tabindex]="activeTab === tab.id ? 0 : -1"
        [attr.aria-controls]="'panel-' + tab.id"
      >
        <app-icon *ngIf="tab.icon" [name]="tab.icon" [size]="iconSize"></app-icon>
        <span class="tab-label">{{ tab.label }}</span>
        <span *ngIf="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
        
        <!-- Active Indicator for 'line' variant -->
        <div *ngIf="variant === 'line' && activeTab === tab.id" class="active-line"></div>
      </button>
      
      <!-- Glider/Background for 'segment' variant -->
      <div *ngIf="variant === 'segment'" class="segment-glider" [style]="gliderStyle"></div>
    </div>
  `,
  styleUrls: ['./app-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTabsComponent implements AfterViewInit {
  @Input() items: TabItem[] = [];
  @Input() variant: TabVariant = 'line';
  @Input() orientation: TabOrientation = 'horizontal';
  @Input() size: TabSize = 'md';
  
  @Input() activeTab: string | number | undefined;
  @Output() activeTabChange = new EventEmitter<string | number>();

  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  get iconSize(): string {
    return this.size === 'sm' ? '16' : (this.size === 'lg' ? '24' : '20');
  }

  get gliderStyle(): any {
    // Only implemented for segment if we want accurate glider sizing
    // For now, CSS relative styling is often easier than JS calculation unless we use ResizeObserver
    return {};
  }

  ngAfterViewInit() {
    // Optional: Focus active tab on init if needed, or scrolling into view
  }

  selectTab(tab: TabItem) {
    if (tab.disabled || this.activeTab === tab.id) return;
    this.activeTab = tab.id;
    this.activeTabChange.emit(tab.id);
  }

  onKeydown(event: KeyboardEvent) {
    // Note: we navigate by DOM order; disabled tabs are skipped for activation.
    // We need the index of the CURRENT active tab in the DOM buttons list
    const buttons = this.tabButtons.toArray();
    const index = buttons.findIndex(b => b.nativeElement === document.activeElement);
    
    if (index === -1) return;

    let nextIndex = index;
    const isHorizontal = this.orientation !== 'vertical';

    switch (event.key) {
      case 'ArrowLeft':
        if (isHorizontal) nextIndex = index - 1;
        break;
      case 'ArrowRight':
        if (isHorizontal) nextIndex = index + 1;
        break;
      case 'ArrowUp':
        if (!isHorizontal) nextIndex = index - 1;
        break;
      case 'ArrowDown':
        if (!isHorizontal) nextIndex = index + 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    // Wrap around
    if (nextIndex < 0) nextIndex = buttons.length - 1;
    if (nextIndex >= buttons.length) nextIndex = 0;

    const targetButton = buttons[nextIndex];
    const targetItem = this.items[nextIndex];
    if (!targetButton || !targetItem) {
      return;
    }

    if (!targetItem.disabled) {
      targetButton.nativeElement.focus();
      this.selectTab(targetItem); // Auto-select on focus (standard for tabs)
      event.preventDefault();
    }
  }
}
