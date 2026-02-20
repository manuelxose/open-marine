import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlarmSettingsService } from '../../../../state/alarms/alarm-settings.service';

@Component({
  selector: 'app-alarm-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="alarmSettings.settings$ | async as s">
      <h2>Alarms &amp; Safety</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Shallow Depth Threshold</span>
          <span class="setting-description">Alarm when depth below transducer is less than this value (meters).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.shallowDepthThreshold"
          (ngModelChange)="alarmSettings.update({ shallowDepthThreshold: +$event })"
          min="0"
          step="0.5"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Shallow Depth Hysteresis</span>
          <span class="setting-description">Deadband to prevent alarm flapping (meters).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.shallowDepthHysteresis"
          (ngModelChange)="alarmSettings.update({ shallowDepthHysteresis: +$event })"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Warning Threshold</span>
          <span class="setting-description">Closest point of approach distance for AIS collision warning (NM).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.cpaThresholdNm"
          (ngModelChange)="alarmSettings.update({ cpaThresholdNm: +$event })"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">TCPA Warning Threshold</span>
          <span class="setting-description">Time to CPA limit for collision warning (minutes).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.cpaTcpaMinutes"
          (ngModelChange)="alarmSettings.update({ cpaTcpaMinutes: +$event })"
          min="0"
          step="1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Low Battery Threshold</span>
          <span class="setting-description">Voltage below which a battery warning triggers (V).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.lowBatteryThreshold"
          (ngModelChange)="alarmSettings.update({ lowBatteryThreshold: +$event })"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Lost Timeout</span>
          <span class="setting-description">Seconds without GPS fix before triggering alarm.</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.gpsLostSeconds"
          (ngModelChange)="alarmSettings.update({ gpsLostSeconds: +$event })"
          min="5"
          step="5"
        />
      </div>
    </div>
  `,
  styles: [`
    .settings-section h2 {
      margin: 0 0 var(--space-4) 0;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--gb-text-value);
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .setting-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gb-text-value);
    }

    .setting-description {
      font-size: 0.75rem;
      color: var(--gb-text-muted);
    }

    .setting-input {
      width: 120px;
      height: 34px;
      padding: 0 var(--space-2);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--gb-text-value);
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      outline: none;
      text-align: right;
      transition: border-color 150ms ease;
    }

    .setting-input:focus {
      border-color: var(--gb-border-active, rgba(82, 152, 220, 0.6));
    }
  `],
})
export class AlarmSettingsComponent {
  readonly alarmSettings = inject(AlarmSettingsService);
}
