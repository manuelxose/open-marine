import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AisTarget, AisNavStatus, type AisTrackPoint } from '../../../../core/models/ais.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { DistancePipe } from '../../../../shared/pipes/distance.pipe';
import { LatFormatPipe } from '../../../../shared/pipes/lat-format.pipe';
import { LonFormatPipe } from '../../../../shared/pipes/lon-format.pipe';
import { METERS_PER_NM, metersPerSecondToKnots, normalizeDegrees, toDegrees } from '../../../../state/calculations/navigation';
import { AisStoreService } from '../../../../state/ais/ais-store.service';

@Component({
  selector: 'app-ais-target-details',
  standalone: true,
  imports: [
    CommonModule, 
    AppButtonComponent, 
    AppIconComponent,
    DecimalPipe,
    TimeAgoPipe,
    DistancePipe,
    LatFormatPipe,
    LonFormatPipe
  ],
  template: `
    <div class="ais-details-panel">
      <header class="details-header" [class.dangerous]="target.isDangerous">
        <div class="header-main">
          <h2>{{ target.name || target.callsign || ('Vessel ' + target.mmsi) }}</h2>
          <span class="mmsi">MMSI: {{ target.mmsi }}</span>
        </div>
        <app-button 
            variant="ghost" 
            size="sm" 
            (action)="close.emit()"
            aria-label="Close details"
            icon="x"
        >
        </app-button>
      </header>
      
      <div class="scroll-content">
        <!-- Safety Alerts -->
        <div class="alert-box" *ngIf="target.isDangerous">
            <app-icon name="alert-triangle" [size]="24" class="alert-icon"></app-icon>
            <div class="alert-info">
                <strong>COLLISION WARNING</strong>
                <span>CPA {{ target.cpa | distance }} in {{ (target.tcpa || 0) | number:'1.0-0' }} min</span>
            </div>
        </div>

        <!-- Voyage Info -->
        <section class="details-section">
            <h3>Voyage</h3>
            <div class="grid-2">
                <div class="field">
                    <label>Status</label>
                    <span class="value">{{ getStatusLabel() }}</span>
                </div>
                <div class="field">
                    <label>Destination</label>
                    <span class="value">{{ target.destination || '--' }}</span>
                </div>
            </div>
        </section>

        <section class="details-section">
            <h3>Track & Prediction</h3>
            <div class="grid-2">
                <div class="field">
                    <label>Track Points</label>
                    <span class="value">{{ trackPointsCount }}</span>
                </div>
                <div class="field">
                    <label>Track Span</label>
                    <span class="value">{{ trackHistoryMinutes !== null ? ((trackHistoryMinutes | number:'1.0-0') + ' min') : '--' }}</span>
                </div>
                <div class="field">
                    <label>Prediction</label>
                    <span class="value">{{ hasPrediction ? '6 min' : '--' }}</span>
                </div>
                <div class="field">
                    <label>Predicted Run</label>
                    <span class="value">{{ predictionDistanceNm !== null ? ((predictionDistanceNm | number:'1.2-2') + ' NM') : '--' }}</span>
                </div>
                <div class="field full-width">
                    <label>Predicted COG</label>
                    <span class="value">{{ predictionBearingDeg !== null ? ((predictionBearingDeg | number:'1.0-0') + ' deg') : '--' }}</span>
                </div>
            </div>
            <p class="hint">Projection shown on chart as dashed amber line when target is moving.</p>
        </section>

        <!-- Navigation Data -->
        <section class="details-section">
            <h3>Navigation</h3>
            <div class="grid-2">
                <div class="field">
                    <label>SOG</label>
                    <span class="value">{{ formatSog(target.sog) }}</span>
                </div>
                <div class="field">
                    <label>COG</label>
                    <span class="value">{{ (target.cog || 0) * 57.2958 | number:'1.0-0' }}°</span>
                </div>
                <div class="field">
                    <label>Heading</label>
                    <span class="value">{{ target.heading !== undefined ? ((target.heading * 57.2958 | number:'1.0-0') + '°') : '--' }}</span>
                </div>
                 <div class="field">
                    <label>ROT</label>
                    <span class="value">{{ target.rot !== undefined ? (target.rot | number:'1.1-1') : '--' }}</span>
                </div>
            </div>
            <div class="field full-width">
                <label>Position</label>
                <span class="value monospace">
                    {{ target.latitude | latFormat }} {{ target.longitude | lonFormat }}
                </span>
            </div>
        </section>

        <!-- Vessel Info -->
        <section class="details-section">
            <h3>Vessel Details</h3>
            <div class="grid-2">
                 <div class="field">
                    <label>Callsign</label>
                    <span class="value">{{ target.callsign || '--' }}</span>
                </div>
                 <div class="field">
                    <label>IMO</label>
                    <span class="value">{{ target.imo || '--' }}</span>
                </div>
                 <div class="field">
                    <label>Type</label>
                    <span class="value">{{ target.vesselType || 'Unknown' }}</span>
                </div>
                <div class="field">
                    <label>Dimensions</label>
                    <span class="value">
                        {{ target.length ? target.length + 'm' : '--' }} x 
                        {{ target.beam ? target.beam + 'm' : '--' }}
                    </span>
                </div>
                <div class="field">
                    <label>Draft</label>
                    <span class="value">{{ target.draft ? target.draft + 'm' : '--' }}</span>
                </div>
            </div>
        </section>

        <div class="details-footer">
            <span class="last-seen">Last seen: {{ target.lastUpdated | timeAgo }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
    }

    .ais-details-panel {
      display: flex;
      flex-direction: column;
      max-height: min(80vh, 600px);
    }

    .details-header {
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border-bottom: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 35%, transparent);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: color-mix(in srgb, var(--bg-surface-secondary, #1a1a2e) 55%, transparent);
      flex-shrink: 0;
    }
    
    .details-header.dangerous {
        background: rgba(220, 38, 38, 0.15);
        border-bottom-color: var(--danger, #ef4444);
    }

    .header-main {
      flex: 1;
      min-width: 0;
    }

    h2 {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--gb-text-value);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mmsi {
      font-size: 0.72rem;
      color: var(--text-muted, var(--gb-text-muted));
      font-family: var(--font-mono);
    }

    .scroll-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 1rem);
    }

    .alert-box {
        display: flex;
        gap: 1rem;
        padding: var(--space-3, 0.75rem);
        background: var(--danger, #ef4444);
        color: white;
        border-radius: 8px;
        align-items: center;
    }
    
    .alert-icon {
        flex-shrink: 0;
    }
    
    .alert-info {
        display: flex;
        flex-direction: column;
        font-size: 0.78rem;
    }

    .details-section h3 {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      color: var(--text-muted, var(--gb-text-muted));
      margin: 0 0 var(--space-2, 0.5rem) 0;
      border-bottom: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 30%, transparent);
      padding-bottom: 0.25rem;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3, 0.75rem);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .field.full-width {
        grid-column: span 2;
        margin-top: var(--space-1, 0.25rem);
    }

    label {
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, var(--gb-text-muted));
    }

    .value {
      font-size: 0.82rem;
      color: var(--gb-text-value);
      font-weight: 600;
    }
    
    .monospace {
        font-family: var(--font-mono);
        letter-spacing: -0.5px;
    }

    .details-footer {
        margin-top: auto;
        padding-top: var(--space-3, 0.75rem);
        border-top: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 30%, transparent);
        text-align: center;
        flex-shrink: 0;
    }
    
    .last-seen {
        font-size: 0.68rem;
        color: var(--text-muted, var(--gb-text-muted));
    }

    .hint {
      margin: 0.4rem 0 0;
      font-size: 0.68rem;
      color: var(--text-muted, var(--gb-text-muted));
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AisTargetDetailsComponent {
  private readonly aisStore = inject(AisStoreService);
  @Input({ required: true }) target!: AisTarget;
  @Output() close = new EventEmitter<void>();

  getStatusLabel(): string {
    if (this.target.state === undefined) return 'Unknown';
    return AisNavStatus[this.target.state] ?? 'Unknown';
  }

  formatSog(sogMps: number | undefined): string {
    if (typeof sogMps !== 'number' || !Number.isFinite(sogMps)) {
      return '--';
    }

    return `${metersPerSecondToKnots(sogMps).toFixed(1)} kn`;
  }

  get trackPointsCount(): number {
    return this.getTrackPoints().length;
  }

  get trackHistoryMinutes(): number | null {
    const points = this.getTrackPoints();
    if (points.length < 2) {
      return null;
    }

    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) {
      return null;
    }
    const spanMs = last.timestamp - first.timestamp;
    return spanMs > 0 ? spanMs / 60000 : null;
  }

  get hasPrediction(): boolean {
    return this.predictionDistanceNm !== null;
  }

  get predictionDistanceNm(): number | null {
    if (!this.canPredictTarget()) {
      return null;
    }
    const sog = this.target.sog as number;
    const distanceMeters = sog * 6 * 60;
    return distanceMeters / METERS_PER_NM;
  }

  get predictionBearingDeg(): number | null {
    if (!this.canPredictTarget()) {
      return null;
    }
    return normalizeDegrees(toDegrees(this.target.cog as number));
  }

  private getTrackPoints(): AisTrackPoint[] {
    if (!this.target?.mmsi) {
      return [];
    }
    return this.aisStore.getTrackPoints(this.target.mmsi);
  }

  private canPredictTarget(): boolean {
    if (!Number.isFinite(this.target?.latitude) || !Number.isFinite(this.target?.longitude)) {
      return false;
    }
    if (typeof this.target?.sog !== 'number' || !Number.isFinite(this.target.sog) || this.target.sog < 0.5) {
      return false;
    }
    return typeof this.target?.cog === 'number' && Number.isFinite(this.target.cog);
  }
}
