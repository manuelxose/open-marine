import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { formatAngleDegrees, formatDistance } from '../../../../core/formatting/formatters';

@Component({
  selector: 'app-leg-info',
  standalone: true,
  imports: [CommonModule, AppTextComponent, AppIconComponent],
  template: `
    <div class="leg-info-container">
      <!-- Route Nodes -->
      <div class="nodes-row">
        <div class="node from">
          <app-text variant="caption" class="label text-muted">FROM</app-text>
          <app-text variant="body" class="value">{{ _fromName() }}</app-text>
        </div>
        
        <div class="direction-indicator">
          <app-icon name="arrow-right" size="md" class="text-accent"></app-icon>
        </div>
        
        <div class="node to">
          <app-text variant="caption" class="label text-right text-muted">TO</app-text>
          <app-text variant="body" class="value text-right">{{ _toName() }}</app-text>
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="metrics-row">
        <div class="metric">
          <app-text variant="caption" class="metric-label text-muted">BEARING</app-text>
          <app-text variant="value" class="metric-value">{{ formattedBearing() }}</app-text>
        </div>
        
        <div class="metric text-right">
          <app-text variant="caption" class="metric-label text-muted">TOTAL DISTANCE</app-text>
          <app-text variant="value" class="metric-value">{{ formattedTotalDist() }}</app-text>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
        </div>
        <div class="progress-labels">
          <app-text variant="caption" size="xs" class="progress-text text-muted">{{ formattedTraveled() }} traveled</app-text>
          <app-text variant="caption" size="xs" class="progress-text text-muted">{{ formattedGo() }} to go</app-text>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./leg-info.component.scss']
})
export class LegInfoComponent {
  // Inputs as signals or setters updating signals
  protected _fromName = signal('Start');
  protected _toName = signal('End');
  protected _bearingTrue = signal(0);
  protected _distanceTotal = signal(0);
  protected _distanceGo = signal(0);

  @Input() set fromName(val: string) { this._fromName.set(val); }
  @Input() set toName(val: string) { this._toName.set(val); }
  @Input() set bearingTrue(val: number) { this._bearingTrue.set(val); }
  @Input() set distanceTotal(val: number) { this._distanceTotal.set(val); }
  @Input() set distanceGo(val: number) { this._distanceGo.set(val); }

  // Computed display values
  // formatAngleDegrees returns {value, unit}, we join them
  formattedBearing = computed(() => {
    const res = formatAngleDegrees(this._bearingTrue());
    return `${res.value}${res.unit}`;
  });
  
  formattedTotalDist = computed(() => {
    const res = formatDistance(this._distanceTotal());
    return `${res.value} ${res.unit}`;
  });
  
  formattedGo = computed(() => {
    const res = formatDistance(this._distanceGo());
    return `${res.value} ${res.unit}`;
  });
  
  formattedTraveled = computed(() => {
    const traveled = Math.max(0, this._distanceTotal() - this._distanceGo());
    const res = formatDistance(traveled);
    return `${res.value} ${res.unit}`;
  });

  progressPercentage = computed(() => {
    if (this._distanceTotal() <= 0) return 0;
    const traveled = this._distanceTotal() - this._distanceGo();
    const pct = (traveled / this._distanceTotal()) * 100;
    return Math.max(0, Math.min(100, pct));
  });
}
