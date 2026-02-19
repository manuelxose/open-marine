import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { formatDuration, formatDistance, formatSpeed } from '../../../../core/formatting/formatters';

@Component({
  selector: 'app-eta-display',
  standalone: true,
  imports: [CommonModule, AppTextComponent, AppBoxComponent, AppStackComponent],
  providers: [DatePipe],
  template: `
    <app-box class="eta-container" padding="4">
      <app-stack spacing="md">
        
        <!-- Primary Row: ETA and TTG -->
        <div class="row primary">
          <div class="field">
            <app-text variant="caption" class="label text-muted">EST. ARRIVAL</app-text>
            <div class="value-group">
                <app-text variant="body" size="lg" weight="bold" class="value">{{ timeString() }}</app-text>
                <app-text variant="caption" class="sub-value text-muted" *ngIf="dateString()">{{ dateString() }}</app-text>
            </div>
          </div>
          
          <div class="field text-right">
            <app-text variant="caption" class="label text-muted">TIME TO GO</app-text>
            <app-text variant="body" size="lg" weight="bold" class="value">{{ formattedTTG() }}</app-text>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Secondary Row: DTG and VMG -->
        <div class="row secondary">
          <div class="field">
            <app-text variant="caption" class="label text-muted">DIST TO GO</app-text>
            <app-text variant="value" size="lg" class="value">{{ formattedDTG() }}</app-text>
          </div>
          
          <div class="field text-right">
            <app-text variant="caption" class="label text-muted">VMG</app-text>
            <app-text variant="value" size="lg" class="value">{{ formattedVMG() }}</app-text>
          </div>
        </div>

      </app-stack>
    </app-box>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .eta-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .text-right {
      align-items: flex-end;
      text-align: right;
    }

    .value-group {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
    }

    .divider {
      height: 1px;
      background-color: color-mix(in srgb, var(--border-default) 70%, transparent);
      margin: 0.25rem 0;
    }

    :host-context(.compass-card) .eta-container {
      background: transparent;
      border: 0;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
  `]
})
export class ETADisplayComponent {
  // Inputs as signals or setters
  protected _eta = signal<Date | null>(null);
  protected _ttg = signal<number | null>(null);
  protected _dtg = signal<number | null>(null);
  protected _vmg = signal<number | null>(null);

  @Input() set eta(val: Date | null | string) { 
      if (typeof val === 'string') {
          this._eta.set(new Date(val));
      } else {
          this._eta.set(val); 
      }
  }
  @Input() set ttg(val: number | null) { this._ttg.set(val); }
  @Input() set dtg(val: number | null) { this._dtg.set(val); }
  @Input() set vmg(val: number | null) { this._vmg.set(val); } // in m/s usually

  constructor(private datePipe: DatePipe) {}

  timeString = computed(() => {
    const d = this._eta();
    if (!d) return '--:--';
    return this.datePipe.transform(d, 'HH:mm') || '--:--';
  });

  dateString = computed(() => {
    const d = this._eta();
    if (!d) return null;
    return this.datePipe.transform(d, 'MMM d');
  });

  formattedTTG = computed(() => formatDuration(this._ttg()));

  formattedDTG = computed(() => {
      const res = formatDistance(this._dtg());
      return `${res.value} ${res.unit}`;
  });

  formattedVMG = computed(() => {
      const res = formatSpeed(this._vmg());
      return `${res.value} ${res.unit}`;
  });
}
