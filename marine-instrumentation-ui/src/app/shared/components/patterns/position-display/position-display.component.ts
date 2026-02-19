import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppButtonComponent } from '../../app-button/app-button.component';

export type PositionFormat = 'DD' | 'DMS' | 'DDM';

@Component({
  selector: 'app-position-display',
  standalone: true,
  imports: [CommonModule, AppTextComponent, AppButtonComponent],
  template: `
    <div class="position-display" [class.vertical]="orientation === 'vertical'">
      <!-- Latitude -->
      <div class="coord-group">
        <app-text variant="caption" color="muted" class="label">LAT</app-text>
        <app-text variant="value" [size]="size" weight="medium" class="value font-mono">
          {{ formattedLat() }}
        </app-text>
      </div>

      <!-- Separator (only for horizontal) -->
      <div class="separator" *ngIf="orientation === 'horizontal'"></div>

      <!-- Longitude -->
      <div class="coord-group">
        <app-text variant="caption" color="muted" class="label">LON</app-text>
        <app-text variant="value" [size]="size" weight="medium" class="value font-mono">
          {{ formattedLon() }}
        </app-text>
      </div>

      <!-- Copy Button (Icon reused) -->
      <app-button 
        *ngIf="copyable" 
        variant="ghost" 
        size="sm" 
        iconLeft="target" 
        (click)="copyToClipboard()"
        [title]="copied() ? 'Copied!' : 'Copy coordinates'">
        <span *ngIf="copied()" class="text-success">Copied</span>
      </app-button>
    </div>
  `,
  styleUrls: ['./position-display.component.scss']
})
export class PositionDisplayComponent {
  @Input() lat: number = 0;
  @Input() lon: number = 0;
  
  // Format: 
  // DD  = Decimal Degrees (42.12345°)
  // DMS = Degrees Minutes Seconds (42° 07' 24")
  // DDM = Degrees Decimal Minutes (42° 07.400') - Standard Marine
  @Input() format: PositionFormat = 'DDM';
  
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() size: 'sm' | 'base' | 'lg' | 'xl' = 'base';
  @Input() copyable: boolean = false;

  readonly copied = signal(false);

  readonly formattedLat = computed(() => this.formatValue(this.lat, 'lat'));
  readonly formattedLon = computed(() => this.formatValue(this.lon, 'lon'));

  formatValue(val: number, type: 'lat' | 'lon'): string {
    const absVal = Math.abs(val);
    const deg = Math.floor(absVal);
    const cardinal = type === 'lat' 
      ? (val >= 0 ? 'N' : 'S') 
      : (val >= 0 ? 'E' : 'W');

    if (this.format === 'DD') {
      return `${absVal.toFixed(5)}° ${cardinal}`;
    }

    if (this.format === 'DMS') {
      const minFloat = (absVal - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = ((minFloat - min) * 60).toFixed(1);
      return `${deg}° ${min.toString().padStart(2, '0')}' ${sec.padStart(4, '0')}" ${cardinal}`;
    }

    // Default: DDM (Standard Marine)
    const minDec = ((absVal - deg) * 60).toFixed(3);
    return `${deg}° ${minDec.padStart(6, '0')}' ${cardinal}`;
  }

  async copyToClipboard() {
    const text = `${this.formattedLat()} ${this.formattedLon()}`;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }
}
