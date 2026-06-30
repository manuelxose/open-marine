import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { HistoryPoint } from '../../../state/datapoints/datapoint.models';

/**
 * Sparkline / mini-oscilloscope component.
 *
 * Modes:
 * - `svg` (default): Simple SVG polyline for compact dashboards.
 * - `scope`: HTML5 Canvas with CRT phosphor glow, graticule and trailing dot.
 */
@Component({
  selector: 'app-shared-sparkline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sparkline.component.html',
  styleUrls: ['./sparkline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent implements OnChanges, OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('scopeCanvas', { static: false }) scopeCanvasRef?: ElementRef<HTMLCanvasElement>;

  @Input() data: HistoryPoint[] = [];
  @Input() width = 120;
  @Input() height = 32;
  @Input() stroke = 'var(--gb-needle-secondary)';
  @Input() threshold: number | null = null;
  /** Render mode: 'svg' (simple) or 'scope' (oscilloscope canvas). */
  @Input() mode: 'svg' | 'scope' = 'svg';

  // SVG mode
  viewBox = `0 0 ${this.width} ${this.height}`;
  points = '';
  thresholdY: number | null = null;
  hasPoints = false;

  // Scope mode
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    if (this.mode === 'scope' && isPlatformBrowser(this.platformId)) {
      this.observeScopeResize();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['width'] || changes['height'] || changes['threshold']) {
      if (this.mode === 'scope') {
        this.viewBox = '';
        this.points = '';
        this.drawScope();
      } else {
        this.viewBox = `0 0 ${this.width} ${this.height}`;
        this.updatePath();
      }
    }
    if (changes['mode'] && this.mode === 'scope' && isPlatformBrowser(this.platformId)) {
      this.observeScopeResize();
      setTimeout(() => this.drawScope(), 0);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  // ── SVG path (original logic) ──

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

  // ── Scope Canvas rendering ──

  private observeScopeResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const el = this.scopeCanvasRef?.nativeElement?.parentElement;
    if (!el) return;
    this.resizeObserver = new ResizeObserver(() => this.drawScope());
    this.resizeObserver.observe(el);
  }

  private drawScope(): void {
    const canvas = this.scopeCanvasRef?.nativeElement;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(80, Math.floor(rect.width));
    const h = Math.max(24, Math.floor(rect.height));

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // CRT background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
    bgGrad.addColorStop(0, '#0a1a10');
    bgGrad.addColorStop(1, '#020804');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // Minor graticule
    ctx.strokeStyle = 'rgba(0, 230, 65, 0.04)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += w / 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += h / 12) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (!this.data || this.data.length < 2) {
      ctx.restore();
      return;
    }

    const values = this.data.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = range * 0.15;
    const yMin = min - pad;
    const yMax = max + pad;
    const yRange = yMax - yMin || 1;

    const marginX = 2;
    const marginY = 2;
    const plotW = w - marginX * 2;
    const plotH = h - marginY * 2;
    const stepX = this.data.length > 1 ? plotW / (this.data.length - 1) : plotW;

    const points: { x: number; y: number }[] = this.data.map((pt, i) => {
      const x = marginX + i * stepX;
      const normalized = 1 - (pt.value - yMin) / yRange;
      const y = marginY + normalized * plotH;
      return { x, y };
    });

    const color = this.resolveColor(this.stroke);

    // Phosphor glow layers
    this.drawGlowPath(ctx, points, color, 4, 0.06);
    this.drawGlowPath(ctx, points, color, 2.5, 0.18);
    this.drawGlowPath(ctx, points, color, 1.2, 0.45);
    this.drawGlowPath(ctx, points, color, 0.8, 0.85);

    // Glow dot at latest value
    if (points.length > 0) {
      const last = points[points.length - 1]!;
      const glowGrad = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 4);
      glowGrad.addColorStop(0, color);
      glowGrad.addColorStop(0.5, this.hexToRgba(color, 0.4));
      glowGrad.addColorStop(1, this.hexToRgba(color, 0));
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawGlowPath(
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
    ctx.shadowBlur = width * 1.5;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length - 1; i++) {
      const pi = points[i]!;
      const pn = points[i + 1]!;
      const xc = (pi.x + pn.x) / 2;
      const yc = (pi.y + pn.y) / 2;
      ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
    }
    if (points.length > 1) {
      const last = points[points.length - 1]!;
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Color utilities ──

  private resolveColor(color: string): string {
    if (!color.startsWith('var(')) return color;
    try {
      const el = this.scopeCanvasRef?.nativeElement;
      if (el) {
        const resolved = getComputedStyle(el).getPropertyValue(color.slice(4, -1).trim()).trim();
        if (resolved) return resolved;
      }
    } catch {
      /* ignore */
    }
    return '#4a90d9'; // fallback blue
  }

  private hexToRgba(hex: string, alpha: number): string {
    const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return `rgba(74, 144, 217, ${alpha})`;
    return `rgba(${parseInt(match[1]!, 16)}, ${parseInt(match[2]!, 16)}, ${parseInt(match[3]!, 16)}, ${alpha})`;
  }
}
