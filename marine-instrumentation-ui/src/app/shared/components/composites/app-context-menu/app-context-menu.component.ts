import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../menu.models';
import { AppIconComponent } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="isVisible" 
         class="context-menu" 
         [style.left.px]="position.x"
         [style.top.px]="position.y"
         (click)="$event.stopPropagation()">
      
      <ng-container *ngFor="let item of items">
        <div *ngIf="item.divider" class="menu-divider"></div>
        
        <button *ngIf="!item.divider"
                class="menu-item"
                [class.danger]="item.danger"
                [disabled]="item.disabled"
                (click)="handleItemClick(item)">
          <app-icon *ngIf="item.icon" [name]="item.icon" size="sm"></app-icon>
          <span class="label">{{ item.label }}</span>
        </button>
      </ng-container>

    </div>
    
    <!-- Backdrop to close on click outside -->
    <div *ngIf="isVisible" class="backdrop" (click)="close()"></div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: calc(var(--z-dropdown) - 1);
      background: transparent;
    }

    .context-menu {
      position: fixed;
      z-index: var(--z-dropdown);
      min-width: 200px;
      padding: var(--spacing-xs) 0;
      background: var(--gb-bg-panel);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xl);
      animation: contextFadeIn 0.1s ease-out;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      background: none;
      border: none;
      color: var(--gb-text-value);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: background 0.1s;

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
    }

    .menu-divider {
      height: 1px;
      background-color: var(--border-default);
      margin: var(--spacing-xs) 0;
    }

    @keyframes contextFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class AppContextMenuComponent {
  @Input() items: MenuItem[] = [];
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };
  
  @Output() closeMenu = new EventEmitter<void>();

  private _isVisible = false;
  @Input() 
  set isVisible(value: boolean) {
    this._isVisible = value;
    if (value) {
      // Small adjustment to prevent menu from going off-screen (basic)
      // Ideally this would measure the window vs menu size
    }
  }
  get isVisible(): boolean {
    return this._isVisible;
  }

  handleItemClick(item: MenuItem) {
    if (item.disabled) return;
    if (item.action) item.action();
    this.close();
  }

  close() {
    this.isVisible = false;
    this.closeMenu.emit();
  }

  // Handle Escape key
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isVisible) {
      this.close();
    }
  }
}
