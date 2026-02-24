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

      <!-- HDG -->
      <div class="instrument" [class.stale]="hdgStale">
        <span class="instrument__label">HDG</span>
        <div class="instrument__reading">
          <span class="instrument__value">{{ hdgDisplay }}</span>
          <span class="instrument__unit">°T</span>
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

      <div class="instrument-divider"></div>

      <!-- Wind -->
      <div class="instrument" [class.stale]="windStale">
        <span class="instrument__label">WIND</span>
        <div class="instrument__reading">
          <span class="instrument__value">{{ awsDisplay }}</span>
          <span class="instrument__unit">kn</span>
        </div>
        <div class="instrument__compass-hint">
          <span class="compass-letter">{{ awaDisplay }}°</span>
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
    :host { display: block; }

    .quick-instruments {
      display: flex;
      align-items: stretch;
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--chart-overlay-shadow);
      overflow: hidden;
    }
    
    .instrument-divider {
      width: 1px;
      background: color-mix(in srgb, var(--border-default) 35%, transparent);
    }

    .instrument {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-3);
      min-width: 64px;
      background: transparent;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: color-mix(in srgb, var(--bg-surface-secondary) 40%, transparent);
      }
      
      &.stale {
        opacity: 0.35;
        .instrument__value { color: var(--text-muted); }
      }
      
      &.warning {
        background: color-mix(in srgb, var(--danger) 8%, transparent);
        .instrument__value { color: var(--danger); }
        .instrument__label { color: var(--danger); opacity: 0.7; }
      }
      
      &__label {
        font-size: 0.45rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--text-muted);
        margin-bottom: 1px;
      }

      &__reading {
        display: flex;
        align-items: baseline;
        gap: 2px;
      }
      
      &__value {
        font-family: var(--font-mono);
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--gb-text-value);
        line-height: 1;
        letter-spacing: -0.03em;
      }
      
      &__unit {
        font-size: 0.48rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      &__bar {
        width: 100%;
        height: 2px;
        background: color-mix(in srgb, var(--border-default) 30%, transparent);
        border-radius: 1px;
        margin-top: 2px;
        overflow: hidden;
      }

      &__bar-fill {
        height: 100%;
        background: var(--gb-needle-secondary);
        border-radius: 1px;
        transition: width 0.8s var(--ease-out);
        
        &--depth {
          background: var(--fix-color);
          &.shallow { background: var(--danger); }
        }
      }

      &__compass-hint {
        margin-top: 1px;
        .compass-letter {
          font-size: 0.45rem;
          font-weight: 700;
          color: var(--gb-needle-secondary);
          letter-spacing: 0.05em;
        }
      }
    }
    
    .expand-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      background: color-mix(in srgb, var(--bg-surface-secondary) 60%, transparent);
      border: none;
      border-left: 1px solid color-mix(in srgb, var(--border-default) 35%, transparent);
      color: var(--text-muted);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        background: var(--gb-needle-secondary);
        color: white;
        .expand-handle__dots span { background: white; }
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
  @Input() hdg: number | null = null;
  @Input() depth: number | null = null;
  @Input() aws: number | null = null;
  @Input() awa: number | null = null;
  @Input() speedUnit: 'kn' | 'm/s' | 'km/h' = 'kn';
  @Input() depthUnit: 'm' | 'ft' = 'm';
  @Input() shallowThreshold = 3;
  
  @Output() openDrawer = new EventEmitter<void>();
  
  get sogDisplay(): string { return this.sog !== null ? this.sog.toFixed(1) : '--'; }
  get cogDisplay(): string { return this.cog !== null ? this.cog.toFixed(0) : '--'; }
  get hdgDisplay(): string { return this.hdg !== null ? this.hdg.toFixed(0) : '--'; }
  get depthDisplay(): string { return this.depth !== null ? this.depth.toFixed(1) : '--'; }
  get awsDisplay(): string { return this.aws !== null ? this.aws.toFixed(1) : '--'; }
  get awaDisplay(): string { return this.awa !== null ? Math.abs(this.awa).toFixed(0) : '--'; }
  
  get sogStale(): boolean { return this.sog === null; }
  get cogStale(): boolean { return this.cog === null; }
  get hdgStale(): boolean { return this.hdg === null; }
  get depthStale(): boolean { return this.depth === null; }
  get windStale(): boolean { return this.aws === null; }
  
  get isShallow(): boolean { return this.depth !== null && this.depth < this.shallowThreshold; }
  get sogPercent(): number { return this.sog === null ? 0 : Math.min((this.sog / 15) * 100, 100); }
  get depthPercent(): number { return this.depth === null ? 0 : Math.min((this.depth / 50) * 100, 100); }

  get compassLetter(): string {
    if (this.cog === null) return '--';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(this.cog / 45) % 8;
    return dirs[idx] ?? 'N';
  }
}
