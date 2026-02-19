import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppButtonComponent } from '../../app-button/app-button.component';

export type AISTargetDetailsStatus = 'safe' | 'warning' | 'danger';

export interface AISTargetDetailsTarget {
  name?: string;
  mmsi: string;
  callsign?: string;
  vesselType?: string;
  status?: AISTargetDetailsStatus;
  distance?: number; // nm
  bearing?: number; // degrees
  sog?: number; // knots
  cog?: number; // degrees
  cpa?: number; // nm
  tcpa?: number; // seconds
  lastReport?: string;
}

@Component({
  selector: 'app-ais-target-details',
  standalone: true,
  imports: [
    CommonModule,
    AppBoxComponent,
    AppStackComponent,
    AppTextComponent,
    AppIconComponent,
    AppButtonComponent
  ],
  template: `
    <app-box class="ais-target-details" padding="4">
      <app-stack spacing="md">
        <div class="header">
          <div class="title">
            <div class="status-icon" [ngClass]="statusClass()">
              <app-icon name="ais" size="md"></app-icon>
            </div>
            <div class="title-text">
              <app-text variant="body" weight="bold" class="truncate">{{ target?.name || 'Unknown vessel' }}</app-text>
              <app-text variant="caption" class="text-muted">
                MMSI {{ target?.mmsi || '---' }}
                <span *ngIf="target?.callsign"> \u00b7 {{ target?.callsign }}</span>
              </app-text>
            </div>
          </div>
          <div class="status-pill" [ngClass]="statusClass()">
            <app-text variant="overline">{{ statusLabel() }}</app-text>
          </div>
        </div>

        <div class="meta-row">
          <div class="meta-item">
            <app-text variant="caption" class="text-muted">TYPE</app-text>
            <app-text variant="body" weight="medium">{{ target?.vesselType || 'Unknown' }}</app-text>
          </div>
          <div class="meta-item">
            <app-text variant="caption" class="text-muted">LAST REPORT</app-text>
            <app-text variant="body" weight="medium">{{ target?.lastReport || '--' }}</app-text>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric">
            <app-text variant="caption" class="text-muted">DISTANCE</app-text>
            <app-text variant="value" size="lg">{{ formatDistance(target?.distance) }}</app-text>
          </div>
          <div class="metric">
            <app-text variant="caption" class="text-muted">BEARING</app-text>
            <app-text variant="value" size="lg">{{ formatBearing(target?.bearing) }}</app-text>
          </div>
          <div class="metric">
            <app-text variant="caption" class="text-muted">SOG</app-text>
            <app-text variant="value" size="lg">{{ formatSpeed(target?.sog) }}</app-text>
          </div>
          <div class="metric">
            <app-text variant="caption" class="text-muted">COG</app-text>
            <app-text variant="value" size="lg">{{ formatBearing(target?.cog) }}</app-text>
          </div>
          <div class="metric">
            <app-text variant="caption" class="text-muted">CPA</app-text>
            <app-text variant="value" size="lg">{{ formatDistance(target?.cpa) }}</app-text>
          </div>
          <div class="metric">
            <app-text variant="caption" class="text-muted">TCPA</app-text>
            <app-text variant="value" size="lg">{{ formatTcpa(target?.tcpa) }}</app-text>
          </div>
        </div>

        <div class="divider"></div>

        <div class="actions">
          <app-button variant="secondary" iconLeft="target" (click)="handleTrack()">Track</app-button>
          <app-button variant="primary" iconLeft="navigation" (click)="handleNavigate()">Navigate</app-button>
        </div>
      </app-stack>
    </app-box>
  `,
  styleUrls: ['./ais-target-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AISTargetDetailsComponent {
  @Input() target?: AISTargetDetailsTarget;

  @Output() onTrack = new EventEmitter<AISTargetDetailsTarget | undefined>();
  @Output() onNavigateTo = new EventEmitter<AISTargetDetailsTarget | undefined>();

  statusLabel(): string {
    switch (this.target?.status) {
      case 'danger':
        return 'Danger';
      case 'warning':
        return 'Warning';
      default:
        return 'Safe';
    }
  }

  statusClass(): string {
    return `status-${this.target?.status || 'safe'}`;
  }

  formatDistance(distance?: number): string {
    if (distance === undefined || distance === null) return '-- nm';
    return `${distance.toFixed(1)} nm`;
  }

  formatBearing(bearing?: number): string {
    if (bearing === undefined || bearing === null) return '---\u00b0';
    const value = Math.round(bearing).toString().padStart(3, '0');
    return `${value}\u00b0`;
  }

  formatSpeed(speed?: number): string {
    if (speed === undefined || speed === null) return '-- kn';
    return `${speed.toFixed(1)} kn`;
  }

  formatTcpa(tcpa?: number): string {
    if (tcpa === undefined || tcpa === null) return '-- min';
    const mins = Math.max(0, Math.round(tcpa / 60));
    return `${mins} min`;
  }

  handleTrack(): void {
    this.onTrack.emit(this.target);
  }

  handleNavigate(): void {
    this.onNavigateTo.emit(this.target);
  }
}
