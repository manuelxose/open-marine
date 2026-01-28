import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmStoreService } from '../../../state/alarms/alarm-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectActiveUnacknowledged } from '../../../state/alarms/selectors';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-alarm-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="activeAlarms().length > 0" 
         class="alarm-banner" 
         [class.emergency]="hasEmergency()"
         [class.critical]="hasCritical()"
         [class.warning]="hasWarning()">
      <div class="alarm-content">
        <span class="alarm-icon">⚠️</span>
        <span class="alarm-message">{{ latestAlarm().message }}</span>
        <span *ngIf="activeAlarms().length > 1" class="alarm-count">
          (+{{ activeAlarms().length - 1 }} more)
        </span>
      </div>
      <div class="alarm-actions">
        <button class="btn-acknowledge" (click)="acknowledgeLatest()">Acknowledge</button>
        <a routerLink="/alarms" class="btn-details">Details</a>
      </div>
    </div>
  `,
  styles: [`
    .alarm-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.5rem;
      background: var(--surface-2);
      border-bottom: 2px solid transparent;
      animation: slideDown 0.3s ease-out;
      z-index: 1000;
    }

    .emergency { background: #7f1d1d; color: white; border-color: #ef4444; animation: pulse 2s infinite; }
    .critical { background: #991b1b; color: white; border-color: #f87171; }
    .warning { background: #92400e; color: white; border-color: #fbbf24; }

    .alarm-content { display: flex; align-items: center; gap: 0.75rem; font-weight: 600; }
    .alarm-icon { font-size: 1.25rem; }
    .alarm-count { font-size: 0.85rem; opacity: 0.8; }

    .alarm-actions { display: flex; gap: 0.75rem; }
    
    button, .btn-details {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.4rem 0.8rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      text-decoration: none;
      transition: background 0.2s;
    }

    button:hover, .btn-details:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.8; }
      100% { opacity: 1; }
    }
  `]
})
export class AlarmBannerComponent {
  private readonly alarmStore = inject(AlarmStoreService);
  
  activeAlarms = toSignal(selectActiveUnacknowledged(this.alarmStore), { initialValue: [] });

  latestAlarm = () => this.activeAlarms()[0];
  
  hasEmergency = () => this.activeAlarms().some(a => a.severity === 'emergency');
  hasCritical = () => this.activeAlarms().some(a => a.severity === 'critical');
  hasWarning = () => this.activeAlarms().some(a => a.severity === 'warning');

  acknowledgeLatest() {
    const alarm = this.latestAlarm();
    if (alarm) {
      this.alarmStore.acknowledge(alarm.id);
    }
  }
}
