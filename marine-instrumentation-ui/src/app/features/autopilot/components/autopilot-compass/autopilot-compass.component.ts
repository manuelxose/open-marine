import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';

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

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 4;
const HEADING_PATH = PATHS.navigation?.headingTrue ?? 'navigation.headingTrue';

const polar = (deg: number, radius: number): { x: number; y: number } => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
};

/**
 * Autopilot heading dial (Raymarine / B&G style). North-up compass rose with an
 * orange heading needle, a green target-heading bug, a centre digital readout
 * and a port/starboard rudder bar. Self-contained: reads heading from Signal K
 * and target/rudder from the autopilot facade. Token-only styling.
 */
@Component({
  selector: 'app-autopilot-compass',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="apd">
      <svg class="apd__svg" [attr.viewBox]="'0 0 ' + SIZE + ' ' + SIZE" role="img"
           [attr.aria-label]="'Heading ' + headingLabel() + ' degrees'">
        <!-- Face -->
        <circle [attr.cx]="CX" [attr.cy]="CY" [attr.r]="R" class="apd__ring" />
        <circle [attr.cx]="CX" [attr.cy]="CY" [attr.r]="R - 10" class="apd__face" />

        <!-- Ticks -->
        <line *ngFor="let t of ticks; trackBy: trackIdx"
              [attr.x1]="t.x1" [attr.y1]="t.y1" [attr.x2]="t.x2" [attr.y2]="t.y2"
              [class.apd__tick--major]="t.major" class="apd__tick" />

        <!-- Cardinals -->
        <text *ngFor="let c of cardinals; trackBy: trackIdx"
              [attr.x]="c.x" [attr.y]="c.y" class="apd__cardinal"
              text-anchor="middle" dominant-baseline="central">{{ c.label }}</text>

        <!-- Target heading bug -->
        <g *ngIf="showTargetBug()" [attr.transform]="'rotate(' + (targetDeg() ?? 0) + ' ' + CX + ' ' + CY + ')'">
          <polygon [attr.points]="bugPoints" class="apd__bug" />
        </g>

        <!-- Heading needle -->
        <g [attr.transform]="'rotate(' + headingDeg() + ' ' + CX + ' ' + CY + ')'" class="apd__needle-g">
          <polygon [attr.points]="needlePoints" class="apd__needle" />
          <polygon [attr.points]="needleTailPoints" class="apd__needle-tail" />
        </g>
        <circle [attr.cx]="CX" [attr.cy]="CY" r="6" class="apd__hub" />

        <!-- Centre readout -->
        <text [attr.x]="CX" [attr.y]="CY - 16" class="apd__value" text-anchor="middle">{{ headingLabel() }}</text>
        <text [attr.x]="CX" [attr.y]="CY + 2" class="apd__value-unit" text-anchor="middle">°{{ unit() }}</text>
        <text *ngIf="showTargetBug()" [attr.x]="CX" [attr.y]="CY + 26" class="apd__target" text-anchor="middle">
          ⊳ {{ targetLabel() }}°
        </text>
      </svg>

      <!-- Rudder bar -->
      <div class="apd__rudder">
        <span class="apd__rlabel">P</span>
        <div class="apd__rtrack">
          <div class="apd__rcenter"></div>
          <div class="apd__rfill" [style.left.%]="rudderFillLeft()" [style.width.%]="rudderFillWidth()"></div>
        </div>
        <span class="apd__rlabel">S</span>
        <span class="apd__rval">{{ rudderDeg() !== null ? (rudderDeg() | number:'1.0-0') : '--' }}°</span>
      </div>
    </div>
  `,
  styles: [`
    .apd { display: flex; flex-direction: column; gap: var(--space-3); align-items: center; }
    .apd__svg { width: 100%; max-width: 320px; height: auto; }

    .apd__ring { fill: none; stroke: var(--gb-border-panel); stroke-width: 2; }
    .apd__face { fill: var(--gb-bg-face); }
    .apd__tick { stroke: var(--gb-tick-minor); stroke-width: 1; }
    .apd__tick--major { stroke: var(--gb-tick-major); stroke-width: 2; }
    .apd__cardinal { fill: var(--gb-text-cardinal); font-size: 13px; font-weight: 800; font-family: var(--font-mono, monospace); }

    .apd__bug { fill: var(--gb-data-good); }
    .apd__needle { fill: var(--gb-needle-primary); }
    .apd__needle-tail { fill: var(--gb-text-muted); }
    .apd__needle-g { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    .apd__hub { fill: var(--gb-needle-pin); stroke: var(--gb-needle-pin-border); stroke-width: 1.5; }

    .apd__value { fill: var(--gb-text-value); font-size: 34px; font-weight: 800; font-family: var(--font-mono, monospace); }
    .apd__value-unit { fill: var(--gb-text-unit); font-size: 11px; font-family: var(--font-mono, monospace); }
    .apd__target { fill: var(--gb-data-good); font-size: 14px; font-weight: 700; font-family: var(--font-mono, monospace); }

    .apd__rudder { display: flex; align-items: center; gap: var(--space-2); width: 100%; max-width: 320px; }
    .apd__rlabel { font-size: 0.7rem; font-weight: 800; color: var(--gb-text-muted); }
    .apd__rval { font-size: 0.75rem; font-weight: 700; color: var(--gb-text-value); min-width: 3.5ch; text-align: right; font-family: var(--font-mono, monospace); }
    .apd__rtrack { position: relative; flex: 1; height: 8px; background: var(--gb-bg-glass); border-radius: var(--radius-full); border: 1px solid var(--gb-border-panel); }
    .apd__rcenter { position: absolute; left: 50%; top: -3px; width: 2px; height: 14px; background: var(--gb-text-muted); transform: translateX(-50%); }
    .apd__rfill { position: absolute; top: 0; height: 8px; border-radius: var(--radius-full); background: var(--gb-needle-secondary); transition: all 0.3s; }
  `],
})
export class AutopilotCompassComponent {
  private readonly facade = inject(AutopilotFacadeService);
  private readonly store = inject(DatapointStoreService);

  readonly SIZE = SIZE;
  readonly CX = CX;
  readonly CY = CY;
  readonly R = R;

  // Geometry (static, north-up).
  readonly ticks: Tick[] = Array.from({ length: 36 }, (_, i) => {
    const deg = i * 10;
    const major = deg % 30 === 0;
    const outer = polar(deg, R - 3);
    const inner = polar(deg, R - (major ? 14 : 9));
    return { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, major };
  });
  readonly cardinals: Cardinal[] = [
    { deg: 0, label: 'N' },
    { deg: 90, label: 'E' },
    { deg: 180, label: 'S' },
    { deg: 270, label: 'W' },
  ].map((c) => {
    const p = polar(c.deg, R - 26);
    return { x: p.x, y: p.y, label: c.label };
  });

  // Needle (points up = north at rest, rotated by heading).
  readonly needlePoints = `${CX},${CY - (R - 18)} ${CX - 8},${CY} ${CX + 8},${CY}`;
  readonly needleTailPoints = `${CX},${CY + (R - 40)} ${CX - 6},${CY} ${CX + 6},${CY}`;
  // Target bug: a downward triangle sitting on the rim at the top (rotated to target).
  readonly bugPoints = `${CX},${CY - (R - 12)} ${CX - 7},${CY - (R + 2)} ${CX + 7},${CY - (R + 2)}`;

  private readonly state = toSignal(this.facade.state$, { initialValue: 'standby' });
  private readonly headingRad = toSignal(
    this.store.observe<number>(HEADING_PATH).pipe(map((dp) => dp?.value)),
    { initialValue: undefined },
  );
  private readonly targetRad = toSignal(this.facade.targetHeadingTrue$, { initialValue: undefined });
  private readonly rudderRad = toSignal(this.facade.rudderAngle$, { initialValue: undefined });

  readonly headingDeg = computed(() => this.toDeg(this.headingRad()) ?? 0);
  readonly headingLabel = computed(() => {
    const d = this.toDeg(this.headingRad());
    return d === undefined ? '---' : String(Math.round(d) % 360).padStart(3, '0');
  });
  readonly targetDeg = computed(() => this.toDeg(this.targetRad()));
  readonly targetLabel = computed(() => {
    const d = this.targetDeg();
    return d === undefined ? '--' : String(Math.round(d) % 360).padStart(3, '0');
  });
  readonly unit = computed(() => 'T');

  // Show the green target bug only in heading-derived modes with a known target.
  readonly showTargetBug = computed(() => {
    const s = this.state();
    return (s === 'auto' || s === 'route') && this.targetDeg() !== undefined;
  });

  readonly rudderDeg = computed(() => {
    const d = this.rudderRad();
    return d === undefined ? null : (d * 180) / Math.PI;
  });

  private readonly RUDDER_RANGE = 45;
  readonly rudderFillLeft = computed(() => {
    const pct = (this.clampRudder(this.rudderDeg() ?? 0) / this.RUDDER_RANGE) * 50;
    return 50 + Math.min(0, pct);
  });
  readonly rudderFillWidth = computed(() => Math.abs((this.clampRudder(this.rudderDeg() ?? 0) / this.RUDDER_RANGE) * 50));

  trackIdx(index: number): number {
    return index;
  }

  private toDeg(rad: number | undefined): number | undefined {
    if (rad === undefined) {
      return undefined;
    }
    let deg = (rad * 180) / Math.PI;
    deg %= 360;
    if (deg < 0) {
      deg += 360;
    }
    return deg;
  }

  private clampRudder(deg: number): number {
    return Math.max(-this.RUDDER_RANGE, Math.min(this.RUDDER_RANGE, deg));
  }
}
