import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
  NgZone,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { HistoryPoint } from '../../../state/datapoints/datapoint.models';

/**
 * A single signal trace displayed on the oscilloscope.
 */
export interface OscilloscopeTrace {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Trace color (CSS color or hex) */
  color: string;
  /** Signal data points */
  data: HistoryPoint[];
  /** Unit to display */
  unit?: string;
  /** Fixed Y range. If omitted, auto-scale. */
  yRange?: { min: number; max: number };
  /** Vertical position offset (0-1, where 0.5 = center) */
  verticalOffset?: number;
  /** Vertical scale factor (default 1.0) */
  verticalScale?: number;
}

/**
 * Realistic oscilloscope display using HTML5 Canvas.
 *
 * Features:
 * - CRT-like dark background with phosphor glow
 * - Graticule grid with subtle illumination
 * - Signal traces with phosphor glow (multi-layer strokes)
 * - Real-time sweep with persistence tails
 * - Marine instrument bezel styling
 * - Auto-scaling Y axis per trace
 */
@Component({
  selector: 'omi-oscilloscope',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scope-shell" [class.scope--paused]="paused">
      <!-- Bezel top bar -->
      <header class="scope-header">
        <span class="scope-label">{{ label }}</span>
        <span
          class="scope-status"
          [class.scope-status--live]="!paused"
          [class.scope-status--frozen]="paused"
        >
          <span class="scope-status-dot"></span>
          {{ paused ? 'FREEZE' : 'LIVE' }}
        </span>
      </header>

      <!-- Canvas surface -->
      <div class="scope-crt-frame">
        <canvas #canvas class="scope-canvas" [width]="canvasWidth" [height]="canvasHeight"></canvas>

        <!-- Trace legend overlay -->
        @if (showLegend && traces.length > 0) {
          <div class="scope-legend">
            @for (trace of traces; track trace.id) {
              <span class="scope-legend-item">
                <span class="scope-legend-swatch" [style.background]="trace.color"></span>
                <span class="scope-legend-label">{{ trace.label }}</span>
                @if (trace.data.length > 0) {
                  <span class="scope-legend-value">
                    {{ formatValue(lastValue(trace.data)) }}
                    <small>{{ trace.unit }}</small>
                  </span>
                }
              </span>
            }
          </div>
        }
      </div>

      <!-- Bezel bottom bar -->
      <footer class="scope-footer">
        <span class="scope-timebase">{{ timebaseLabel }}</span>
        <span class="scope-divisions">{{ horizontalDivisions }} × {{ vertDivisions }} div</span>
        <span class="scope-samplerate">{{ sampleCount }} pts</span>
      </footer>
    </div>
  `,
  styleUrls: ['./oscilloscope.component.css'],
})
export class OscilloscopeComponent implements OnInit, OnChanges, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Inputs ──
  @Input() traces: OscilloscopeTrace[] = [];
  @Input() label = 'OSCILLOSCOPE';
  @Input() timebase = 30_000; // ms window
  @Input() paused = false;
  @Input() showLegend = true;
  @Input() horizontalDivisions = 10;
  @Input() vertDivisions = 8;
  @Input() glowIntensity = 0.7; // 0-1
  @Input() persistenceFrames = 3; // trailing fade frames

  // ── Canvas dimensions ──
  canvasWidth = 800;
  canvasHeight = 400;

  private animFrame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;

  /** Per-trace: previous frame data for persistence trails */
  private persistenceBuffers: Map<string, HistoryPoint[]> = new Map();
  private frameCounter = 0;

  // ── Derived ──
  get sampleCount(): number {
    return this.traces.reduce((sum, t) => sum + t.data.length, 0);
  }

  get timebaseLabel(): string {
    if (this.timebase >= 1000) {
      return `${(this.timebase / 1000).toFixed(this.timebase % 1000 === 0 ? 0 : 1)} s/div`;
    }
    return `${this.timebase} ms/div`;
  }

  // ── Lifecycle ──

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.observeResize();
    this.zone.runOutsideAngular(() => {
      this.draw();
      this.startAnimationLoop();
    });
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Re-render on next frame — don't draw synchronously to avoid excessive work
  }

  ngOnDestroy(): void {
    if (this.animFrame !== null) cancelAnimationFrame(this.animFrame);
    if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
    this.resizeObserver?.disconnect();
  }

  // ── Public API ──

  /** Force a synchronous redraw (useful for snapshots). */
  redraw(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.draw();
  }

  trackById(_index: number, trace: OscilloscopeTrace): string {
    return trace.id;
  }

  lastValue(data: HistoryPoint[]): number | null {
    if (data.length === 0) return null;
    return data[data.length - 1]!.value;
  }

  formatValue(value: number | null): string {
    if (value === null) return '---';
    if (Math.abs(value) < 0.01) return value.toFixed(4);
    if (Math.abs(value) < 1) return value.toFixed(3);
    if (Math.abs(value) < 100) return value.toFixed(1);
    return value.toFixed(0);
  }

  // ── Rendering ──

  private startAnimationLoop(): void {
    const loop = () => {
      this.frameCounter++;
      if (!this.paused) {
        this.draw();
      }
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const el = this.canvasRef?.nativeElement?.parentElement;
    if (!el) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.resizeToContainer());
    });
    this.resizeObserver.observe(el);
  }

  private resizeToContainer(): void {
    const canvas = this.canvasRef?.nativeElement;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Allow the canvas to shrink below 400×200 so it fills the container naturally
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(120, Math.floor(rect.height));

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      this.canvasWidth = w;
      this.canvasHeight = h;
      this.draw();
    }
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear with CRT background
    this.drawBackground(ctx, w, h);

    // 2. Graticule grid
    this.drawGraticule(ctx, w, h);

    // 3. Traces with phosphor glow
    this.drawTraces(ctx, w, h);

    ctx.restore();

    // Update persistence buffers
    this.updatePersistence();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Deep CRT background — slightly green-tinted dark
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    bgGrad.addColorStop(0, '#0a1a10');
    bgGrad.addColorStop(0.5, '#051008');
    bgGrad.addColorStop(1, '#020804');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle scanline effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    const scanlineH = 2;
    for (let y = 0; y < h; y += scanlineH * 2) {
      ctx.fillRect(0, y, w, scanlineH);
    }
  }

  private drawGraticule(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const marginX = w * 0.08;
    const marginY = h * 0.08;
    const plotW = w - marginX * 2;
    const plotH = h - marginY * 2;

    // Major grid lines
    const cols = this.horizontalDivisions;
    const rows = this.vertDivisions;

    // Draw minor grid (quarter-squares)
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.06)';
    ctx.lineWidth = 0.5;
    const minorCols = cols * 5; // 5 minor ticks per major
    const minorRows = rows * 5;

    ctx.beginPath();
    for (let i = 0; i <= minorCols; i++) {
      const x = marginX + (i / minorCols) * plotW;
      ctx.moveTo(x, marginY);
      ctx.lineTo(x, marginY + plotH);
    }
    for (let i = 0; i <= minorRows; i++) {
      const y = marginY + (i / minorRows) * plotH;
      ctx.moveTo(marginX, y);
      ctx.lineTo(marginX + plotW, y);
    }
    ctx.stroke();

    // Draw major grid with brighter glow
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.18)';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0, 255, 65, 0.25)';
    ctx.shadowBlur = 3;

    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
      const x = marginX + (i / cols) * plotW;
      ctx.moveTo(x, marginY);
      ctx.lineTo(x, marginY + plotH);
    }
    for (let i = 0; i <= rows; i++) {
      const y = marginY + (i / rows) * plotH;
      ctx.moveTo(marginX, y);
      ctx.lineTo(marginX + plotW, y);
    }
    ctx.stroke();

    // Center crosshair — slightly brighter
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0, 255, 65, 0.4)';
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    const cx = marginX + plotW / 2;
    const cy = marginY + plotH / 2;
    ctx.beginPath();
    ctx.moveTo(cx, marginY);
    ctx.lineTo(cx, marginY + plotH);
    ctx.moveTo(marginX, cy);
    ctx.lineTo(marginX + plotW, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Frame border with glow
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 255, 65, 0.4)';
    ctx.shadowBlur = 6;
    ctx.strokeRect(marginX, marginY, plotW, plotH);
    ctx.shadowBlur = 0;
  }

  private drawTraces(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.traces.length === 0) return;

    const marginX = w * 0.08;
    const marginY = h * 0.08;
    const plotW = w - marginX * 2;
    const plotH = h - marginY * 2;

    // Use the data's own time domain, NOT wall-clock Date.now().
    let globalLatest = 0;
    for (const trace of this.traces) {
      for (const pt of trace.data) {
        if (pt.timestamp > globalLatest) globalLatest = pt.timestamp;
      }
    }
    if (globalLatest <= 0) return;

    // Sweep cycle: the trace sweeps LEFT → RIGHT within each cycle,
    // then resets to the left edge. This mimics a real oscilloscope beam.
    const sweepCycle = Math.floor(globalLatest / this.timebase);
    const sweepCycleStart = sweepCycle * this.timebase;
    const prevCycleStart = sweepCycleStart - this.timebase;

    for (const trace of this.traces) {
      if (!trace.data || trace.data.length < 2) continue;

      // Resolve CSS custom properties to actual color values for Canvas API
      const color = this.resolveColor(trace.color);

      // ── Data for current sweep cycle (bright) and previous cycle (persistence) ──
      const currentCycle = trace.data.filter((p) => p.timestamp >= sweepCycleStart);
      const prevCycle = trace.data.filter(
        (p) => p.timestamp >= prevCycleStart && p.timestamp < sweepCycleStart,
      );

      // Use current cycle for Y auto-range; fall back to previous if empty
      const rangeSource =
        currentCycle.length >= 2 ? currentCycle : prevCycle.length >= 2 ? prevCycle : trace.data;

      // Determine Y range
      let yMin: number, yMax: number;
      if (trace.yRange) {
        yMin = trace.yRange.min;
        yMax = trace.yRange.max;
      } else {
        const values = rangeSource.map((p) => p.value);
        yMin = Math.min(...values);
        yMax = Math.max(...values);
        const range = yMax - yMin || 1;
        const padding = range * 0.15;
        yMin -= padding;
        yMax += padding;
        if (yMax - yMin < 0.001) {
          const mid = (yMin + yMax) / 2;
          yMin = mid - 0.5;
          yMax = mid + 0.5;
        }
      }

      const yRange = yMax - yMin || 1;
      const vScale = trace.verticalScale ?? 1;
      const vOffset = trace.verticalOffset ?? 0.5;

      const scaleY = (value: number): number => {
        const normalized = 1 - (value - yMin) / yRange;
        const centered = normalized - vOffset;
        const scaled = centered / vScale;
        return marginY + plotH * 0.5 + scaled * plotH;
      };

      // Scale X: maps simulation time to canvas X within the sweep cycle.
      // The sweep cycle always fills the full chart width, so the trace
      // sweeps from LEFT (start of cycle) to RIGHT (end of cycle).
      const scaleX = (ts: number, cycleStart: number): number => {
        const ratio = (ts - cycleStart) / this.timebase;
        return marginX + ratio * plotW;
      };

      const clampY = (y: number): number =>
        Math.max(marginY - 20, Math.min(marginY + plotH + 20, y));

      // ── PREVIOUS CYCLE: full-width persistence trail (dim) ──
      if (prevCycle.length >= 2) {
        const prevPoints = prevCycle.map((p) => ({
          x: scaleX(p.timestamp, prevCycleStart),
          y: clampY(scaleY(p.value)),
        }));
        this.drawPathLayer(ctx, prevPoints, color, 1, 0.1);
      }

      // ── CURRENT CYCLE: builds LEFT → RIGHT as the sweep advances ──
      if (currentCycle.length >= 2) {
        const points = currentCycle.map((p) => ({
          x: scaleX(p.timestamp, sweepCycleStart),
          y: clampY(scaleY(p.value)),
        }));

        // Phosphor glow layers
        this.drawPathLayer(ctx, points, color, 6, 0.08);
        this.drawPathLayer(ctx, points, color, 3.5, 0.2);
        this.drawPathLayer(ctx, points, color, 2, 0.4);
        this.drawPathLayer(ctx, points, color, 1.2, 0.85);

        // ── GLOW DOT AT LATEST VALUE ──
        const last = points[points.length - 1]!;
        const glowRadius = 6;
        const glowGrad = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, glowRadius);
        glowGrad.addColorStop(0, color);
        glowGrad.addColorStop(0.4, this.hexToRgba(color, 0.6));
        glowGrad.addColorStop(1, this.hexToRgba(color, 0));
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(last.x, last.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bright core dot
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawPathLayer(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    color: string,
    width: number,
    alpha: number,
  ): void {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = this.hexToRgba(color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 2;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);

    // Smooth curve using quadratic bezier for intermediate points
    for (let i = 1; i < points.length - 1; i++) {
      const pi = points[i]!;
      const pn = points[i + 1]!;
      const xc = (pi.x + pn.x) / 2;
      const yc = (pi.y + pn.y) / 2;
      ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
    }
    // Last segment
    if (points.length > 1) {
      const last = points[points.length - 1]!;
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  private updatePersistence(): void {
    if (this.paused) return;
    for (const trace of this.traces) {
      if (trace.data.length > 0) {
        this.persistenceBuffers.set(trace.id, [...trace.data]);
      }
    }
  }

  // ── Utility ──

  /**
   * Resolves a CSS custom property (e.g. `var(--gb-data-good)`) to an actual
   * color value usable by the Canvas 2D API. Returns the resolved value as-is
   * if it is already a plain color string.
   */
  private resolveColor(raw: string): string {
    if (!raw.startsWith('var(')) return raw;

    try {
      const el = this.canvasRef?.nativeElement;
      if (el) {
        const varName = raw.slice(4, -1).trim();
        const resolved = getComputedStyle(el).getPropertyValue(varName).trim();
        if (resolved) return resolved;
      }
    } catch {
      // fall through to fallback
    }
    return '#00ff41'; // fallback phosphor green
  }

  private hexToRgba(hex: string, alpha: number): string {
    // Resolve CSS variables first
    const resolved = this.resolveColor(hex);

    // Parse hex
    const match = resolved.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return `rgba(0, 255, 65, ${alpha})`;

    const r = parseInt(match[1]!, 16);
    const g = parseInt(match[2]!, 16);
    const b = parseInt(match[3]!, 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
