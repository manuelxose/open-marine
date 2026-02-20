import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartSettingsService } from '../../../chart/services/chart-settings.service';

@Component({
  selector: 'app-chart-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="chartSettingsService.settings$ | async as s">
      <h2>Chart</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Auto-center</span>
          <span class="setting-description">Center chart on vessel position when moving.</span>
        </div>
        <button (click)="chartSettingsService.toggleAutoCenter()" class="toggle-btn" [class.active]="s.autoCenter">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Track History</span>
          <span class="setting-description">Show the vessel track line on the chart.</span>
        </div>
        <button (click)="chartSettingsService.toggleTrack()" class="toggle-btn" [class.active]="s.showTrack">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Course Vector</span>
          <span class="setting-description">Display projected course-over-ground vector.</span>
        </div>
        <button (click)="chartSettingsService.toggleVector()" class="toggle-btn" [class.active]="s.showVector">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">True Wind Indicator</span>
          <span class="setting-description">Show true wind direction arrow on chart.</span>
        </div>
        <button (click)="chartSettingsService.toggleTrueWind()" class="toggle-btn" [class.active]="s.showTrueWind">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Range Rings</span>
          <span class="setting-description">Show concentric range rings around the vessel.</span>
        </div>
        <button (click)="chartSettingsService.toggleRangeRings()" class="toggle-btn" [class.active]="s.showRangeRings">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">OpenSeaMap Overlay</span>
          <span class="setting-description">Show seamark / navigational aid overlay tiles.</span>
        </div>
        <button (click)="chartSettingsService.toggleOpenSeaMap()" class="toggle-btn" [class.active]="s.showOpenSeaMap">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">AIS Targets</span>
          <span class="setting-description">Show other vessels from AIS data.</span>
        </div>
        <button (click)="chartSettingsService.toggleAisTargets()" class="toggle-btn" [class.active]="s.showAisTargets">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">AIS Labels</span>
          <span class="setting-description">Display vessel name labels on AIS targets.</span>
        </div>
        <button (click)="chartSettingsService.toggleAisLabels()" class="toggle-btn" [class.active]="s.showAisLabels">
          <span class="toggle-slider"></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Lines</span>
          <span class="setting-description">Draw closest point of approach lines to AIS targets.</span>
        </div>
        <button (click)="chartSettingsService.toggleCpaLines()" class="toggle-btn" [class.active]="s.showCpaLines">
          <span class="toggle-slider"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-section h2 {
      margin: 0 0 var(--space-4) 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-default);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .setting-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .setting-description {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .toggle-btn {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--bg-elevated, var(--bg-surface));
      border: 1px solid var(--border-default);
      border-radius: 12px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s, border-color 0.2s;
    }

    .toggle-btn.active {
      background: var(--accent, #88c0d0);
      border-color: var(--accent, #88c0d0);
    }

    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: var(--text-primary);
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .toggle-btn.active .toggle-slider {
      transform: translateX(20px);
    }
  `],
})
export class ChartSettingsComponent {
  readonly chartSettingsService = inject(ChartSettingsService);
}
