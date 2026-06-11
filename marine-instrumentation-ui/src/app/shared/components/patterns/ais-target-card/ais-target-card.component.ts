import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export type AISStatus = 'safe' | 'warning' | 'danger';

@Component({
  selector: 'app-ais-target-card',
  standalone: true,
  imports: [CommonModule, AppBoxComponent, AppStackComponent, AppTextComponent, AppIconComponent],
  template: `
    <app-box [class]="boxVariant()" [border]="true" padding="3" class="target-card">
        <app-stack spacing="md">
            <!-- Header -->
            <div class="header">
                <div class="icon-wrapper" [class]="statusClass()">
                    <app-icon name="navigation" size="lg"></app-icon>
                </div>
                <div class="info">
                    <app-text variant="body" weight="medium" class="truncate">{{ name || 'Unknown' }}</app-text>
                    <app-text variant="caption" class="text-muted">
                        MMSI: {{ mmsi }} <span *ngIf="callsign">| {{ callsign }}</span>
                    </app-text>
                </div>
            </div>

            <!-- Position Metrics -->
            <div class="metrics-grid">
                <div class="metric">
                    <app-text variant="caption" class="text-muted">DST</app-text>
                    <app-text variant="value">{{ formatDistance(distance) }}</app-text>
                    <app-text variant="caption" size="xs" class="unit">nm</app-text>
                </div>
                <div class="metric">
                    <app-text variant="caption" class="text-muted">BRG</app-text>
                    <app-text variant="value">{{ formatBearing(bearing) }}</app-text>
                    <app-text variant="caption" size="xs" class="unit">°</app-text>
                </div>
            </div>

            <!-- Collision Metrics (only if provided) -->
            <div class="collision-metrics" *ngIf="cpa !== undefined || tcpa !== undefined" [class]="statusClass()">
                 <div class="metric">
                    <app-text variant="caption">CPA</app-text>
                    <app-text variant="value" weight="bold">{{ formatDistance(cpa) }}</app-text>
                    <app-text variant="caption" size="xs">nm</app-text>
                </div>
                 <div class="metric">
                    <app-text variant="caption">TCPA</app-text>
                    <app-text variant="value" weight="bold">{{ formatTime(tcpa) }}</app-text>
                    <app-text variant="caption" size="xs">min</app-text>
                </div>
            </div>
        </app-stack>
    </app-box>
  `,
  styleUrls: ['./ais-target-card.component.scss']
})
export class AISTargetCardComponent {
  @Input({ required: true }) mmsi!: string;
  @Input() name?: string;
  @Input() callsign?: string;
  @Input() distance?: number;
  @Input() bearing?: number;
  @Input() cpa?: number; // nm
  @Input() tcpa?: number; // seconds
  @Input() status: AISStatus = 'safe';

  boxVariant = computed(() => {
     if (this.status === 'danger') return 'outline-danger';
     if (this.status === 'warning') return 'outline-warn';
     return 'default';
  });

  statusClass = computed(() => `status-${this.status}`);

  formatDistance(val?: number): string {
      if (val === undefined || val === null) return '--';
      return val.toFixed(1);
  }

  formatBearing(val?: number): string {
      if (val === undefined || val === null) return '---';
      return Math.round(val).toString().padStart(3, '0');
  }

  formatTime(seconds?: number): string {
      if (seconds === undefined || seconds === null) return '--';
      const mins = Math.round(seconds / 60);
      return mins.toString();
  }
}
