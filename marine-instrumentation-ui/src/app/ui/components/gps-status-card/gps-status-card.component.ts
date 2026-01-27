import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GPSFix {
  hasFix: boolean;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
  accuracy?: number;
  satellites?: number;
}

@Component({
  selector: 'app-gps-status-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gps-status" [class.has-fix]="fix.hasFix" [class.no-fix]="!fix.hasFix">
      <div class="status-indicator">
        <div class="dot"></div>
        <span class="status-text">{{ fix.hasFix ? 'GPS FIX' : 'NO FIX' }}</span>
      </div>
      
      <div class="position" *ngIf="fix.hasFix && fix.latitude !== undefined && fix.longitude !== undefined">
        <div class="coord">
          <span class="label">LAT</span>
          <span class="value">{{ formatCoord(fix.latitude, 'lat') }}</span>
        </div>
        <div class="coord">
          <span class="label">LON</span>
          <span class="value">{{ formatCoord(fix.longitude, 'lon') }}</span>
        </div>
      </div>

      <div class="metadata">
        <div class="meta-item" *ngIf="fix.timestamp">
          <span class="meta-label">Updated</span>
          <span class="meta-value">{{ getAge(fix.timestamp) }}</span>
        </div>
        <div class="meta-item" *ngIf="fix.satellites !== undefined">
          <span class="meta-label">Sats</span>
          <span class="meta-value">{{ fix.satellites }}</span>
        </div>
        <div class="meta-item" *ngIf="fix.accuracy !== undefined">
          <span class="meta-label">Acc</span>
          <span class="meta-value">{{ fix.accuracy.toFixed(1) }}m</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gps-status {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--danger);
    }

    .has-fix .dot {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .status-text {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--danger);
    }

    .has-fix .status-text {
      color: var(--success);
    }

    .position {
      display: flex;
      gap: 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .coord {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .label {
      font-size: 0.65rem;
      color: var(--muted);
      font-weight: 600;
    }

    .value {
      font-size: 0.875rem;
      font-family: 'Courier New', monospace;
      font-variant-numeric: tabular-nums;
      color: var(--fg);
    }

    .metadata {
      display: flex;
      gap: 1rem;
      font-size: 0.7rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .meta-label {
      color: var(--muted);
      font-weight: 600;
    }

    .meta-value {
      color: var(--fg);
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class GPSStatusCardComponent {
  @Input() fix: GPSFix = { hasFix: false };

  formatCoord(value: number, type: 'lat' | 'lon'): string {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const dir = type === 'lat' 
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    return `${deg.toString().padStart(type === 'lon' ? 3 : 2, '0')}° ${min.toFixed(3)}' ${dir}`;
  }

  getAge(timestamp: number): string {
    const age = (Date.now() - timestamp) / 1000;
    if (age < 10) return `${age.toFixed(0)}s`;
    if (age < 60) return `${age.toFixed(0)}s`;
    return `${(age / 60).toFixed(0)}m`;
  }
}
