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

    .setting-select {
      width: 160px;
      height: 34px;
      padding: 0 28px 0 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      color: var(--gb-text-value);
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23687d97' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      transition: border-color 150ms ease;
    }

    .setting-select:focus,
    .setting-select:hover {
      border-color: var(--gb-border-active, rgba(82, 152, 220, 0.6));
    }
  `],
})
export class UnitsSettingsComponent {
  readonly prefs = inject(PreferencesService);
}
