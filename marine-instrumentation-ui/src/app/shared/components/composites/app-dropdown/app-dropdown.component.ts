import { Component, Input, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem, DropdownPlacement } from '../menu.models';
import { AppIconComponent } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown-trigger" (click)="toggle($event)" #triggerRef>
      <ng-content></ng-content>
    </div>

    <div *ngIf="isOpen" 
         class="dropdown-menu" 
         [class]="placement"
         [class.is-open]="isOpen"
         (click)="$event.stopPropagation()">
      
      <ng-container *ngFor="let item of items">
        
        <div *ngIf="item.divider" class="dropdown-divider"></div>
        
        <button *ngIf="!item.divider"
                class="dropdown-item" 
                [class.danger]="item.danger"
                [disabled]="item.disabled"
                (click)="handleItemClick(item)">
          <app-icon *ngIf="item.icon" [name]="item.icon" size="sm"></app-icon>
          <span class="label">{{ item.label }}</span>
        </button>
        
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }

    .dropdown-trigger {
      cursor: pointer;
      display: inline-flex;
    }

    .dropdown-menu {
      position: absolute;
      z-index: var(--z-dropdown);
      min-width: 180px;
      max-width: 280px;
      padding: var(--spacing-xs) 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      transform-origin: top center;
      animation: fadeIn 0.15s ease-out;
      
      /* Placement variants */
      &.bottom-start { top: 100%; left: 0; margin-top: var(--spacing-xs); }
      &.bottom-end   { top: 100%; right: 0; margin-top: var(--spacing-xs); }
      &.top-start    { bottom: 100%; left: 0; margin-bottom: var(--spacing-xs); }
      &.top-end      { bottom: 100%; right: 0; margin-bottom: var(--spacing-xs); }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      background: none;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: background 0.1s;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background-color: var(--bg-hover);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.danger {
        color: var(--color-danger);
        &:hover:not(:disabled) {
          background-color: var(--color-danger-dim);
        }
      }

      .label {
        flex: 1;
      }
    }

    .dropdown-divider {
      height: 1px;
      background-color: var(--border-default);
      margin: var(--spacing-xs) 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95) translateY(-5px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class AppDropdownComponent {
  @Input() items: MenuItem[] = [];
  @Input() placement: DropdownPlacement = 'bottom-start';
  
  isOpen = false;

  constructor(private elementRef: ElementRef) {}

  toggle(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  handleItemClick(item: MenuItem) {
    if (item.disabled) return;
    
    if (item.action) {
      item.action();
    }
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
