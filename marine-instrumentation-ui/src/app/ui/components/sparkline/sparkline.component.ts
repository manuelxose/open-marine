import { Component, Input, OnChanges, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryPoint } from '../../../state/datapoints/datapoint.models';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="viewBox" preserveAspectRatio="none" class="w-full h-full opacity-90" *ngIf="points">
      <polyline
        [attr.points]="points"
        fill="none"
        class="stroke-current"
        [ngClass]="colorClass"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
      <line
        *ngIf="thresholdY !== null"
        [attr.x1]="0"
        [attr.x2]="width"
        [attr.y1]="thresholdY"
        [attr.y2]="thresholdY"
        class="sparkline-threshold"
      />
    </svg>
    <div *ngIf="!points" class="w-full h-full flex items-center justify-center text-muted text-xs">
      —
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 24px;
    }

    .sparkline-threshold {
      stroke: var(--danger);
      stroke-width: 1;
      stroke-dasharray: 4 4;
      opacity: 0.7;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SparklineComponent implements OnChanges {
  @Input() data: HistoryPoint[] = [];
  @Input() width = 100;
  @Input() height = 30;
  @Input() colorClass = 'text-accent';
  @Input() threshold: number | null = null;

  viewBox = `0 0 ${this.width} ${this.height}`;
  points: string = '';
  thresholdY: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['width'] || changes['height'] || changes['threshold']) {
      this.viewBox = `0 0 ${this.width} ${this.height}`;
      this.updatePath();
    }
  }

  private updatePath(): void {
    if (!this.data || this.data.length < 2) {
      this.points = '';
      this.thresholdY = null;
      return;
    }

    const values = this.data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // Avoid divide by zero

    // We render 0 to width, and height to 0 (SVG y is down)
    const stepX = this.width / (this.data.length - 1);

    this.points = this.data
      .map((d, i) => {
        const x = i * stepX;
        const normalized = (d.value - min) / range;
        const y = this.height - normalized * this.height;
        return `${x},${y}`;
      })
      .join(' ');

    if (this.threshold === null || Number.isNaN(this.threshold)) {
      this.thresholdY = null;
      return;
    }

    const thresholdNormalized = (this.threshold - min) / range;
    const clamped = Math.max(0, Math.min(1, thresholdNormalized));
    this.thresholdY = this.height - clamped * this.height;
  }
}
