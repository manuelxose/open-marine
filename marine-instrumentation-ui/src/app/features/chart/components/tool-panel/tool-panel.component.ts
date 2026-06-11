import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { AppIconComponent, IconName } from '../../../../shared/components/app-icon/app-icon.component';
import { AppBadgeComponent, BadgeVariant } from '../../../../shared/components/app-badge/app-badge.component';

@Component({
  selector: 'app-tool-panel',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tool-panel" [class.expanded]="expanded">
      <!-- Header (always visible) -->
      <button class="panel-header" (click)="toggle.emit()">
        <div class="panel-header__icon-wrapper" [class.active]="expanded">
          <app-icon [name]="icon" [size]="18" />
        </div>
        <span class="panel-label" *ngIf="expanded">{{ label }}</span>
        <app-badge *ngIf="badge > 0 && !expanded" [variant]="badgeVariant" size="sm">
          {{ badge }}
        </app-badge>
        <span class="panel-count" *ngIf="badge > 0 && expanded">{{ badge }}</span>
        <div class="panel-chevron" *ngIf="expanded">
          <app-icon name="chevron-up" [size]="14" />
        </div>
      </button>
      
      <!-- Content (collapsible) -->
      <div class="panel-content" *ngIf="expanded" [@slideDown]>
        <ng-content />
      </div>
    </div>
  `,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, transform: 'translateY(-4px)' }),
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('180ms cubic-bezier(0.4, 0, 1, 1)', style({ height: 0, opacity: 0, transform: 'translateY(-4px)' }))
      ])
    ])
  ],
  styles: [`
    :host {
      display: block;
    }

    .tool-panel {
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
      min-width: 44px;
      max-width: 340px;
      transition: all var(--duration-normal) var(--ease-out);
      
      &.expanded {
        min-width: 290px;
        box-shadow: var(--chart-overlay-shadow), 
                    0 0 0 1px color-mix(in srgb, var(--gb-needle-secondary) 10%, transparent);
      }
    }
    
    .panel-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2);
      background: transparent;
      border: none;
      color: var(--gb-text-value);
      cursor: pointer;
      transition: background var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 50%, transparent);
      }
      
      &:active {
        background: color-mix(in srgb, var(--bg-surface-secondary) 80%, transparent);
      }

      .expanded & {
        padding: var(--space-2) var(--space-3);
        border-bottom: 1px solid color-mix(in srgb, var(--border-default) 40%, transparent);
      }
    }

    .panel-header__icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-md);
      transition: all var(--duration-fast) var(--ease-out);
      flex-shrink: 0;

      &.active {
        background: color-mix(in srgb, var(--gb-needle-secondary) 12%, transparent);
        color: var(--gb-needle-secondary);
      }
    }
    
    .panel-label {
      flex: 1;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--gb-text-value);
    }

    .panel-count {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      padding: 2px 6px;
      background: color-mix(in srgb, var(--bg-surface-secondary) 60%, transparent);
      border-radius: var(--radius-full);
      min-width: 20px;
      text-align: center;
    }
    
    .panel-chevron {
      color: var(--text-muted);
      display: flex;
      align-items: center;
      transition: transform var(--duration-fast);
    }
    
    .panel-content {
      max-height: 50vh;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--border-strong) 40%, transparent) transparent;
      
      &::-webkit-scrollbar {
        width: 3px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--border-strong) 40%, transparent);
        border-radius: 2px;
      }
    }
  `]
})
export class ToolPanelComponent {
  @Input({ required: true }) icon!: IconName;
  @Input({ required: true }) label!: string;
  @Input() badge = 0;
  @Input() badgeVariant: BadgeVariant = 'neutral';
  @Input() expanded = false;
  
  @Output() toggle = new EventEmitter<void>();
}
