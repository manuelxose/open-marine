import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartLayerMode } from '../../types/chart-vm';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [CommonModule, AppIconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-controls">
      <!-- Panel Toggle (single button) -->
      <div class="control-group">
        <button
          class="control-btn"
          [class.active]="panelOpen"
          (click)="togglePanel.emit()"
          [title]="panelOpen ? 'Close Panel' : 'Open Panel'"
          [attr.aria-expanded]="panelOpen">
          <app-icon [name]="panelOpen ? 'chevron-left' : 'chevron-right'" [size]="16" />
        </button>
      </div>

      <!-- Zoom Group -->
      <div class="control-group">
        <button class="control-btn" (click)="zoomIn.emit()" title="Zoom In" aria-label="Zoom In">
          <app-icon name="plus" [size]="16" />
        </button>
        <div class="control-group__divider"></div>
        <button class="control-btn" (click)="zoomOut.emit()" title="Zoom Out" aria-label="Zoom Out">
          <app-icon name="minus" [size]="16" />
        </button>
      </div>

      <!-- Navigation Group -->
      <div class="control-group">
        <button
          class="control-btn"
          [class.active]="autoCenter"
          [disabled]="!canCenter"
          (click)="centerOnVessel.emit()"
          [title]="autoCenter ? 'Disable auto-tracking' : 'Center & follow vessel'">
          <app-icon name="crosshair" [size]="16" />
          <span *ngIf="autoCenter" class="control-btn__micro-label">A</span>
        </button>
        <div class="control-group__divider"></div>
        <button
          class="control-btn"
          [class.active]="orientation === 'course-up'"
          (click)="toggleOrientation.emit()"
          [title]="orientation === 'north-up' ? 'Course Up' : 'North Up'">
          <app-icon [name]="orientation === 'north-up' ? 'compass' : 'navigation'" [size]="16" />
          <span class="control-btn__micro-label">{{ orientation === 'north-up' ? 'N' : 'C' }}</span>
        </button>
      </div>

      <!-- Tools Group -->
      <div class="control-group">
        <button
          class="control-btn"
          [class.active]="addWaypointModeActive"
          (click)="addWaypoint.emit()"
          [title]="addWaypointModeActive ? 'Stop Add Waypoint' : 'Add Waypoint'"
          aria-label="Add Waypoint">
          <app-icon name="waypoint" [size]="16" />
          <span class="control-btn__micro-label">{{ addWaypointModeActive ? 'ON' : '+' }}</span>
        </button>
        <div class="control-group__divider"></div>
        <button
          class="control-btn"
          [disabled]="!hasActiveWaypoint"
          (click)="deleteActiveWaypoint.emit()"
          title="Delete active waypoint"
          aria-label="Delete active waypoint">
          <app-icon name="trash" [size]="16" />
        </button>
        <div class="control-group__divider"></div>
        <button
          class="control-btn"
          [class.active]="measureActive"
          (click)="toggleMeasure.emit()"
          [title]="measureActive ? 'Cancel Measurement' : 'Measure'">
          <app-icon name="ruler" [size]="16" />
        </button>
        <div class="control-group__divider"></div>
        <button
          class="control-btn"
          [class.active]="anchorWatchActive"
          (click)="toggleAnchorWatch.emit()"
          [title]="anchorWatchActive ? 'Stop Anchor Watch' : 'Anchor Watch'">
          <app-icon name="anchor" [size]="16" />
        </button>
      </div>

      <!-- Layer Toggle -->
      <div class="control-group">
        <button
          class="control-btn"
          [class.active]="layerMode === 'nautical'"
          (click)="toggleBaseLayer.emit()"
          [attr.aria-label]="layerButtonAriaLabel"
          [title]="layerButtonLabel">
          <app-icon [name]="layerButtonIcon" [size]="16" />
          <span class="control-btn__micro-label">{{ layerModeBadge }}</span>
        </button>
        <div class="control-group__divider"></div>
        <button
          class="control-btn"
          [class.active]="showOpenSeaMap"
          (click)="toggleOpenSeaMap.emit()"
          [title]="showOpenSeaMap ? 'Hide Nautical' : 'Show Nautical'">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
          </svg>
        </button>
        <div class="control-group__divider"></div>
        <button
          class="control-btn"
          [class.active]="showAisTracks"
          (click)="toggleAisTracks.emit()"
          [attr.aria-label]="showAisTracks ? 'Hide AIS tracks' : 'Show AIS tracks'"
          [title]="'chart.controls.ais_tracks' | translate">
          <app-icon name="route" [size]="16" />
        </button>
      </div>

      <!-- Map Settings Menu -->
      <div class="control-group">
        <button
          class="control-btn"
          [class.active]="settingsPanelOpen"
          (click)="toggleSettingsPanel.emit()"
          title="Map Settings">
          <app-icon name="settings" [size]="16" />
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .map-controls {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;

      &__divider {
        height: 1px;
        margin: 0 var(--space-1);
        background: color-mix(in srgb, var(--border-default) 35%, transparent);
      }
    }

    .control-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      background: transparent;
      border: none;
      color: var(--gb-text-muted);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 70%, transparent);
        color: var(--gb-text-value);
      }

      &:active { transform: scale(0.9); }

      &.active {
        background: color-mix(in srgb, var(--gb-needle-secondary) 15%, transparent);
        color: var(--gb-needle-secondary);

        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 25%;
          bottom: 25%;
          width: 2px;
          background: var(--gb-needle-secondary);
          border-radius: 0 1px 1px 0;
        }

        &:hover {
          background: color-mix(in srgb, var(--gb-needle-secondary) 25%, transparent);
        }
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
      }

      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      &__micro-label {
        position: absolute;
        bottom: 3px;
        right: 5px;
        font-size: 0.4rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        color: inherit;
        opacity: 0.6;
      }
    }
  `]
})
export class MapControlsComponent {
  @Input() orientation: 'north-up' | 'course-up' = 'north-up';
  @Input() canCenter = false;
  @Input() autoCenter = false;
  @Input() layerMode: ChartLayerMode = 'osm';
  @Input() anchorWatchActive = false;
  @Input() showOpenSeaMap = false;
  @Input() showAisTracks = true;
  @Input() measureActive = false;
  @Input() addWaypointModeActive = false;
  @Input() hasActiveWaypoint = false;
  @Input() panelOpen = false;
  @Input() settingsPanelOpen = false;

  @Output() zoomIn = new EventEmitter<void>();
  @Output() togglePanel = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() centerOnVessel = new EventEmitter<void>();
  @Output() toggleOrientation = new EventEmitter<void>();
  @Output() addWaypoint = new EventEmitter<void>();
  @Output() toggleBaseLayer = new EventEmitter<void>();
  @Output() toggleAnchorWatch = new EventEmitter<void>();
  @Output() toggleOpenSeaMap = new EventEmitter<void>();
  @Output() toggleAisTracks = new EventEmitter<void>();
  @Output() toggleMeasure = new EventEmitter<void>();
  @Output() deleteActiveWaypoint = new EventEmitter<void>();
  @Output() toggleSettingsPanel = new EventEmitter<void>();

  get layerButtonLabel(): string {
    switch (this.layerMode) {
      case 'osm':
        return 'Satellite';
      case 'satellite':
        return 'Nautical';
      case 'nautical':
      default:
        return 'Map';
    }
  }

  get layerButtonAriaLabel(): string {
    return `Switch to ${this.layerButtonLabel} view`;
  }

  get layerButtonIcon(): 'map' | 'satellite' | 'anchor' {
    switch (this.layerMode) {
      case 'satellite':
        return 'satellite';
      case 'nautical':
        return 'anchor';
      case 'osm':
      default:
        return 'map';
    }
  }

  get layerModeBadge(): 'MAP' | 'SAT' | 'NAU' {
    switch (this.layerMode) {
      case 'satellite':
        return 'SAT';
      case 'nautical':
        return 'NAU';
      case 'osm':
      default:
        return 'MAP';
    }
  }
}
