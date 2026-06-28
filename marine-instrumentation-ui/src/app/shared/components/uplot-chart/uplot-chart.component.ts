import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import uPlot from 'uplot';

export interface UplotSeriesConfig {
  id: string;
  label: string;
  unit: string;
  color: string;
  scale?: string | undefined;
  range?: { min: number; max: number } | undefined;
  limits?: { low?: number | undefined; high?: number | undefined; criticalLow?: number | undefined; criticalHigh?: number | undefined } | undefined;
  precision?: number | undefined;
}

export interface UplotChartConfig {
  series: UplotSeriesConfig[];
  xLabel?: string | undefined;
  height?: number | undefined;
}

interface LimitLine {
  value: number;
  color: string;
  label: string;
  scale: string;
}

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
      min-height: 220px;
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

  private _data: number[][] = [];
  private _config: UplotChartConfig = { series: [] };
  private plot: uPlot | null = null;

  @Input() set data(value: number[][]) {
    this._data = value;
    if (this.plot) {
      this.plot.setData(value as unknown as uPlot.AlignedData);
    }
  }
  get data(): number[][] {
    return this._data;
  }

  @Input() set config(value: UplotChartConfig) {
    this._config = value;
    this.createPlot();
  }
  get config(): UplotChartConfig {
    return this._config;
  }

  ngOnInit(): void {
    this.createPlot();
  }

  ngOnDestroy(): void {
    this.plot?.destroy();
    this.plot = null;
  }

  setData(data: number[][]): void {
    this._data = data;
    this.plot?.setData(data as unknown as uPlot.AlignedData);
  }

  private createPlot(): void {
    if (!this.containerRef?.nativeElement) return;
    const el = this.containerRef.nativeElement;
    const rect = el.getBoundingClientRect();

    this.plot?.destroy();

    const scales: Record<string, { auto?: boolean | undefined; range?: { min: number; max: number } | undefined }> = {};
    const axes: uPlot.Axis[] = [];
    const series: uPlot.Series[] = [{ label: this._config.xLabel ?? 'Time (s)' }];
    const limitLines: LimitLine[] = [];

    // Group series by scale (unit)
    const scaleMap = new Map<string, { config: UplotSeriesConfig; side: number }>();
    const scaleNames: string[] = [];

    for (const s of this._config.series) {
      const scale = s.scale ?? s.unit;
      if (!scaleMap.has(scale)) {
        scaleMap.set(scale, { config: s, side: scaleNames.length % 2 === 0 ? 3 : 1 });
        scaleNames.push(scale);
      }
    }

    for (const scale of scaleNames) {
      const entry = scaleMap.get(scale);
      if (!entry) continue;
      const representative = entry.config;
      scales[scale] = {
        auto: representative.range === undefined,
        range: representative.range ? { min: representative.range.min, max: representative.range.max } : undefined,
      };
      axes.push({
        scale,
        label: scale,
        side: entry.side,
        stroke: '#94a3b8',
        grid: { stroke: '#334155', width: 1 },
        ticks: { stroke: '#334155', width: 1 },
        values: (_u, vals) => vals.map((v) => this.formatValue(v, representative.precision ?? 2)),
      });

      if (representative.limits) {
        const { low, high, criticalLow, criticalHigh } = representative.limits;
        if (low !== undefined) limitLines.push({ value: low, color: '#f59e0b', label: 'Low', scale });
        if (high !== undefined) limitLines.push({ value: high, color: '#f59e0b', label: 'High', scale });
        if (criticalLow !== undefined) limitLines.push({ value: criticalLow, color: '#ef4444', label: 'Critical', scale });
        if (criticalHigh !== undefined) limitLines.push({ value: criticalHigh, color: '#ef4444', label: 'Critical', scale });
      }
    }

    for (const s of this._config.series) {
      const scale = s.scale ?? s.unit;
      series.push({
        label: `${s.label} (${s.unit})`,
        scale,
        stroke: s.color,
        width: 2,
        points: { show: false },
      });
    }

    const plugins: uPlot.Plugin[] | undefined = limitLines.length > 0 ? [this.limitLinesPlugin(limitLines)] : undefined;

    const opts: uPlot.Options = {
      width: Math.max(200, Math.floor(rect.width)),
      height: Math.max(180, this._config.height ?? Math.floor(rect.height)),
      series,
      axes: [
        {
          label: this._config.xLabel ?? 'Time (s)',
          stroke: '#94a3b8',
          grid: { stroke: '#334155', width: 1 },
          ticks: { stroke: '#334155', width: 1 },
          values: (_u, vals) => vals.map((v) => `${(v / 1000).toFixed(1)}s`),
        },
        ...axes,
      ],
      scales: {
        x: { time: false },
        ...scales,
      },
      ...(plugins ? { plugins } : {}),
      cursor: {
        drag: { x: true, y: false },
        sync: { key: 'omi-charts' },
      },
      legend: { show: true, live: true },
    };

    this.plot = new uPlot(opts, this._data as unknown as uPlot.AlignedData, el);
  }

  private limitLinesPlugin(lines: LimitLine[]): uPlot.Plugin {
    return {
      hooks: {
        draw: (u) => {
          const ctx = u.ctx;
          ctx.save();
          for (const line of lines) {
            const y = u.valToPos(line.value, line.scale, true);
            if (y === undefined || y < 0 || y > u.bbox.height) continue;
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(u.bbox.left, y);
            ctx.lineTo(u.bbox.left + u.bbox.width, y);
            ctx.stroke();

            ctx.fillStyle = line.color;
            ctx.font = '10px sans-serif';
            ctx.fillText(line.label, u.bbox.left + 4, y - 2);
          }
          ctx.restore();
        },
      },
    };
  }

  private formatValue(value: number, precision: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(precision);
  }
}
