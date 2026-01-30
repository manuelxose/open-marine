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
      (click)="navigateToAlarms()">
      
      <div class="icon-container" [class.pulse]="count > 0">
        <span class="icon">⚠️</span>
      </div>
      
      <div class="content" *ngIf="count > 0">
        <span class="count">{{ count }}</span>
        <span class="label">ACTIVE</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      pointer-events: auto;
    }

    .alarm-widget {
      background: rgba(30, 41, 59, 0.9);
      backdrop-filter: blur(4px);
      border: 1px solid var(--border-color, #334155);
      border-radius: 24px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);

      &.has-alarms {
        background: rgba(239, 68, 68, 0.9); /* Red background for alerts */
        border-color: #ef4444;
        color: white;
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .icon-container {
      font-size: 1.2rem;
      &.pulse {
        animation: pulse 2s infinite;
      }
    }

    .content {
      display: flex;
      flex-direction: column;
      line-height: 1;

      .count {
        font-weight: 900;
        font-size: 1.1rem;
      }

      .label {
        font-size: 0.6rem;
        font-weight: 700;
        opacity: 0.9;
      }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
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
