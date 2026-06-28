import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  initNeedleState,
  normalizeAngle,
  updateNeedleAngle,
  type NeedleRotationState,
} from '../../../shared/utils/needle-rotation.utils';

/** Autopilot operating mode/state (mirrors `AutopilotState` from the store). */
export type AutopilotWidgetMode =
  | 'standby'
  | 'auto'
  | 'wind'
  | 'route'
  | 'fault';

export type AutopilotDataQuality = 'good' | 'stale' | 'missing';

interface Tick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}
interface Cardinal {
  x: number;
  y: number;
  label: string;
}

const MODE_LABEL: Record<AutopilotWidgetMode, string> = {
  standby: 'STANDBY',
  auto: 'AUTO',
  wind: 'WIND',
  route: 'TRACK',
  fault: 'FAULT',
};

/**
 * Reusable marine autopilot heading dial (Raymarine / B&G glass-bridge style).
 *
 * Pure presentational, input-driven instrument: it owns NO data wiring so it can
 * be dropped on the autopilot page, the dashboard or the instruments page. All
 * angles are supplied in **degrees**. Heading/target rotation use the shared
 * cumulative needle-rotation engine so there is never a 359°→0° jump. Token-only
 * styling; responsive SVG (scales with `size`, no distortion).
 */
@Component({
  selector: 'app-autopilot-compass-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="apw"
      [class.apw--stale]="quality() === 'stale'"
      [class.apw--missing]="quality() === 'missing'"
      [attr.data-mode]="mode()"
    >
      <svg
        class="apw__svg"
        [attr.viewBox]="'0 0 ' + SIZE + ' ' + SIZE"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        <!-- Bezel / face -->
        <circle [attr.cx]="CX" [attr.cy]="CY" [attr.r]="R" class="apw__ring" />
        <circle [attr.cx]="CX" [attr.cy]="CY" [attr.r]="R - 9" class="apw__face" />

        <!-- Ticks -->
        <line
          *ngFor="let t of ticks; trackBy: trackIdx"
          [attr.x1]="t.x1"
          [attr.y1]="t.y1"
          [attr.x2]="t.x2"
          [attr.y2]="t.y2"
          [class.apw__tick--major]="t.major"
          class="apw__tick"
        />

        <!-- Cardinals -->
        <text
          *ngFor="let c of cardinals; trackBy: trackIdx"
          [attr.x]="c.x"
          [attr.y]="c.y"
          class="apw__cardinal"
          [class.apw__cardinal--n]="c.label === 'N'"
          text-anchor="middle"
          dominant-baseline="central"
        >
          {{ c.label }}
        </text>

        <!-- Fixed lubber line (top reference) -->
        <polygon [attr.points]="lubberPoints" class="apw__lubber" />

        <!-- Target heading bug -->
        <g
          *ngIf="showTargetBug()"
          [attr.transform]="'rotate(' + targetVisual() + ' ' + CX + ' ' + CY + ')'"
          class="apw__bug-g"
        >
          <polygon [attr.points]="bugPoints" class="apw__bug" />
        </g>

        <!-- Heading needle -->
        <g
          [attr.transform]="'rotate(' + headingVisual() + ' ' + CX + ' ' + CY + ')'"
          class="apw__needle-g"
        >
          <polygon [attr.points]="needlePoints" class="apw__needle" />
          <polygon [attr.points]="needleTailPoints" class="apw__needle-tail" />
        </g>
        <circle [attr.cx]="CX" [attr.cy]="CY" r="6" class="apw__hub" />

        <!-- Centre readout -->
        <text [attr.x]="CX" [attr.y]="CY - 14" class="apw__value" text-anchor="middle">
          {{ headingLabel() }}
        </text>
        <text [attr.x]="CX" [attr.y]="CY + 4" class="apw__value-unit" text-anchor="middle">
          °{{ unit() }}
        </text>
        <text
          *ngIf="showTargetBug()"
          [attr.x]="CX"
          [attr.y]="CY + 24"
          class="apw__target"
          text-anchor="middle"
        >
          ⊳ {{ targetLabel() }}°
        </text>
      </svg>

      <!-- Mode chip -->
      <div class="apw__mode" [attr.data-mode]="mode()">{{ modeLabel() }}</div>

      <!-- Rudder bar -->
      <div class="apw__rudder" *ngIf="showRudder()">
        <span class="apw__rlabel">P</span>
        <div class="apw__rtrack">
          <div class="apw__rcenter"></div>
          <div
            class="apw__rfill"
            [style.left.%]="rudderFillLeft()"
            [style.width.%]="rudderFillWidth()"
          ></div>
        </div>
        <span class="apw__rlabel">S</span>
        <span class="apw__rval">{{ rudderText() }}°</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .apw {
        display: flex;
        flex-direction: column;
        gap: var(--widget-gap, 8px);
        align-items: center;
        width: 100%;
      }
      .apw__svg {
        width: 100%;
        max-width: 320px;
        height: auto;
        display: block;
      }

      .apw__ring {
        fill: none;
        stroke: var(--instrument-ring);
        stroke-width: 2;
      }
      .apw__face {
        fill: var(--instrument-face);
      }
      .apw__tick {
        stroke: var(--instrument-tick-minor);
        stroke-width: 1;
      }
      .apw__tick--major {
        stroke: var(--instrument-tick-major);
        stroke-width: 2;
      }
      .apw__cardinal {
        fill: var(--instrument-cardinal);
        font-size: 13px;
        font-weight: 800;
        font-family: var(--font-mono, monospace);
      }
      .apw__cardinal--n {
        fill: var(--ap-heading-needle);
      }

      .apw__lubber {
        fill: var(--gb-text-cardinal);
        opacity: 0.85;
      }

      .apw__bug {
        fill: var(--ap-target-bug);
      }
      .apw__bug-g {
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .apw__needle {
        fill: var(--ap-heading-needle);
      }
      .apw__needle-tail {
        fill: var(--ap-needle-tail);
      }
      .apw__needle-g {
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .apw__hub {
        fill: var(--instrument-pin);
        stroke: var(--instrument-pin-border);
        stroke-width: 1.5;
      }

      .apw__value {
        fill: var(--widget-value);
        font-size: 34px;
        font-weight: 800;
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
      }
      .apw__value-unit {
        fill: var(--widget-unit);
        font-size: 11px;
        font-family: var(--font-mono, monospace);
      }
      .apw__target {
        fill: var(--ap-target-text);
        font-size: 14px;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
      }

      /* Data-quality dimming (does not rely on color alone — value blanks too) */
      .apw--stale .apw__needle,
      .apw--stale .apw__value {
        opacity: 0.45;
      }
      .apw--missing .apw__needle,
      .apw--missing .apw__needle-tail {
        opacity: 0.2;
      }

      .apw__mode {
        font-family: var(--font-mono, monospace);
        font-size: 0.66rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        padding: 2px 12px;
        border-radius: var(--radius-full, 999px);
        border: 1px solid var(--ap-mode-standby);
        color: var(--ap-mode-standby);
        text-transform: uppercase;
      }
      .apw__mode[data-mode='auto'] {
        color: var(--ap-mode-auto);
        border-color: var(--ap-mode-auto);
      }
      .apw__mode[data-mode='wind'] {
        color: var(--ap-mode-wind);
        border-color: var(--ap-mode-wind);
      }
      .apw__mode[data-mode='route'] {
        color: var(--ap-mode-route);
        border-color: var(--ap-mode-route);
      }
      .apw__mode[data-mode='fault'] {
        color: var(--ap-mode-fault);
        border-color: var(--ap-mode-fault);
        background: var(--gb-alarm-emergency-bg);
      }

      .apw__rudder {
        display: flex;
        align-items: center;
        gap: var(--space-2, 8px);
        width: 100%;
        max-width: 320px;
      }
      .apw__rlabel {
        font-size: 0.7rem;
        font-weight: 800;
        color: var(--widget-label);
      }
      .apw__rval {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--widget-value);
        min-width: 3.5ch;
        text-align: right;
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
      }
      .apw__rtrack {
        position: relative;
        flex: 1;
        height: 8px;
        background: var(--ap-rudder-track);
        border-radius: var(--radius-full, 999px);
        border: 1px solid var(--widget-border);
      }
      .apw__rcenter {
        position: absolute;
        left: 50%;
        top: -3px;
        width: 2px;
        height: 14px;
        background: var(--widget-label);
        transform: translateX(-50%);
      }
      .apw__rfill {
        position: absolute;
        top: 0;
        height: 8px;
        border-radius: var(--radius-full, 999px);
        background: var(--ap-rudder-fill);
        transition:
          left 0.3s ease,
          width 0.3s ease;
      }
    `,
  ],
})
export class AutopilotCompassWidgetComponent {
  // --- Inputs (all angles in degrees) ---
  readonly headingDeg = input<number | null>(null);
  readonly targetDeg = input<number | null>(null);
  readonly rudderDeg = input<number | null>(null);
  readonly mode = input<AutopilotWidgetMode>('standby');
  readonly quality = input<AutopilotDataQuality>('good');
  readonly unit = input<string>('T');
  readonly showRudder = input<boolean>(true);
  /** Max rudder deflection used to scale the bar (degrees). */
  readonly rudderRange = input<number>(45);

  // --- Geometry (fixed viewBox; SVG scales responsively via CSS) ---
  readonly SIZE = 220;
  readonly CX = this.SIZE / 2;
  readonly CY = this.SIZE / 2;
  readonly R = this.SIZE / 2 - 4;

  readonly ticks: Tick[] = Array.from({ length: 36 }, (_, i) => {
    const deg = i * 10;
    const major = deg % 30 === 0;
    const outer = this.polar(deg, this.R - 3);
    const inner = this.polar(deg, this.R - (major ? 14 : 9));
    return { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, major };
  });
  readonly cardinals: Cardinal[] = [
    { deg: 0, label: 'N' },
    { deg: 90, label: 'E' },
    { deg: 180, label: 'S' },
    { deg: 270, label: 'W' },
  ].map((c) => {
    const p = this.polar(c.deg, this.R - 26);
    return { x: p.x, y: p.y, label: c.label };
  });

  readonly needlePoints = `${this.CX},${this.CY - (this.R - 18)} ${this.CX - 8},${this.CY} ${this.CX + 8},${this.CY}`;
  readonly needleTailPoints = `${this.CX},${this.CY + (this.R - 40)} ${this.CX - 6},${this.CY} ${this.CX + 6},${this.CY}`;
  readonly bugPoints = `${this.CX},${this.CY - (this.R - 12)} ${this.CX - 7},${this.CY - (this.R + 2)} ${this.CX + 7},${this.CY - (this.R + 2)}`;
  readonly lubberPoints = `${this.CX},${this.CY - (this.R + 1)} ${this.CX - 5},${this.CY - (this.R - 8)} ${this.CX + 5},${this.CY - (this.R - 8)}`;

  // --- Smooth cumulative rotation (no 359°→0° jump) ---
  private headingRot: NeedleRotationState = initNeedleState(0);
  private targetRot: NeedleRotationState = initNeedleState(0);
  readonly headingVisual = signal(0);
  readonly targetVisual = signal(0);

  constructor() {
    effect(() => {
      const h = this.headingDeg();
      if (h === null || h === undefined) {
        return;
      }
      this.headingRot = updateNeedleAngle(this.headingRot, h);
      this.headingVisual.set(this.headingRot.visualAngle);
    });
    effect(() => {
      const t = this.targetDeg();
      if (t === null || t === undefined) {
        return;
      }
      this.targetRot = updateNeedleAngle(this.targetRot, t);
      this.targetVisual.set(this.targetRot.visualAngle);
    });
  }

  readonly headingLabel = computed(() => {
    const d = this.headingDeg();
    if (d === null || d === undefined || this.quality() === 'missing') {
      return '---';
    }
    return String(Math.round(normalizeAngle(d)) % 360).padStart(3, '0');
  });
  readonly targetLabel = computed(() => {
    const d = this.targetDeg();
    return d === null || d === undefined
      ? '--'
      : String(Math.round(normalizeAngle(d)) % 360).padStart(3, '0');
  });
  readonly modeLabel = computed(() => MODE_LABEL[this.mode()] ?? this.mode().toUpperCase());

  // Target bug only meaningful in heading-derived modes with a known target.
  readonly showTargetBug = computed(() => {
    const m = this.mode();
    return (m === 'auto' || m === 'route') && this.targetDeg() != null;
  });

  readonly rudderText = computed(() => {
    const d = this.rudderDeg();
    return d === null || d === undefined ? '--' : String(Math.round(d));
  });

  readonly rudderFillLeft = computed(() => {
    const pct = (this.clampRudder(this.rudderDeg() ?? 0) / this.rudderRange()) * 50;
    return 50 + Math.min(0, pct);
  });
  readonly rudderFillWidth = computed(() =>
    Math.abs((this.clampRudder(this.rudderDeg() ?? 0) / this.rudderRange()) * 50),
  );

  readonly ariaLabel = computed(() => {
    const parts = [`Autopilot ${this.modeLabel()}`, `heading ${this.headingLabel()} degrees`];
    if (this.showTargetBug()) {
      parts.push(`target ${this.targetLabel()} degrees`);
    }
    const r = this.rudderDeg();
    if (r !== null && r !== undefined) {
      parts.push(`rudder ${Math.round(r)} degrees`);
    }
    return parts.join(', ');
  });

  trackIdx(index: number): number {
    return index;
  }

  private polar(deg: number, radius: number): { x: number; y: number } {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: this.CX + radius * Math.cos(rad), y: this.CY + radius * Math.sin(rad) };
  }

  private clampRudder(deg: number): number {
    const range = this.rudderRange();
    return Math.max(-range, Math.min(range, deg));
  }
}
