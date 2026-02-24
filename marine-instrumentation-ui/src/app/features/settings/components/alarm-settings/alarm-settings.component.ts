import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ALARM_SETTINGS_PRESETS,
  AlarmSettings,
  AlarmSettingsPresetId,
  AlarmSettingsService,
} from '../../../../state/alarms/alarm-settings.service';
import { AppToggleComponent } from '../../../../shared/components/app-toggle/app-toggle.component';

@Component({
  selector: 'app-alarm-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="alarmSettings.settings$ | async as s">
      <h2>Alarms &amp; Safety</h2>

      <h3 class="setting-subtitle">Operational Presets</h3>
      <div class="preset-list">
        <button
          type="button"
          class="preset-card"
          *ngFor="let preset of presetOptions"
          (click)="applyPreset(preset.id)"
        >
          <span class="preset-card__title">{{ preset.label }}</span>
          <span class="preset-card__description">{{ preset.description }}</span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Shallow Water Alarm</span>
          <span class="setting-description">Show and trigger alarms when depth is below threshold.</span>
        </div>
        <app-toggle
          [ngModel]="s.showShallowWaterAlarm"
          (ngModelChange)="alarmSettings.update({ showShallowWaterAlarm: $event })"
        ></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Battery Low Alarm</span>
          <span class="setting-description">Show and trigger alarms when battery voltage is low.</span>
        </div>
        <app-toggle
          [ngModel]="s.showBatteryLowAlarm"
          (ngModelChange)="alarmSettings.update({ showBatteryLowAlarm: $event })"
        ></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Collision Alarm</span>
          <span class="setting-description">Show and trigger collision warnings based on CPA/TCPA.</span>
        </div>
        <app-toggle
          [ngModel]="s.showCpaWarningAlarm"
          (ngModelChange)="alarmSettings.update({ showCpaWarningAlarm: $event })"
        ></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Lost Alarm</span>
          <span class="setting-description">Show and trigger alarms when GPS data is stale.</span>
        </div>
        <app-toggle
          [ngModel]="s.showGpsLostAlarm"
          (ngModelChange)="alarmSettings.update({ showGpsLostAlarm: $event })"
        ></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Anchor Watch Alarm</span>
          <span class="setting-description">Show and trigger anchor drag alerts while anchor watch is active.</span>
        </div>
        <app-toggle
          [ngModel]="s.showAnchorWatchAlarm"
          (ngModelChange)="alarmSettings.update({ showAnchorWatchAlarm: $event })"
        ></app-toggle>
      </div>

      <h3 class="setting-subtitle">Navigation Safety Filters</h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Own-Ship Min Speed</span>
          <span class="setting-description">Minimum own-ship speed for CPA risk eligibility (m/s).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.cpaRiskOwnShipMinSpeedMps"
          (ngModelChange)="updateNumericSetting('cpaRiskOwnShipMinSpeedMps', $event, 0, 10, 2)"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Target Min Speed</span>
          <span class="setting-description">Minimum target speed for CPA risk eligibility (m/s).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.cpaRiskTargetMinSpeedMps"
          (ngModelChange)="updateNumericSetting('cpaRiskTargetMinSpeedMps', $event, 0, 10, 2)"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">XTE Min Speed</span>
          <span class="setting-description">Below this speed, route deviation is forced to 0 (kn).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.xteMinSpeedKnots"
          (ngModelChange)="updateNumericSetting('xteMinSpeedKnots', $event, 0, 20, 2)"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Jump Max Speed</span>
          <span class="setting-description">Reject position jumps with implied speed above this value (m/s).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.gpsOutlierMaxSpeedMps"
          (ngModelChange)="updateNumericSetting('gpsOutlierMaxSpeedMps', $event, 1, 100, 1)"
          min="1"
          step="0.5"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Jump Min Distance</span>
          <span class="setting-description">Only jumps above this distance are filtered by speed (m).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.gpsOutlierMinJumpDistanceMeters"
          (ngModelChange)="updateNumericSetting('gpsOutlierMinJumpDistanceMeters', $event, 1, 5000, 0)"
          min="1"
          step="1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Stationary SOG Limit</span>
          <span class="setting-description">Speed threshold considered stationary for GPS drift filtering (m/s).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.gpsOutlierStationarySogMps"
          (ngModelChange)="updateNumericSetting('gpsOutlierStationarySogMps', $event, 0, 5, 2)"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Stationary Max Drift</span>
          <span class="setting-description">Maximum accepted drift while stationary in the window below (m).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.gpsOutlierMaxDriftMeters"
          (ngModelChange)="updateNumericSetting('gpsOutlierMaxDriftMeters', $event, 1, 5000, 0)"
          min="1"
          step="1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">GPS Stationary Window</span>
          <span class="setting-description">Time window used for stationary drift filter (seconds).</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="s.gpsOutlierStationaryWindowSeconds"
          (ngModelChange)="updateNumericSetting('gpsOutlierStationaryWindowSeconds', $event, 1, 300, 0)"
          min="1"
          step="1"
        />
      </div>

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

    .setting-subtitle {
      margin: var(--space-4) 0 var(--space-2) 0;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--gb-text-muted);
    }

    .preset-list {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-bottom: var(--space-2);
    }

    .preset-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      border: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-panel);
      border-radius: 10px;
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
      text-align: left;
      transition: border-color 150ms ease, background 150ms ease;
    }

    .preset-card:hover {
      border-color: var(--gb-border-active, rgba(82, 152, 220, 0.6));
      background: var(--gb-bg-bezel);
    }

    .preset-card__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--gb-text-value);
    }

    .preset-card__description {
      font-size: 0.7rem;
      color: var(--gb-text-muted);
      line-height: 1.3;
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
  readonly presetOptions = ALARM_SETTINGS_PRESETS;

  applyPreset(presetId: AlarmSettingsPresetId): void {
    this.alarmSettings.applyPreset(presetId);
  }

  updateNumericSetting(
    key: keyof AlarmSettings,
    value: number,
    min: number,
    max: number,
    decimals: number
  ): void {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return;
    }

    const clamped = Math.min(max, Math.max(min, numeric));
    const rounded = decimals >= 0 ? Number(clamped.toFixed(decimals)) : clamped;
    this.alarmSettings.update({ [key]: rounded } as Partial<AlarmSettings>);
  }
}
