import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-fullscreen-toggle',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button 
      class="fullscreen-btn"
      [class.is-fullscreen]="isFullscreen"
      (click)="toggle.emit()"
      [title]="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
      aria-label="Toggle Fullscreen"
    >
      <span class="fullscreen-btn__icon">
        <app-icon 
          [name]="isFullscreen ? 'minimize' : 'maximize'" 
          [size]="18" 
        />
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: block;
    }

    .fullscreen-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      
      background: var(--chart-overlay-bg);
      backdrop-filter: var(--chart-overlay-blur);
      border: 1px solid var(--chart-overlay-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--chart-overlay-shadow);
      color: var(--gb-text-muted);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: var(--gb-needle-secondary);
        opacity: 0;
        transition: opacity var(--duration-fast) var(--ease-out);
      }
      
      &:hover {
        border-color: color-mix(in srgb, var(--gb-needle-secondary) 40%, var(--chart-overlay-border));
        box-shadow: var(--chart-overlay-shadow), 0 0 16px -4px color-mix(in srgb, var(--gb-needle-secondary) 25%, transparent);

        &::before {
          opacity: 0.12;
        }
        
        color: var(--gb-needle-secondary);
      }
      
      &:active {
        transform: scale(0.9);
      }
      
      &.is-fullscreen {
        background: color-mix(in srgb, var(--gb-needle-secondary) 20%, var(--chart-overlay-bg));
        border-color: color-mix(in srgb, var(--gb-needle-secondary) 50%, var(--chart-overlay-border));
        color: var(--gb-needle-secondary);
        box-shadow: var(--chart-overlay-shadow), 0 0 20px -4px color-mix(in srgb, var(--gb-needle-secondary) 30%, transparent);
        
        &:hover {
          background: color-mix(in srgb, var(--gb-needle-secondary) 30%, var(--chart-overlay-bg));
        }
      }

      &__icon {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  `]
})
export class FullscreenToggleComponent {
  @Input() isFullscreen = false;
  @Output() toggle = new EventEmitter<void>();
}
