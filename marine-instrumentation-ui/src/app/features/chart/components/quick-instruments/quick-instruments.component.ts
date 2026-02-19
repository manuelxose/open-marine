import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quick-instruments',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quick-instruments">
      <!-- SOG -->
      <div class="instrument" [class.stale]="sogStale">
        <span class="instrument__label">SOG</span>
        <div class="instrument__reading">
          <span class="instrument__value">{{ sogDisplay }}</span>
          <span class="instrument__unit">{{ speedUnit }}</span>
        </div>
        <div class="instrument__bar">
          <div class="instrument__bar-fill" [style.width.%]="sogPercent"></div>
        </div>
      </div>
      
      <div class="instrument-divider"></div>
      
      <!-- COG -->
      <div class="instrument" [class.stale]="cogStale">
        <span class="instrument__label">COG</span>
        <div class="instrument__reading">
          <span class="instrument__value">{{ cogDisplay }}</span>
          <span class="instrument__unit">°</span>
        </div>
        <div class="instrument__compass-hint">
          <span class="compass-letter">{{ compassLetter }}</span>
        </div>
      </div>
      
      <div class="instrument-divider"></div>
      
      <!-- Depth -->
      <div class="instrument" [class.stale]="depthStale" [class.warning]="isShallow">
        <span class="instrument__label">DEPTH</span>
        <div class="instrument__reading">
          <span class="instrument__value">{{ depthDisplay }}</span>
          <span class="instrument__unit">{{ depthUnit }}</span>
        </div>
        <div class="instrument__bar">
          <div class="instrument__bar-fill instrument__bar-fill--depth" 
               [style.width.%]="depthPercent"
               [class.shallow]="isShallow">
          </div>
        </div>
      </div>
      
      <!-- Expand Handle -->
      <button class="expand-handle" (click)="openDrawer.emit()" title="Open Instruments">
        <span class="expand-handle__dots">
          <span></span><span></span><span></span>
        </span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .quick-instruments {
      display: flex;
      align-items: stretch;
      
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
    }
    
    .instrument-divider {
      width: 1px;
      background: color-mix(in srgb, var(--border-default) 40%, transparent);
    }

    .instrument {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-3) var(--space-4);
      min-width: 80px;
      background: transparent;
      transition: all var(--duration-fast) var(--ease-out);
      position: relative;
      
      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 40%, transparent);
      }
      
      &.stale {
        opacity: 0.35;
        
        .instrument__value {
          color: var(--text-muted);
        }
      }
      
      &.warning {
        background: color-mix(in srgb, var(--danger) 8%, transparent);
        
        .instrument__value {
          color: var(--danger);
        }
        
        .instrument__label {
          color: var(--danger);
          opacity: 0.7;
        }
      }
      
      &__label {
        font-size: 0.5rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--text-muted);
        margin-bottom: 2px;
      }

      &__reading {
        display: flex;
        align-items: baseline;
        gap: 3px;
      }
      
      &__value {
        font-family: var(--font-mono);
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
        letter-spacing: -0.03em;
      }
      
      &__unit {
        font-size: 0.55rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      // Micro progress bar under value
      &__bar {
        width: 100%;
        height: 2px;
        background: color-mix(in srgb, var(--border-default) 30%, transparent);
        border-radius: 1px;
        margin-top: var(--space-1);
        overflow: hidden;
      }

      &__bar-fill {
        height: 100%;
        background: var(--primary);
        border-radius: 1px;
        transition: width 0.8s var(--ease-out);
        
        &--depth {
          background: var(--fix-color);
          
          &.shallow {
            background: var(--danger);
          }
        }
      }

      // Compass hint for COG
      &__compass-hint {
        margin-top: 2px;

        .compass-letter {
          font-size: 0.5rem;
          font-weight: 700;
          color: var(--primary);
          letter-spacing: 0.05em;
        }
      }
    }
    
    // ── Expand Handle ──
    .expand-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      background: color-mix(in srgb, var(--bg-surface-secondary) 60%, transparent);
      border: none;
      border-left: 1px solid color-mix(in srgb, var(--border-default) 40%, transparent);
      color: var(--text-muted);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: var(--primary);
        color: white;
        
        .expand-handle__dots span {
          background: white;
        }
      }

      &:active {
        transform: scaleX(0.92);
      }

      &__dots {
        display: flex;
        flex-direction: column;
        gap: 3px;

        span {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--text-muted);
          transition: background var(--duration-fast);
        }
      }
    }
  `]
})
export class QuickInstrumentsComponent {
  @Input() sog: number | null = null;
  @Input() cog: number | null = null;
  @Input() depth: number | null = null;
  @Input() speedUnit: 'kn' | 'm/s' | 'km/h' = 'kn';
  @Input() depthUnit: 'm' | 'ft' = 'm';
  @Input() shallowThreshold = 3;
  
  @Output() openDrawer = new EventEmitter<void>();
  
  get sogDisplay(): string {
    return this.sog !== null ? this.sog.toFixed(1) : '--';
  }
  
  get cogDisplay(): string {
    return this.cog !== null ? this.cog.toFixed(0) : '--';
  }
  
  get depthDisplay(): string {
    return this.depth !== null ? this.depth.toFixed(1) : '--';
  }
  
  get sogStale(): boolean { return this.sog === null; }
  get cogStale(): boolean { return this.cog === null; }
  get depthStale(): boolean { return this.depth === null; }
  
  get isShallow(): boolean {
    return this.depth !== null && this.depth < this.shallowThreshold;
  }

  /** SOG as percentage (0-100%) - assumes max ~15kn */
  get sogPercent(): number {
    if (this.sog === null) return 0;
    return Math.min((this.sog / 15) * 100, 100);
  }

  /** Depth as inverted percentage for bar (shallow = larger bar) - max 50m */
  get depthPercent(): number {
    if (this.depth === null) return 0;
    return Math.min((this.depth / 50) * 100, 100);
  }

  /** Compass cardinal/intercardinal letter from COG */
  get compassLetter(): string {
    if (this.cog === null) return '--';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(this.cog / 45) % 8;
    return dirs[idx] ?? 'N';
  }
}
