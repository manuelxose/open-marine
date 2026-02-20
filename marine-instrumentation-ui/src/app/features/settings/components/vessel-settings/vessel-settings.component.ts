import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VesselProfileService, type VesselProfile } from '../../../../state/vessel/vessel-profile.service';

@Component({
  selector: 'app-vessel-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section" *ngIf="vesselProfile.profile$ | async as profile">
      <h2>Vessel</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Name</span>
          <span class="setting-description">Your vessel's name for display in the header.</span>
        </div>
        <input
          type="text"
          class="setting-input"
          [ngModel]="profile.name"
          (ngModelChange)="update({ name: $event })"
          placeholder="e.g. S/V Wanderer"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">MMSI</span>
          <span class="setting-description">Maritime Mobile Service Identity for AIS correlation.</span>
        </div>
        <input
          type="text"
          class="setting-input"
          [ngModel]="profile.mmsi"
          (ngModelChange)="update({ mmsi: $event })"
          placeholder="123456789"
          maxlength="9"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Call Sign</span>
          <span class="setting-description">Radio call sign associated with this vessel.</span>
        </div>
        <input
          type="text"
          class="setting-input"
          [ngModel]="profile.callsign"
          (ngModelChange)="update({ callsign: $event })"
          placeholder="e.g. EA1234"
        />
      </div>

      <div class="setting-row">
        <div class="setting-item setting-item--half">
          <div class="setting-info">
            <span class="setting-label">Length (m)</span>
          </div>
          <input
            type="number"
            class="setting-input"
            [ngModel]="profile.length"
            (ngModelChange)="update({ length: +$event })"
            min="0"
            step="0.1"
          />
        </div>
        <div class="setting-item setting-item--half">
          <div class="setting-info">
            <span class="setting-label">Beam (m)</span>
          </div>
          <input
            type="number"
            class="setting-input"
            [ngModel]="profile.beam"
            (ngModelChange)="update({ beam: +$event })"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Draft (m)</span>
          <span class="setting-description">Used for depth-under-keel calculations and shallow water alarms.</span>
        </div>
        <input
          type="number"
          class="setting-input"
          [ngModel]="profile.draft"
          (ngModelChange)="update({ draft: +$event })"
          min="0"
          step="0.1"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Vessel Type</span>
        </div>
        <select
          class="setting-select"
          [ngModel]="profile.vesselType"
          (ngModelChange)="update({ vesselType: $event })"
        >
          <option value="sailboat">Sailboat</option>
          <option value="motorboat">Motorboat</option>
          <option value="catamaran">Catamaran</option>
          <option value="trawler">Trawler</option>
          <option value="other">Other</option>
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

    .setting-item--half { flex: 1; }

    .setting-row {
      display: flex;
      gap: var(--space-4);
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

    .setting-input,
    .setting-select {
      width: 200px;
      height: 34px;
      padding: 0 var(--space-2);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--gb-text-value);
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      outline: none;
      transition: border-color 150ms ease;
    }

    .setting-select {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      padding: 0 28px 0 12px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23687d97' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
    }

    .setting-input:focus,
    .setting-select:focus {
      border-color: var(--gb-border-active, rgba(82, 152, 220, 0.6));
    }
  `],
})
export class VesselSettingsComponent {
  readonly vesselProfile = inject(VesselProfileService);

  update(partial: Partial<VesselProfile>): void {
    this.vesselProfile.update(partial);
  }
}
