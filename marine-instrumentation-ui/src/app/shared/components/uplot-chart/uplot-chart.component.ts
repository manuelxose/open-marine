import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import uPlot from 'uplot';

export interface UplotSeriesConfig {
  id: string;
  label: string;
  unit: string;
  color: string;
  scale?: string | undefined;
  stepped?: boolean | undefined;
  range?: { min: number; max: number } | undefined;
  limits?:
    | {
        low?: number | undefined;
        high?: number | undefined;
        criticalLow?: number | undefined;
        criticalHigh?: number | undefined;
      }
    | undefined;
  precision?: number | undefined;
}

export interface UplotChartConfig {
  series: UplotSeriesConfig[];
  xLabel?: string | undefined;
  height?: number | undefined;
  mode?: 'chart' | 'scope' | undefined;
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
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .uplot-container {
        width: 100%;
        height: 100%;
        min-height: 220px;
        background: #0b1116;
        position: relative;
        overflow: hidden;
      }
    `,
  ],
})
export class UplotChartComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private _data: number[][] = [];
  private _config: UplotChartConfig = { series: [] };
  private plot: uPlot | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private configSignature = '';

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
    const signature = this.signatureOf(value);
    this._config = value;
    // Only rebuild the plot when the series structure changes. Rebuilding on every data tick would
    // destroy/recreate uPlot continuously, so the trace could never render as a steady oscilloscope.
    if (signature !== this.configSignature) {
      this.configSignature = signature;
      this.createPlot();
    }
  }
  get config(): UplotChartConfig {
    return this._config;
  }

  private signatureOf(config: UplotChartConfig): string {
    return JSON.stringify({
      mode: config.mode,
      xLabel: config.xLabel,
      height: config.height,
      series: config.series.map((s) => [
        s.id,
        s.scale ?? s.unit,
        s.unit,
        s.stepped ?? false,
        s.range?.min,
        s.range?.max,
        s.limits?.low,
        s.limits?.high,
        s.limits?.criticalLow,
        s.limits?.criticalHigh,
        s.precision,
      ]),
    });
  }

  ngOnInit(): void {
    if (!this.plot) this.createPlot();
    this.observeResize();
  }

  ngOnDestroy(): void {
    const resizeFrame = this.resizeFrame;
    const resizeObserver = this.resizeObserver;
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    if (resizeObserver) resizeObserver.disconnect();
    this.resizeObserver = null;
    this.plot?.destroy();
    this.plot = null;
  }

  /**
   * Keeps the plot sized to its container. uPlot fixes its width/height at creation, so without this
   * the chart clips or distorts whenever the panel, tab or window resizes.
   */
  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined' || !this.containerRef?.nativeElement) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.resizeToContainer());
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private resizeToContainer(): void {
    if (!this.plot || !this.containerRef?.nativeElement) return;
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    if (rect.width < 1) return;
    this.plot.setSize({
      width: Math.max(200, Math.floor(rect.width)),
      height: Math.max(180, this._config.height ?? Math.floor(rect.height)),
    });
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

    const scales: Record<
      string,
      { auto?: boolean | undefined; range?: { min: number; max: number } | undefined }
    > = {};
    const axes: uPlot.Axis[] = [];
    const series: uPlot.Series[] = [{ label: this._config.xLabel ?? 'Time (s)' }];
    const limitLines: LimitLine[] = [];
    const axisColor =
      this._config.mode === 'scope'
        ? 'rgba(0, 230, 118, 0.6)'
        : this.cssVar('--gb-text-muted', '#888888');
    const gridColor =
      this._config.mode === 'scope'
        ? 'rgba(0, 230, 118, 0.16)'
        : this.cssVar('--gb-border-panel', '#444444');
    const warnColor = this.cssVar('--gb-data-warn', 'orange');
    const dangerColor = this.cssVar('--gb-data-stale', 'red');

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
        range: representative.range
          ? { min: representative.range.min, max: representative.range.max }
          : undefined,
      };
      axes.push({
        scale,
        label: scale,
        side: entry.side,
        stroke: axisColor,
        grid: { stroke: gridColor, width: 1 },
        ticks: { stroke: gridColor, width: 1 },
        values: (_u, vals) => vals.map((v) => this.formatValue(v, representative.precision ?? 2)),
      });

      if (representative.limits) {
        const { low, high, criticalLow, criticalHigh } = representative.limits;
        if (low !== undefined)
          limitLines.push({ value: low, color: warnColor, label: 'Low', scale });
        if (high !== undefined)
          limitLines.push({ value: high, color: warnColor, label: 'High', scale });
        if (criticalLow !== undefined)
          limitLines.push({ value: criticalLow, color: dangerColor, label: 'Critical', scale });
        if (criticalHigh !== undefined)
          limitLines.push({ value: criticalHigh, color: dangerColor, label: 'Critical', scale });
      }
    }

    for (const s of this._config.series) {
      const scale = s.scale ?? s.unit;
      const resolvedStroke = this.resolveColor(s.color);
      const seriesEntry: uPlot.Series = {
        label: `${s.label} (${s.unit})`,
        scale,
        stroke: resolvedStroke || '#00e676',
        width: this._config.mode === 'scope' ? 2.2 : 2,
        points: { show: false },
      };
      if (this._config.mode === 'scope') {
        seriesEntry.fill = `${resolvedStroke || '#00e676'}22`;
      }
      if (s.stepped && uPlot.paths.stepped) {
        seriesEntry.paths = uPlot.paths.stepped({ align: 1 });
      }
      series.push(seriesEntry);
    }

    const plugins: uPlot.Plugin[] = [];
    // NOTE: scopeGridPlugin removed — overriding drawClear was preventing uPlot
    // from drawing series traces. The CRT look is handled via CSS on .uplot-container.
    if (limitLines.length > 0) {
      plugins.push(this.limitLinesPlugin(limitLines));
    }

    const opts: uPlot.Options = {
      width: Math.max(200, Math.floor(rect.width)),
      height: Math.max(180, this._config.height ?? Math.floor(rect.height)),
      series,
      axes: [
        {
          label: this._config.xLabel ?? 'Time (s)',
          stroke: axisColor,
          grid: { stroke: gridColor, width: 1 },
          ticks: { stroke: gridColor, width: 1 },
          values: (_u, vals) => vals.map((v) => `${(v / 1000).toFixed(1)}s`),
        },
        ...axes,
      ],
      scales: {
        x: { time: false },
        ...scales,
      },
      ...(plugins.length > 0 ? { plugins } : {}),
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

  private resolveColor(color: string): string {
    const match = color.match(/^var\((--[^),]+)(?:,\s*([^)]+))?\)$/);
    if (!match) return color;
    const varName = match[1] ?? '';
    const fallback = match[2]?.trim() || '#00e676';
    // Try container element first, fall back to document.documentElement
    let el: HTMLElement | null = this.containerRef?.nativeElement ?? null;
    if (el) {
      const val = getComputedStyle(el).getPropertyValue(varName).trim();
      if (val) return val;
    }
    // Last resort: query against :root / <html>
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
  }

  private cssVar(name: string, fallback: string): string {
    if (!name) return fallback;
    let el: HTMLElement | null = this.containerRef?.nativeElement ?? null;
    if (el) {
      const val = getComputedStyle(el).getPropertyValue(name).trim();
      if (val) return val;
    }
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  }
}
