import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AlarmsFacadeService } from './alarms-facade.service';

@Component({
  selector: 'app-alarms-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alarms-page">
      <div class="page-header">
        <h1>{{ 'alarms.page.title' | translate }}</h1>
        <p class="subtitle" [class.has-alarm]="vm()?.hasActiveAlarm">
          {{ (vm()?.hasActiveAlarm ? 'alarms.page.active' : 'alarms.page.no_active') | translate }}
        </p>
      </div>

      @if (vm()?.hasActiveAlarm) {
        <div class="alarm-card" [class]="vm()?.severityClass">
          <div class="alarm-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="alarm-content">
            <div class="alarm-severity">{{ vm()?.severity | uppercase }}</div>
            <div class="alarm-message">{{ vm()?.message }}</div>
            @if (vm()?.isAcknowledged) {
              <div class="alarm-ack-badge">Acknowledged</div>
            }
          </div>
          @if (!vm()?.isAcknowledged) {
            <button class="ack-button" (click)="onAcknowledge()">
              Acknowledge
            </button>
          }
        </div>
      } @else {
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3>All Clear</h3>
          <p>No active alarms or warnings at this time</p>
        </div>
      }

      <div class="alarm-info">
        <h2>Monitored Conditions</h2>
        <div class="condition-list">
          <div class="condition">
            <span class="condition-label">Shallow Depth</span>
            <span class="condition-threshold">&lt; 3.0 m</span>
          </div>
          <div class="condition">
            <span class="condition-label">Low Battery Voltage</span>
            <span class="condition-threshold">&lt; 11.6 V</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alarms-page {
      padding: 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      flex-shrink: 0;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--fg);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--success);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .subtitle.has-alarm {
      color: var(--danger);
    }

    .alarm-card {
      background: var(--card-bg);
      border: 2px solid var(--card-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .alarm-card.alarm-warning {
      border-color: var(--warn);
      background: rgba(245, 158, 11, 0.1);
    }

    .alarm-card.alarm-critical {
      border-color: var(--danger);
      background: rgba(239, 68, 68, 0.1);
    }

    .alarm-icon {
      flex-shrink: 0;
    }

    .alarm-warning .alarm-icon {
      color: var(--warn);
    }

    .alarm-critical .alarm-icon {
      color: var(--danger);
    }

    .alarm-content {
      flex: 1;
    }

    .alarm-severity {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .alarm-warning .alarm-severity {
      color: var(--warn);
    }

    .alarm-critical .alarm-severity {
      color: var(--danger);
    }

    .alarm-message {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--fg);
    }

    .alarm-ack-badge {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: var(--muted);
      color: white;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .ack-button {
      flex-shrink: 0;
      padding: 0.75rem 1.5rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .ack-button:hover {
      background: color-mix(in srgb, var(--accent), black 10%);
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .empty-state svg {
      color: var(--success);
      opacity: 0.7;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--fg);
      margin: 0;
    }

    .empty-state p {
      color: var(--muted);
      margin: 0;
    }

    .alarm-info {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 1rem 1.5rem;
    }

    .alarm-info h2 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 0.75rem;
    }

    .condition-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .condition {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .condition-label {
      color: var(--fg);
    }

    .condition-threshold {
      font-family: var(--font-mono);
      color: var(--muted);
      font-size: 0.875rem;
    }
  `],
})
export class AlarmsPage {
  private readonly facade = inject(AlarmsFacadeService);

  readonly vm = toSignal(this.facade.vm$);

  onAcknowledge(): void {
    this.facade.acknowledge();
  }
}
