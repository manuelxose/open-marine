import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AisTarget, AisNavStatus } from '../../../../core/models/ais.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { DistancePipe } from '../../../../shared/pipes/distance.pipe';
import { LatFormatPipe } from '../../../../shared/pipes/lat-format.pipe';
import { LonFormatPipe } from '../../../../shared/pipes/lon-format.pipe';

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
          <h2>{{ target.name || 'Unknown Vessel' }}</h2>
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

        <!-- Navigation Data -->
        <section class="details-section">
            <h3>Navigation</h3>
            <div class="grid-2">
                <div class="field">
                    <label>SOG</label>
                    <span class="value">{{ target.sog | number:'1.1-1' }} kn</span>
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
                <!-- Draft could go here if available -->
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
      height: 100%;
      background: var(--surface-0);
      border-left: 1px solid var(--border-color);
    }

    .ais-details-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .details-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--surface-1);
    }
    
    .details-header.dangerous {
        background: rgba(220, 38, 38, 0.1); /* red-600/10 */
        border-bottom-color: var(--danger);
    }

    .header-main {
      flex: 1;
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .mmsi {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .scroll-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .alert-box {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: var(--danger);
        color: white;
        border-radius: 6px;
        align-items: center;
    }
    
    .alert-icon {
        flex-shrink: 0;
    }
    
    .alert-info {
        display: flex;
        flex-direction: column;
    }

    .details-section h3 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-tertiary);
      margin: 0 0 0.75rem 0;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.25rem;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .field.full-width {
        grid-column: span 2;
        margin-top: 0.5rem;
    }

    label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .value {
      font-size: 0.95rem;
      color: var(--text-primary);
      font-weight: 500;
    }
    
    .monospace {
        font-family: var(--font-mono);
        letter-spacing: -0.5px;
    }

    .details-footer {
        margin-top: auto;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
        text-align: center;
    }
    
    .last-seen {
        font-size: 0.75rem;
        color: var(--text-tertiary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AisTargetDetailsComponent {
  @Input({ required: true }) target!: AisTarget;
  @Output() close = new EventEmitter<void>();

  getStatusLabel(): string {
    if (this.target.state === undefined) return 'Unknown';
    return AisNavStatus[this.target.state] ?? 'Unknown';
  }
}
