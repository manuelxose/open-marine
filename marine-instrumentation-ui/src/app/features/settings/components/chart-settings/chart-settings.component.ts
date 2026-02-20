import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartSettingsService } from '../../../chart/services/chart-settings.service';
import { AppToggleComponent } from '../../../../shared/components/app-toggle/app-toggle.component';

@Component({
  selector: 'app-chart-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="chartSettingsService.settings$ | async as s">
      <h2>Chart</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Auto-center</span>
          <span class="setting-description">Center chart on vessel position when moving.</span>
        </div>
        <app-toggle [ngModel]="s.autoCenter" (ngModelChange)="chartSettingsService.toggleAutoCenter()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Track History</span>
          <span class="setting-description">Show the vessel track line on the chart.</span>
        </div>
        <app-toggle [ngModel]="s.showTrack" (ngModelChange)="chartSettingsService.toggleTrack()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Course Vector</span>
          <span class="setting-description">Display projected course-over-ground vector.</span>
        </div>
        <app-toggle [ngModel]="s.showVector" (ngModelChange)="chartSettingsService.toggleVector()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">True Wind Indicator</span>
          <span class="setting-description">Show true wind direction arrow on chart.</span>
        </div>
        <app-toggle [ngModel]="s.showTrueWind" (ngModelChange)="chartSettingsService.toggleTrueWind()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Range Rings</span>
          <span class="setting-description">Show concentric range rings around the vessel.</span>
        </div>
        <app-toggle [ngModel]="s.showRangeRings" (ngModelChange)="chartSettingsService.toggleRangeRings()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">OpenSeaMap Overlay</span>
          <span class="setting-description">Show seamark / navigational aid overlay tiles.</span>
        </div>
        <app-toggle [ngModel]="s.showOpenSeaMap" (ngModelChange)="chartSettingsService.toggleOpenSeaMap()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">AIS Targets</span>
          <span class="setting-description">Show other vessels from AIS data.</span>
        </div>
        <app-toggle [ngModel]="s.showAisTargets" (ngModelChange)="chartSettingsService.toggleAisTargets()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">AIS Labels</span>
          <span class="setting-description">Display vessel name labels on AIS targets.</span>
        </div>
        <app-toggle [ngModel]="s.showAisLabels" (ngModelChange)="chartSettingsService.toggleAisLabels()"></app-toggle>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">CPA Lines</span>
          <span class="setting-description">Draw closest point of approach lines to AIS targets.</span>
        </div>
        <app-toggle [ngModel]="s.showCpaLines" (ngModelChange)="chartSettingsService.toggleCpaLines()"></app-toggle>
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
  `],
})
export class ChartSettingsComponent {
  readonly chartSettingsService = inject(ChartSettingsService);
}
