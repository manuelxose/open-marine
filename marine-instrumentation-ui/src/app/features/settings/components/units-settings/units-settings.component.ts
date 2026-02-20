import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreferencesService } from '../../../../services/preferences.service';

@Component({
  selector: 'app-units-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="prefs.preferences$ | async as p">
      <h2>Units</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Speed</span>
          <span class="setting-description">Unit for SOG, STW, AWS, TWS and all velocity values.</span>
        </div>
        <select
          class="setting-select"
          [ngModel]="p.speedUnit"
          (ngModelChange)="prefs.setSpeedUnit($event)"
        >
          <option value="kn">Knots (kn)</option>
          <option value="km/h">km/h</option>
          <option value="m/s">m/s</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Depth</span>
          <span class="setting-description">Unit for depth below transducer / keel.</span>
        </div>
        <select
          class="setting-select"
          [ngModel]="p.depthUnit"
          (ngModelChange)="prefs.setDepthUnit($event)"
        >
          <option value="m">Meters (m)</option>
          <option value="ft">Feet (ft)</option>
        </select>
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

    .setting-select {
      width: 160px;
      height: 36px;
      padding: 0 var(--space-2);
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--bg-base);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 6px);
      outline: none;
    }

    .setting-select:focus {
      border-color: var(--accent, #88c0d0);
    }
  `],
})
export class UnitsSettingsComponent {
  readonly prefs = inject(PreferencesService);
}
