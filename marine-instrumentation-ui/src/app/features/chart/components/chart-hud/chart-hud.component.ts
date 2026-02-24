import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { ChartHudVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-hud',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="hud" 
      [class.hud--fix]="vm.fixState === 'fix'"
      [class.hud--stale]="vm.fixState === 'stale'"
      [class.hud--nofix]="vm.fixState === 'no-fix'"
      [class.hud--compact]="compact"
    >
      <!-- Status Ribbon -->
      <div class="hud__ribbon">
        <div class="hud__status">
          <span class="status-dot">
            <span class="status-dot__ring" [class.pulse]="vm.fixState === 'stale'"></span>
          </span>
          <span class="status-label">{{ vm.statusLabelKey | translate }}</span>
        </div>
        <span class="status-age" *ngIf="vm.ageSeconds !== null">
          {{ vm.ageSeconds }}s ago
        </span>
      </div>

      <!-- Position Block -->
      <div class="hud__position">
        <div class="coord">
          <span class="coord__label">LAT</span>
          <span class="coord__value">{{ vm.latLabel }}</span>
        </div>
        <div class="coord-divider"></div>
        <div class="coord">
          <span class="coord__label">LON</span>
          <span class="coord__value">{{ vm.lonLabel }}</span>
        </div>
      </div>
      
      <!-- Expanded Data Grid -->
      <div class="hud__data" *ngIf="!compact">
        <div class="data-cell" *ngFor="let row of vm.rows">
          <span class="data-cell__label">{{ row.labelKey | translate }}</span>
          <div class="data-cell__reading">
            <span class="data-cell__value">{{ row.value }}</span>
            <span class="data-cell__unit">{{ row.unit }}</span>
          </div>
        </div>
      </div>
      
      <!-- Autopilot Quick Access -->
      <button 
        class="hud__ap-btn" 
        *ngIf="vm.canToggleAutopilot"
        (click)="toggleAutopilot.emit()"
        title="Autopilot Console"
      >
        <app-icon name="helm" [size]="16" />
        <span class="ap-label">AUTOPILOT</span>
        <app-icon name="chevron-right" [size]="14" />
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .hud {
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: 220px;
      max-width: 300px;
      
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--chart-overlay-shadow), 0 0 0 0 transparent;
      overflow: hidden;
      transition: box-shadow var(--duration-normal) var(--ease-out),
                  border-color var(--duration-normal) var(--ease-out);

      // Glow effect based on fix state
      &--fix {
        border-color: color-mix(in srgb, var(--fix-color) 40%, var(--chart-overlay-border));
        box-shadow: var(--chart-overlay-shadow), 0 0 20px -4px color-mix(in srgb, var(--fix-color) 20%, transparent);
      }
      
      &--stale {
        border-color: color-mix(in srgb, var(--stale-color) 40%, var(--chart-overlay-border));
        box-shadow: var(--chart-overlay-shadow), 0 0 20px -4px color-mix(in srgb, var(--stale-color) 20%, transparent);
      }
      
      &--nofix {
        border-color: color-mix(in srgb, var(--nofix-color) 40%, var(--chart-overlay-border));
        box-shadow: var(--chart-overlay-shadow), 0 0 20px -4px color-mix(in srgb, var(--nofix-color) 20%, transparent);
      }
      
      &--compact {
        min-width: 170px;
        max-width: 220px;
      }
    }

    // ── Status Ribbon ──
    .hud__ribbon {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-3);
      background: color-mix(in srgb, var(--bg-surface-secondary) 50%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--border-default) 40%, transparent);
    }

    .hud__status {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    
    .status-dot {
      position: relative;
      width: 10px;
      height: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      &::before {
        content: '';
        position: absolute;
        inset: 1px;
        border-radius: 50%;
        background: var(--text-muted);
        z-index: 1;
        
        .hud--fix & { background: var(--fix-color); }
        .hud--stale & { background: var(--stale-color); }
        .hud--nofix & { background: var(--nofix-color); }
      }

      &__ring {
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 1.5px solid transparent;
        
        .hud--fix & { border-color: color-mix(in srgb, var(--fix-color) 40%, transparent); }
        .hud--stale & { border-color: color-mix(in srgb, var(--stale-color) 40%, transparent); }
        .hud--nofix & { border-color: color-mix(in srgb, var(--nofix-color) 40%, transparent); }
        
        &.pulse {
          animation: ring-pulse 2s ease-in-out infinite;
        }
      }
    }

    .status-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--gb-text-muted);
    }
    
    .status-age {
      font-size: 0.6rem;
      font-family: var(--font-mono);
      color: var(--text-muted);
      opacity: 0.8;
    }

    // ── Position Block ──
    .hud__position {
      display: flex;
      align-items: stretch;
      padding: var(--space-3) var(--space-3);
      gap: 0;
    }

    .coord-divider {
      width: 1px;
      background: color-mix(in srgb, var(--border-default) 50%, transparent);
      margin: var(--space-1) var(--space-3);
    }
    
    .coord {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
      
      &__label {
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--text-muted);
      }
      
      &__value {
        font-family: var(--font-mono);
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--gb-text-value);
        letter-spacing: -0.02em;
        white-space: nowrap;
      }
    }

    // ── Data Grid ──
    .hud__data {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1px;
      background: color-mix(in srgb, var(--border-default) 30%, transparent);
      border-top: 1px solid color-mix(in srgb, var(--border-default) 40%, transparent);
    }
    
    .data-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-2) var(--space-3);
      background: var(--chart-overlay-bg);
      transition: background var(--duration-fast);
      
      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 60%, transparent);
      }
      
      &__label {
        font-size: 0.5rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
      }

      &__reading {
        display: flex;
        align-items: baseline;
        gap: var(--space-1);
      }
      
      &__value {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--gb-text-value);
        line-height: 1;
      }
      
      &__unit {
        font-size: 0.55rem;
        font-weight: 500;
        color: var(--text-muted);
      }
    }

    // ── Autopilot Button ──
    .hud__ap-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      
      background: color-mix(in srgb, var(--gb-needle-secondary) 8%, transparent);
      border: none;
      border-top: 1px solid color-mix(in srgb, var(--gb-needle-secondary) 20%, transparent);
      color: var(--gb-needle-secondary);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: color-mix(in srgb, var(--gb-needle-secondary) 16%, transparent);
      }
      
      &:active {
        transform: scale(0.98);
      }

      .ap-label {
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        flex: 1;
        text-align: left;
      }
    }

    // ── Animations ──
    @keyframes ring-pulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1); 
      }
      50% { 
        opacity: 0.3; 
        transform: scale(1.4); 
      }
    }

    // ── Compact Overrides ──
    .hud--compact {
      .hud__position {
        padding: var(--space-2) var(--space-3);
      }

      .coord__value {
        font-size: 0.75rem;
      }

      .hud__ribbon {
        padding: var(--space-1) var(--space-2);
      }
    }
  `]
})
export class ChartHudComponent {
  @Input({ required: true }) vm!: ChartHudVm;
  @Input() compact = false;
  
  @Output() toggleAutopilot = new EventEmitter<void>();
}