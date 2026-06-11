import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DepthState = 'normal' | 'shallow' | 'alarm';

@Component({
  selector: 'app-depth-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './depth-gauge.component.html',
  styleUrls: ['./depth-gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepthGaugeComponent implements OnChanges {
  @Input() depth: number = 0;
  @Input() unit: 'm' | 'ft' | 'fm' = 'm';
  @Input() shallowThreshold: number = 3;
  @Input() alarmThreshold: number = 1.5;
  @Input() maxDepthScale: number = 20; // For visual scaling

  state: DepthState = 'normal';
  waterLevelPercent: number = 50;

  ngOnChanges(_changes: SimpleChanges): void {
    this.updateState();
    this.updateVisuals();
  }

  private updateState(): void {
    if (this.depth <= this.alarmThreshold) {
      this.state = 'alarm';
    } else if (this.depth <= this.shallowThreshold) {
      this.state = 'shallow';
    } else {
      this.state = 'normal';
    }
  }

  private updateVisuals(): void {
    // Calculate visual percentage. 
    // If depth is small, water column is small (meaning closer to keel).
    // Wait, physically: Depth "Below Transducer" means distance from sensor to bottom.
    // If scaled visually:
    // 0m = 0% height (Bottom touches Keel)
    // maxDepth = 100% height
    
    // Clamp between 0 and 100%
    const pct = (this.depth / this.maxDepthScale) * 100;
    this.waterLevelPercent = Math.max(5, Math.min(100, pct));
  }
}
