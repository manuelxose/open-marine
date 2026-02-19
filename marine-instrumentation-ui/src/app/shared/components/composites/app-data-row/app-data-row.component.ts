import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export type TrendDirection = 'up' | 'down' | 'flat';

@Component({
  selector: 'app-data-row',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="data-row">
      <div class="data-row-leading" *ngIf="icon">
         <app-icon [name]="icon"></app-icon>
      </div>

      <div class="data-row-label">
        {{ label }}
      </div>
      
      <div class="data-row-value-container">
        <span class="data-row-value">{{ value }}</span>
        <span class="data-row-unit" *ngIf="unit">{{ unit }}</span>
      </div>

      <div class="data-row-trend" *ngIf="trend">
        <app-icon 
            [name]="trend === 'up' ? 'arrow-up' : (trend === 'down' ? 'arrow-down' : 'minus')"
            [class.trend-up]="trend === 'up'"
            [class.trend-down]="trend === 'down'">
        </app-icon>
      </div>
    </div>
  `,
  styles: [`
    .data-row {
      display: flex;
      align-items: center;
      padding: var(--spacing-xs, 8px) 0;
      gap: var(--spacing-md, 16px);
      font-size: var(--text-base, 1rem);
      
      &-leading {
        color: var(--text-secondary);
        display: flex;
        align-items: center;
      }

      &-label {
        flex: 1;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &-value-container {
        display: flex;
        align-items: baseline;
        gap: 4px;
        font-weight: 500;
        color: var(--text-primary);
        font-family: var(--font-mono, monospace);
      }

      &-unit {
        font-size: 0.8em;
        color: var(--text-tertiary);
      }

      &-trend {
        display: flex;
        align-items: center;
        
        .trend-up { color: var(--success, #4ade80); }
        .trend-down { color: var(--danger, #f87171); }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppDataRowComponent {
  @Input() label!: string;
  @Input() value!: string | number;
  @Input() unit?: string;
  @Input() trend?: TrendDirection;
  @Input() icon?: IconName;
}
