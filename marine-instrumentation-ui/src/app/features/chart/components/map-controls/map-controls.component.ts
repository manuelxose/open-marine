import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-controls">
      <!-- Zoom Group -->
      <div class="control-group">
        <button 
          class="control-btn" 
          (click)="zoomIn.emit()"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <app-icon name="plus" [size]="18" />
        </button>
        <div class="control-group__divider"></div>
        <button 
          class="control-btn" 
          (click)="zoomOut.emit()"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <app-icon name="minus" [size]="18" />
        </button>
      </div>
      
      <!-- Navigation Group -->
      <div class="control-group">
        <button 
          class="control-btn"
          [class.active]="isTracking"
          (click)="centerOnVessel.emit()"
          [title]="isTracking ? 'Tracking Active' : 'Center on Vessel'"
          [attr.aria-label]="isTracking ? 'Tracking Active' : 'Center on Vessel'"
        >
          <app-icon name="crosshair" [size]="18" />
        </button>
        <div class="control-group__divider"></div>
        <button 
          class="control-btn"
          [class.active]="orientation === 'course-up'"
          (click)="toggleOrientation.emit()"
          [title]="orientation === 'north-up' ? 'Switch to Course Up' : 'Switch to North Up'"
        >
          <app-icon [name]="orientation === 'north-up' ? 'compass' : 'navigation'" [size]="18" />
          <span class="control-btn__micro-label">
            {{ orientation === 'north-up' ? 'N' : 'C' }}
          </span>
        </button>
      </div>
      
      <!-- Layer Toggle -->
      <div class="control-group control-group--single">
        <button 
          class="control-btn"
          [class.active]="sourceId === 'satellite'"
          (click)="toggleBaseLayer.emit()"
          [title]="sourceId === 'satellite' ? 'Switch to Map' : 'Switch to Satellite'"
        >
          <app-icon name="layers" [size]="18" />
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .map-controls {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    
    .control-group {
      display: flex;
      flex-direction: column;
      
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;

      &--single {
        border-radius: var(--radius-lg);
      }

      &__divider {
        height: 1px;
        margin: 0 var(--space-2);
        background: color-mix(in srgb, var(--border-default) 40%, transparent);
      }
    }
    
    .control-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 70%, transparent);
        color: var(--text-primary);
      }
      
      &:active {
        transform: scale(0.9);
        background: color-mix(in srgb, var(--bg-surface-secondary) 90%, transparent);
      }
      
      &.active {
        background: color-mix(in srgb, var(--primary) 15%, transparent);
        color: var(--primary);
        
        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 25%;
          bottom: 25%;
          width: 2px;
          background: var(--primary);
          border-radius: 0 1px 1px 0;
        }

        &:hover {
          background: color-mix(in srgb, var(--primary) 25%, transparent);
        }
      }
      
      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
      }

      &__micro-label {
        position: absolute;
        bottom: 4px;
        right: 6px;
        font-size: 0.45rem;
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
  @Input() isTracking = false;
  @Input() sourceId = 'osm-raster';
  
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() centerOnVessel = new EventEmitter<void>();
  @Output() toggleOrientation = new EventEmitter<void>();
  @Output() toggleBaseLayer = new EventEmitter<void>();
}