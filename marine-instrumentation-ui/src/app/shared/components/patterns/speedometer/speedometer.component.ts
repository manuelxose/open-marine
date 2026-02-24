import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-speedometer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speedometer.component.html',
  styleUrls: ['./speedometer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpeedometerComponent implements OnChanges {
  @Input() speed: number = 0;
  @Input() unit: string = 'kn';
  @Input() max: number = 15;
  @Input() target?: number;
  @Input() size: number = 200;

  // Visual calculations
  readonly startAngle = -135; // Bottom left
  readonly endAngle = 135;    // Bottom right
  readonly range = this.endAngle - this.startAngle; // 270 degrees

  needleRotation: number = this.startAngle;
  targetRotation: number | null = null;
  ticks: { rotation: number; label?: number }[] = [];

  ngOnChanges(_changes: SimpleChanges): void {
    this.calculateNeedle();
    this.generateTicks();
  }

  private calculateNeedle(): void {
    const clampedSpeed = Math.max(0, Math.min(this.speed, this.max));
    const ratio = clampedSpeed / this.max;
    // this.needleRotation = this.startAngle + (ratio * this.range);
    // Actually rotation is usually just degrees. 
    this.needleRotation = this.startAngle + (ratio * this.range);

    if (this.target !== undefined) {
        const clampedTarget = Math.max(0, Math.min(this.target, this.max));
        const targetRatio = clampedTarget / this.max;
        this.targetRotation = this.startAngle + (targetRatio * this.range);
    } else {
        this.targetRotation = null;
    }
  }

  private generateTicks(): void {
    const tickCount = 6; // major ticks
    this.ticks = [];
    const step = this.max / (tickCount - 1);
    
    for (let i = 0; i < tickCount; i++) {
        const val = i * step;
        const ratio = val / this.max;
        const rotation = this.startAngle + (ratio * this.range);
        this.ticks.push({ rotation, label: Math.round(val) });
    }
  }
}
