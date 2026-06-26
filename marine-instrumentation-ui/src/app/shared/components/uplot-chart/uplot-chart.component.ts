import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import uPlot from 'uplot';

@Component({
  selector: 'app-uplot-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #container class="uplot-container"></div>`,
  styles: [`
    .uplot-container {
      width: 100%;
      height: 100%;
      min-height: 200px;
    }
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class UplotChartComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @Input() data: number[][] = [];
  @Input() options: uPlot.Options = { width: 600, height: 300, series: [{}] };

  private plot: uPlot | null = null;

  ngOnInit(): void {
    this.createPlot();
  }

  ngOnDestroy(): void {
    this.plot?.destroy();
    this.plot = null;
  }

  ngOnChanges(): void {
    if (this.plot) {
      this.plot.setData(this.data as unknown as uPlot.AlignedData);
    } else {
      this.createPlot();
    }
  }

  private createPlot(): void {
    if (!this.containerRef?.nativeElement) return;
    const el = this.containerRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const opts = {
      ...this.options,
      width: Math.max(200, Math.floor(rect.width)),
      height: Math.max(150, Math.floor(rect.height)),
    };
    this.plot = new uPlot(opts, this.data as unknown as uPlot.AlignedData, el);
  }

  setData(data: number[][]): void {
    this.data = data;
    this.plot?.setData(data as unknown as uPlot.AlignedData);
  }

  setScale(scaleKey: string, min: number, max: number): void {
    this.plot?.setScale(scaleKey, { min, max });
  }

  addSeries(series: uPlot.Series, data?: number[]): void {
    this.plot?.addSeries(series, data as unknown as number);
  }

  delSeries(idx: number): void {
    this.plot?.delSeries(idx);
  }
}
