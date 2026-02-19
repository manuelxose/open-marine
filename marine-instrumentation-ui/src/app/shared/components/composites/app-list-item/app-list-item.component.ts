import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-list-item',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="list-item"
         [ngClass]="{
           'list-item--hoverable': hoverable || clicked.observed,
           'list-item--selected': selected,
           'list-item--divider': divider
         }"
         (click)="onClick()">
      
      <!-- Leading -->
      <div class="list-item-leading" *ngIf="leadingIcon || leading">
         <app-icon *ngIf="leadingIcon" [name]="leadingIcon"></app-icon>
         <span *ngIf="leading">{{ leading }}</span>
      </div>
       <!-- Slot for complex leading -->
      <div class="list-item-leading" *ngIf="!leadingIcon && !leading">
         <ng-content select="[leading]"></ng-content>
      </div>

      <!-- Content -->
      <div class="list-item-content">
        <div class="list-item-primary" *ngIf="primary">{{ primary }}</div>
        <ng-content select="[primary]" *ngIf="!primary"></ng-content>
        <div *ngIf="!primary">
            <ng-content></ng-content> <!-- Default slot -->
        </div>
        
        <div class="list-item-secondary" *ngIf="secondary">{{ secondary }}</div>
        <ng-content select="[secondary]" *ngIf="!secondary"></ng-content>
      </div>

      <!-- Trailing -->
      <div class="list-item-trailing" *ngIf="trailingIcon || trailing">
         <span *ngIf="trailing">{{ trailing }}</span>
         <app-icon *ngIf="trailingIcon" [name]="trailingIcon"></app-icon>
      </div>
      <div class="list-item-trailing" *ngIf="!trailingIcon && !trailing">
         <ng-content select="[trailing]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .list-item {
      display: flex;
      align-items: center;
      padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
      gap: var(--spacing-md, 16px);
      background: transparent;
      color: var(--text-primary);
      transition: background-color 0.2s;
      min-height: 48px;
      text-decoration: none;

      &--divider {
        border-bottom: 1px solid var(--border-default);
      }

      &--hoverable {
        cursor: pointer;
        &:hover {
          background-color: var(--bg-surface-secondary);
        }
      }

      &--selected {
        background-color: rgba(var(--primary-rgb), 0.08);
        color: var(--primary, #3b82f6);
        
        .list-item-secondary {
           color: var(--primary-600, var(--primary));
        }
      }

      &-leading {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        min-width: 24px;
        
        &:empty { display: none; }
      }

      &-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
      }

      &-primary {
        font-weight: 500;
        font-size: var(--text-base, 1rem);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &-secondary {
        font-size: var(--text-sm, 0.875rem);
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 2px;
      }

      &-trailing {
        display: flex;
        align-items: center;
        color: var(--text-tertiary);
        gap: 0.5rem;
        
        &:empty { display: none; }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppListItemComponent {
  @Input() primary?: string;
  @Input() secondary?: string;
  @Input() leading?: string; // Text for leading
  @Input() trailing?: string; // Text for trailing
  @Input() leadingIcon?: IconName;
  @Input() trailingIcon?: IconName;
  @Input() divider = false;
  @Input() selected = false;
  @Input() hoverable = false;

  @Output() clicked = new EventEmitter<void>();

  onClick() {
    if (this.hoverable || this.clicked.observed) {
      this.clicked.emit();
    }
  }
}
