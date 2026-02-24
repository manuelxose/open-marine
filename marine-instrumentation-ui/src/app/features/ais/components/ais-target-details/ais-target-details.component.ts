import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, shareReplay, switchMap } from 'rxjs/operators';
import { AisTarget, AisNavStatus, type AisTrackPoint } from '../../../../core/models/ais.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { DistancePipe } from '../../../../shared/pipes/distance.pipe';
import { LatFormatPipe } from '../../../../shared/pipes/lat-format.pipe';
import { LonFormatPipe } from '../../../../shared/pipes/lon-format.pipe';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { METERS_PER_NM, metersPerSecondToKnots, normalizeDegrees, toDegrees } from '../../../../state/calculations/navigation';
import { AisStoreService } from '../../../../state/ais/ais-store.service';
import { VesselEnrichmentService } from '../../../../data-access/vessel-enrichment/vessel-enrichment.service';
import {
  decodeVesselType,
  type EnrichmentResult,
  type EnrichmentStatus,
} from '../../../../data-access/vessel-enrichment/vessel-enrichment.models';

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
    LonFormatPipe,
    TranslatePipe,
  ],
  template: `
    <div class="ais-details-panel" *ngIf="enrichment$ | async as enrichment">
      <header class="details-header" [class.dangerous]="target.isDangerous">
        <div class="vessel-photo" *ngIf="enrichment.info?.photoUrl as photoUrl">
          <img
            [src]="photoUrl"
            [alt]="target.name || target.callsign || ('Vessel ' + target.mmsi)"
            class="vessel-photo-img"
            (error)="onPhotoError($event)" />
        </div>

        <div class="header-row">
          <div class="header-main">
            <h2>
              <span class="flag-emoji" *ngIf="enrichment.info?.flagEmoji as flag">{{ flag }}</span>
              {{ target.name || target.callsign || ('Vessel ' + target.mmsi) }}
            </h2>
            <span class="mmsi">MMSI: {{ target.mmsi }}</span>
            <span class="imo" *ngIf="enrichment.info?.imoNumber as imo">IMO: {{ imo }}</span>
          </div>
          <app-button
            variant="ghost"
            size="sm"
            (action)="close.emit()"
            aria-label="Close details"
            icon="x">
          </app-button>
        </div>
      </header>

      <div class="scroll-content">
        <div class="alert-box" *ngIf="target.isDangerous">
          <app-icon name="alert-triangle" [size]="24" class="alert-icon"></app-icon>
          <div class="alert-info">
            <strong>COLLISION WARNING</strong>
            <span>CPA {{ target.cpa | distance }} in {{ (target.tcpa || 0) | number:'1.0-0' }} min</span>
          </div>
        </div>

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
          <h3>Track &amp; Prediction</h3>
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

        <section class="details-section">
          <h3>Navigation</h3>
          <div class="grid-2">
            <div class="field">
              <label>SOG</label>
              <span class="value">{{ formatSog(target.sog) }}</span>
            </div>
            <div class="field">
              <label>COG</label>
              <span class="value">{{ (target.cog || 0) * 57.2958 | number:'1.0-0' }} deg</span>
            </div>
            <div class="field">
              <label>Heading</label>
              <span class="value">{{ target.heading !== undefined ? ((target.heading * 57.2958 | number:'1.0-0') + ' deg') : '--' }}</span>
            </div>
            <div class="field">
              <label>ROT</label>
              <span class="value">{{ target.rot !== undefined ? (target.rot | number:'1.1-1') : '--' }}</span>
            </div>
          </div>
          <div class="field full-width">
            <label>Position</label>
            <span class="value monospace">{{ target.latitude | latFormat }} {{ target.longitude | lonFormat }}</span>
          </div>
        </section>

        <section class="details-section">
          <h3>Vessel Details</h3>
          <div class="grid-2">
            <div class="field">
              <label>Callsign</label>
              <span class="value">{{ target.callsign || '--' }}</span>
            </div>
            <div class="field">
              <label>IMO</label>
              <span class="value">{{ enrichment.info?.imoNumber || target.imo || '--' }}</span>
            </div>
            <div class="field">
              <label>Type</label>
              <span class="value">{{ getVesselTypeDisplay(enrichment) }}</span>
            </div>
            <div class="field">
              <label>Dimensions</label>
              <span class="value">{{ getDimensionsDisplay(enrichment) }}</span>
            </div>
            <div class="field" *ngIf="enrichment.info?.yearBuilt as yearBuilt">
              <label>{{ 'ais.year_built' | translate }}</label>
              <span class="value">{{ yearBuilt }}</span>
            </div>
            <div class="field" *ngIf="!enrichment.info?.yearBuilt">
              <label>Draft</label>
              <span class="value">{{ target.draft ? target.draft + 'm' : '--' }}</span>
            </div>
          </div>
        </section>

        <section class="details-section details-section--enriched">
          <div class="section-header">
            <h3>{{ 'ais.extended_info' | translate }}</h3>
            <span
              class="enrichment-state"
              [class.loading]="enrichment.status === 'loading'"
              [class.unavailable]="enrichment.status === 'unavailable'">
              {{ getEnrichmentStateLabel(enrichment.status) }}
            </span>
          </div>

          <div class="enrichment-loading" *ngIf="enrichment.status === 'loading'">
            <div class="loading-spinner"></div>
            <span>{{ 'ais.loading_vessel' | translate }}</span>
          </div>

          <ng-container *ngIf="enrichment.status === 'loaded'">
            <div class="field full-width" *ngIf="enrichment.info?.lastPorts?.length">
              <label>{{ 'ais.recent_ports' | translate }}</label>
              <div class="port-list">
                <div class="port-item" *ngFor="let port of enrichment.info?.lastPorts">
                  <span class="port-name">{{ port.portName }}</span>
                  <span class="port-country" *ngIf="port.country">{{ port.country }}</span>
                  <span class="port-date" *ngIf="port.arrivedAt">{{ port.arrivedAt | date:'dd MMM' }}</span>
                </div>
              </div>
            </div>

            <div class="field full-width" *ngIf="enrichment.info?.grossTonnage as gt">
              <label>{{ 'ais.gross_tonnage' | translate }}</label>
              <span class="value">{{ gt | number:'1.0-0' }} GT</span>
            </div>
          </ng-container>
        </section>

        <div class="details-footer">
          <span class="last-seen">Last seen: {{ target.lastUpdated | timeAgo }}</span>
          <a
            *ngIf="enrichment.info?.externalUrl as extUrl"
            [href]="extUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link">
            {{ 'ais.view_external' | translate }} ↗
          </a>
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
      border-bottom: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 35%, transparent);
      background: color-mix(in srgb, var(--bg-surface-secondary, #1a1a2e) 55%, transparent);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    .details-header.dangerous {
      background: rgba(220, 38, 38, 0.15);
      border-bottom-color: var(--danger, #ef4444);
    }

    .header-row {
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-2, 0.5rem);
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
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .mmsi {
      font-size: 0.72rem;
      color: var(--text-muted, var(--gb-text-muted));
      font-family: var(--font-mono);
    }

    .imo {
      font-size: 0.72rem;
      color: var(--text-muted, var(--gb-text-muted));
      font-family: var(--font-mono);
      display: block;
      margin-top: 2px;
    }

    .vessel-photo {
      width: 100%;
      max-height: 160px;
      overflow: hidden;
      border-bottom: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 25%, transparent);
    }

    .vessel-photo-img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    .flag-emoji {
      font-size: 1.05rem;
      line-height: 1;
      flex-shrink: 0;
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

    .details-section--enriched {
      border-top: 1px dashed color-mix(in srgb, var(--border-default, #ffffff) 30%, transparent);
      padding-top: 0.4rem;
    }

    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .section-header h3 {
      border-bottom: none;
      margin-bottom: 0.2rem;
      padding-bottom: 0;
    }

    .enrichment-state {
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.15rem 0.35rem;
      border: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 40%, transparent);
      border-radius: 999px;
      color: var(--text-muted, var(--gb-text-muted));
      background: color-mix(in srgb, var(--bg-surface-secondary, #1a1a2e) 30%, transparent);
      font-family: var(--font-mono);
    }

    .enrichment-state.loading {
      color: var(--primary, #4a90d9);
      border-color: color-mix(in srgb, var(--primary, #4a90d9) 60%, transparent);
    }

    .enrichment-state.unavailable {
      color: var(--danger, #ef4444);
      border-color: color-mix(in srgb, var(--danger, #ef4444) 60%, transparent);
    }

    .enrichment-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted, var(--gb-text-muted));
      font-size: 0.8rem;
      padding: 0.5rem 0;
    }

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, var(--border-default, #ffffff) 45%, transparent);
      border-top-color: var(--primary, #4a90d9);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
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

    .port-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      margin-top: 0.35rem;
    }

    .port-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
    }

    .port-name {
      flex: 1;
      font-weight: 600;
      color: var(--gb-text-value);
    }

    .port-country {
      color: var(--text-muted, var(--gb-text-muted));
      font-size: 0.72rem;
    }

    .port-date {
      color: var(--text-secondary, var(--gb-text-muted));
      font-size: 0.72rem;
      font-family: var(--font-mono);
    }

    .details-footer {
      margin-top: auto;
      padding-top: var(--space-3, 0.75rem);
      border-top: 1px solid color-mix(in srgb, var(--border-default, #ffffff) 30%, transparent);
      text-align: center;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      align-items: center;
    }

    .last-seen {
      font-size: 0.68rem;
      color: var(--text-muted, var(--gb-text-muted));
    }

    .external-link {
      font-size: 0.75rem;
      color: var(--primary, #4a90d9);
      text-decoration: none;
    }

    .external-link:hover {
      text-decoration: underline;
    }

    .hint {
      margin: 0.4rem 0 0;
      font-size: 0.68rem;
      color: var(--text-muted, var(--gb-text-muted));
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AisTargetDetailsComponent {
  private readonly aisStore = inject(AisStoreService);
  private readonly enrichmentService = inject(VesselEnrichmentService);
  private readonly targetSubject = new BehaviorSubject<AisTarget | null>(null);

  private _target!: AisTarget;

  @Input({ required: true })
  set target(value: AisTarget) {
    this._target = value;
    this.targetSubject.next(value);
  }

  get target(): AisTarget {
    return this._target;
  }

  @Output() close = new EventEmitter<void>();

  readonly enrichment$ = this.targetSubject.asObservable().pipe(
    filter((target): target is AisTarget => target !== null),
    distinctUntilChanged((left, right) => left.mmsi === right.mmsi),
    switchMap((target) => this.enrichmentService.getEnrichedInfo(target.mmsi)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  getStatusLabel(): string {
    if (this.target.state === undefined) {
      return 'Unknown';
    }
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

  getVesselTypeDisplay(enrichment: EnrichmentResult | null): string {
    if (enrichment?.info?.vesselTypeDescription) {
      return enrichment.info.vesselTypeDescription;
    }

    if (this.target?.vesselType) {
      return decodeVesselType(this.target.vesselType);
    }

    return 'Unknown';
  }

  getDimensionsDisplay(enrichment: EnrichmentResult | null): string {
    const length = this.positiveNumber(enrichment?.info?.length) ?? this.positiveNumber(this.target?.length);
    const beam = this.positiveNumber(enrichment?.info?.beam) ?? this.positiveNumber(this.target?.beam);
    const lengthText = length !== null ? `${length}m` : '--';
    const beamText = beam !== null ? `${beam}m` : '--';
    return `${lengthText} x ${beamText}`;
  }

  getEnrichmentStateLabel(status: EnrichmentStatus): string {
    return status;
  }

  onPhotoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const container = img.parentElement as HTMLElement | null;
    if (container) {
      container.style.display = 'none';
      return;
    }
    img.style.display = 'none';
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

  private positiveNumber(value: number | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }
}
