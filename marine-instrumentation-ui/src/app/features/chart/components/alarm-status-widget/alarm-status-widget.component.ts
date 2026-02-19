import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlarmsFacadeService } from '../../../alarms/services/alarms-facade.service';
import { map } from 'rxjs';
import { AlarmSeverity } from '../../../../state/alarms/alarm.models';

@Component({
  selector: 'app-alarm-status-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="alarm-widget" 
      *ngIf="activeCount$ | async as count" 
      [class.has-alarms]="count > 0"
      (click)="navigateToAlarms()"
      role="button"
      tabindex="0"
      (keydown.enter)="navigateToAlarms()"
    >
      <div class="alarm-widget__indicator" [class.pulse]="count > 0">
        <span class="alarm-widget__icon">⚠</span>
      </div>
      
      <div class="alarm-widget__content" *ngIf="count > 0">
        <span class="alarm-widget__count">{{ count }}</span>
        <span class="alarm-widget__label">ACTIVE</span>
      </div>
      
      <div class="alarm-widget__arrow" *ngIf="count > 0">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 1L7 5L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      pointer-events: auto;
    }

    .alarm-widget {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-full);
      box-shadow: var(--chart-overlay-shadow);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 80%, transparent);
        transform: translateY(-1px);
        box-shadow: var(--chart-overlay-shadow), 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      
      &:active {
        transform: translateY(0) scale(0.97);
      }

      &.has-alarms {
        background: color-mix(in srgb, var(--danger) 12%, var(--chart-overlay-bg));
        border-color: color-mix(in srgb, var(--danger) 40%, var(--chart-overlay-border));
        box-shadow: var(--chart-overlay-shadow), 0 0 24px -4px color-mix(in srgb, var(--danger) 25%, transparent);

        &:hover {
          background: color-mix(in srgb, var(--danger) 20%, var(--chart-overlay-bg));
          box-shadow: var(--chart-overlay-shadow), 0 0 28px -2px color-mix(in srgb, var(--danger) 35%, transparent);
        }
      }
    }

    .alarm-widget__indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--danger) 15%, transparent);
      flex-shrink: 0;

      &.pulse {
        animation: alarm-pulse 2s ease-in-out infinite;
      }
    }

    .alarm-widget__icon {
      font-size: 0.9rem;
      line-height: 1;
      filter: none;
    }

    .alarm-widget__content {
      display: flex;
      flex-direction: column;
      line-height: 1;
      gap: 1px;
    }

    .alarm-widget__count {
      font-family: var(--font-mono);
      font-weight: 800;
      font-size: 1rem;
      color: var(--danger);
      letter-spacing: -0.02em;
    }

    .alarm-widget__label {
      font-size: 0.5rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .alarm-widget__arrow {
      color: var(--text-muted);
      display: flex;
      align-items: center;
      margin-left: var(--space-1);
      transition: transform var(--duration-fast);

      .alarm-widget:hover & {
        transform: translateX(2px);
      }
    }

    @keyframes alarm-pulse {
      0%, 100% { 
        transform: scale(1);
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--danger) 25%, transparent);
      }
      50% { 
        transform: scale(1.08);
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--danger) 0%, transparent);
      }
    }
  `]
})
export class AlarmStatusWidgetComponent {
  private facade = inject(AlarmsFacadeService);
  private router = inject(Router);

  // Count alarms that are NOT Emergency (MOB is handled by overlay)
  activeCount$ = this.facade.activeAlarms$.pipe(
    map(alarms => alarms.filter(a => a.severity !== AlarmSeverity.Emergency).length)
  );

  navigateToAlarms(): void {
    this.router.navigate(['/alarms']);
  }
}
