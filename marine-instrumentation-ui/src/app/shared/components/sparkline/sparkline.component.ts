import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { HistoryPoint } from '../../../state/datapoints/datapoint.models';

@Component({
  selector: 'app-shared-sparkline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sparkline.component.html',
  styleUrls: ['./sparkline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent implements OnChanges {
  @Input() data: HistoryPoint[] = [];
  @Input() width = 120;
  @Input() height = 32;
  @Input() stroke = 'var(--gb-needle-secondary)';
  @Input() threshold: number | null = null;

  viewBox = `0 0 ${this.width} ${this.height}`;
  points = '';
  thresholdY: number | null = null;
  hasPoints = false;

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
      this.hasPoints = false;
      return;
    }

    const values = this.data.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = this.width / (this.data.length - 1);

    this.points = this.data
      .map((point, index) => {
        const x = index * stepX;
        const normalized = (point.value - min) / range;
        const y = this.height - normalized * this.height;
        return `${x},${y}`;
      })
      .join(' ');

    this.hasPoints = this.points.length > 0;

    if (this.threshold === null || !Number.isFinite(this.threshold)) {
      this.thresholdY = null;
      return;
    }

    const thresholdNormalized = (this.threshold - min) / range;
    const clamped = Math.max(0, Math.min(1, thresholdNormalized));
    this.thresholdY = this.height - clamped * this.height;
  }
}
