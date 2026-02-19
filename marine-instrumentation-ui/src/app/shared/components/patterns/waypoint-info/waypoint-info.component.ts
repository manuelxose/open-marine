import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { formatDistance, formatAngleDegrees, formatDuration } from '../../../../core/formatting/formatters';

@Component({
  selector: 'app-waypoint-info',
  standalone: true,
  imports: [CommonModule, AppStackComponent, AppTextComponent, AppIconComponent, AppBoxComponent],
  template: `
    <app-box class="waypoint-info" padding="4">
      <app-stack spacing="md" align="stretch">
        
        <!-- Header: Waypoint Name -->
        <app-stack direction="row" spacing="sm" align="center" class="header">
           <app-icon name="waypoint" size="sm" class="text-accent"></app-icon>
           <app-text variant="caption" size="base" weight="bold" class="truncate">{{ name || '--' }}</app-text>
        </app-stack>

        <div class="separator"></div>
        
        <!-- Main Grid -->
        <div class="info-grid">
           
           <!-- DTG -->
           <div class="info-cell">
              <app-text variant="caption" color="muted">DTG</app-text>
              <div class="value-unit">
                 <app-text variant="value" size="xl">{{ display.dtg.value }}</app-text>
                 <app-text variant="caption" color="muted" class="unit">{{ display.dtg.unit }}</app-text>
              </div>
           </div>

           <!-- BRG -->
           <div class="info-cell">
              <app-text variant="caption" color="muted">BRG</app-text>
              <div class="value-unit">
                 <app-text variant="value" size="xl">{{ display.brg.value }}</app-text>
                 <app-text variant="caption" color="muted" class="unit">{{ display.brg.unit }}</app-text>
              </div>
           </div>

           <!-- TTG / ETA -->
           <div class="info-cell">
              <app-text variant="caption" color="muted">TTG</app-text>
              <div class="value-unit">
                 <app-text variant="value" size="xl">{{ display.ttg }}</app-text>
              </div>
           </div>

           <!-- XTD -->
           <div class="info-cell">
              <app-text variant="caption" color="muted">XTD</app-text>
              <div class="value-unit">
                 <app-text variant="value" size="xl">{{ display.xtd.value }}</app-text>
                 <app-text variant="caption" color="muted" class="unit">{{ display.xtd.unit }}</app-text>
                 <app-icon 
                    *ngIf="display.xtd.dir" 
                    [name]="display.xtd.dir === 'L' ? 'chevron-left' : 'chevron-right'"
                    size="xs"
                    [class]="display.xtd.dir === 'L' ? 'text-danger' : 'text-success'">
                 </app-icon>
                 <app-text *ngIf="display.xtd.dir" variant="caption" [color]="display.xtd.dir === 'L' ? 'danger' : 'success'" weight="bold">
                    {{ display.xtd.dir }}
                 </app-text>
              </div>
           </div>

        </div>

      </app-stack>
    </app-box>
  `,
  styleUrls: ['./waypoint-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointInfoComponent implements OnChanges {
  @Input() name: string | null = null;
  @Input() distance: number | null = null; // meters
  @Input() bearing: number | null = null; // radians
  @Input() ttg: number | null = null; // seconds
  @Input() xtd: number | null = null; // meters (negative = left, positive = right)

  display = {
    dtg: { value: '--', unit: 'NM' },
    brg: { value: '--', unit: '°' },
    ttg: '--:--',
    xtd: { value: '--', unit: 'm', dir: null as 'L' | 'R' | null }
  };

  ngOnChanges(_changes: SimpleChanges): void {
    this.updateValues();
  }

  updateValues() {
    this.display.dtg = formatDistance(this.distance, 'nm');
    this.display.brg = formatAngleDegrees(this.bearing);
    this.display.ttg = formatDuration(this.ttg);
    
    // XTD Logic
    if (this.xtd !== null && this.xtd !== undefined) {
      const absXtd = Math.abs(this.xtd);
      // Determine unit for XTD (usually nm if large, m if small)
      // Let's stick to NM for XTD if > 0.1 NM (~185m), else m? 
      // Actually standard is often NM or 0.01 NM. 
      // Let's use formatDistance but maybe force NM or M depending on magnitude?
      // Default formatter logic:
      const xtdDist = formatDistance(absXtd, absXtd < 185 ? 'm' : 'nm');
      
      this.display.xtd = {
        value: xtdDist.value,
        unit: xtdDist.unit,
        dir: this.xtd < 0 ? 'L' : (this.xtd > 0 ? 'R' : null)
      };
    } else {
        this.display.xtd = { value: '--', unit: 'NM', dir: null };
    }
  }
}
