import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconButtonComponent } from '../../app-icon-button/app-icon-button.component';

export type KeyValueOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'app-key-value',
  standalone: true,
  imports: [CommonModule, AppIconButtonComponent],
  template: `
    <div class="key-value" [ngClass]="'orientation-' + orientation">
      <div class="key-value-label">
        {{ label }}
      </div>
      
      <div class="key-value-content">
        <span class="key-value-data">{{ value }}</span>
        <span class="key-value-unit" *ngIf="unit">{{ unit }}</span>
        
        <div class="key-value-actions" *ngIf="copyable">
             <app-icon-button 
                icon="check" 
                label="Copied"
                size="xs" 
                variant="ghost" 
                *ngIf="copied"
                class="text-success">
             </app-icon-button>
             
             <button 
                type="button" 
                class="copy-btn" 
                *ngIf="!copied"
                (click)="copyToClipboard()"
                aria-label="Copy to clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                   <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
             </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .key-value {
      display: flex;
      font-size: var(--text-base, 1rem);
      
      &.orientation-horizontal {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--spacing-md, 16px);
        
        .key-value-label {
            color: var(--gb-text-muted);
        }
        
        .key-value-content {
            text-align: right;
        }
      }

      &.orientation-vertical {
        flex-direction: column;
        gap: 2px;
        
        .key-value-label {
            font-size: var(--text-sm, 0.875rem);
            color: var(--gb-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .key-value-data {
             font-size: var(--text-lg, 1.125rem);
             font-weight: 500;
        }
      }

      &-label {
        font-weight: 400;
      }

      &-content {
        display: flex;
        align-items: baseline;
        gap: 4px;
        color: var(--gb-text-value);
        font-family: var(--font-mono, monospace);
        position: relative;
               
        &:hover .copy-btn {
           opacity: 1;
        }
      }

      &-unit {
        font-size: 0.8em;
        color: var(--gb-text-muted);
      }
      
      &-actions {
        display: inline-flex;
        margin-left: 8px;
      }
      
      .copy-btn {
         background: none;
         border: none;
         padding: 4px;
         cursor: pointer;
         color: var(--gb-text-muted);
         opacity: 0; 
         transition: opacity 0.2s, color 0.2s;
         border-radius: 4px;
         display: flex;
         align-items: center;

         &:hover {
             background-color: var(--bg-surface-secondary);
             color: var(--gb-needle-secondary);
         }
      }
      
      .text-success {
          color: var(--success);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppKeyValueComponent {
  @Input() label!: string;
  @Input() value!: string | number;
  @Input() unit?: string;
  @Input() orientation: KeyValueOrientation = 'horizontal';
  @Input() copyable = false;

  copied = false;

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(String(this.value));
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }
}
