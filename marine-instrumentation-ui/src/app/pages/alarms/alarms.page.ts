import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmStoreService } from '../../state/alarms/alarm-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllAlarms } from '../../state/alarms/selectors';

@Component({
  selector: 'app-alarms-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alarms-page">
      <div class="page-header">
        <h1>Alarms</h1>
        <div class="header-actions">
           <button *ngIf="alarms().length > 0" (click)="acknowledgeAll()" class="btn-primary">
             Acknowledge All
           </button>
        </div>
      </div>

      <div *ngIf="alarms().length === 0" class="empty-state">
        <div class="success-icon">✔️</div>
        <h3>All Clear</h3>
        <p>No active alarms detected.</p>
      </div>

      <div *ngIf="alarms().length > 0" class="alarm-list">
        <div *ngFor="let alarm of alarms()" 
             class="alarm-item" 
             [class.acknowledged]="alarm.acknowledged"
             [class.emergency]="alarm.severity === 'emergency'"
             [class.critical]="alarm.severity === 'critical'"
             [class.warning]="alarm.severity === 'warning'">
          <div class="alarm-severity-bar"></div>
          <div class="alarm-info">
            <div class="alarm-top">
              <span class="alarm-title">{{ alarm.message }}</span>
              <span class="alarm-time">{{ alarm.timestamp | date:'HH:mm:ss' }}</span>
            </div>
            <div class="alarm-details">
              Severity: {{ alarm.severity | uppercase }}
            </div>
          </div>
          <button *ngIf="!alarm.acknowledged" (click)="acknowledge(alarm.id)" class="btn-ack">
            Acknowledge
          </button>
          <span *ngIf="alarm.acknowledged" class="ack-status">Acknowledged</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alarms-page { padding: 2rem; max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    
    .empty-state {
      text-align: center;
      padding: 4rem;
      background: var(--surface-1);
      border-radius: 12px;
      border: 1px dashed var(--border);
    }
    .success-icon { font-size: 3rem; margin-bottom: 1rem; color: #22c55e; }

    .alarm-list { display: flex; flex-direction: column; gap: 1rem; }
    
    .alarm-item {
      display: flex;
      align-items: center;
      background: var(--surface-2);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      transition: opacity 0.3s;
    }
    
    .alarm-item.acknowledged { opacity: 0.6; }

    .alarm-severity-bar { width: 6px; align-self: stretch; }
    .emergency .alarm-severity-bar { background: #ef4444; }
    .critical .alarm-severity-bar { background: #f87171; }
    .warning .alarm-severity-bar { background: #fbbf24; }

    .alarm-info { flex: 1; padding: 1rem; }
    .alarm-top { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
    .alarm-title { font-weight: 600; font-size: 1.1rem; }
    .alarm-time { font-size: 0.85rem; opacity: 0.7; }
    .alarm-details { font-size: 0.85rem; opacity: 0.8; }

    .btn-ack {
      margin-right: 1rem;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .ack-status { margin-right: 1rem; font-size: 0.85rem; font-weight: 600; color: #22c55e; }

    .btn-primary {
      padding: 0.6rem 1.2rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class AlarmsPage {
  private readonly alarmStore = inject(AlarmStoreService);
  
  alarms = toSignal(selectAllAlarms(this.alarmStore), { initialValue: [] });

  acknowledge(id: string) {
    this.alarmStore.acknowledge(id);
  }

  acknowledgeAll() {
    this.alarmStore.acknowledgeAll();
  }
}
